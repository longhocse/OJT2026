import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isValidUuid } from "../booking/bookingContract";
import { bookingService } from "../services/bookingService";
import useAbsoluteCountdown from "./useAbsoluteCountdown";

export const LOCK_REPLACE_DEBOUNCE_MS = 400;

export const SEAT_LOCK_STATUS = Object.freeze({
  IDLE: "idle",
  LOCKING: "locking",
  LOCKED: "locked",
  UNLOCKING: "unlocking",
  EXPIRED: "expired",
});

const sameSeatSet = (left = [], right = []) =>
  left.length === right.length && left.every((seatId, index) => seatId === right[index]);

const normalizeSeatIds = (seatIds) =>
  [...new Set(seatIds.map((seatId) => String(seatId).toLowerCase()))].sort();

const canUnlock = (lock) =>
  Boolean(
    lock &&
      isValidUuid(lock.showId) &&
      isValidUuid(lock.lockToken) &&
      Array.isArray(lock.seatIds) &&
      lock.seatIds.length > 0,
  );

export default function useSeatLock({ showId, seatIds, onConflict, onExpired, onError }) {
  const normalizedSeatIds = useMemo(() => normalizeSeatIds(seatIds), [seatIds]);
  const seatKey = normalizedSeatIds.join(",");
  const [machine, setMachine] = useState({ status: SEAT_LOCK_STATUS.IDLE, lock: null });
  const mountedRef = useRef(true);
  const transferredRef = useRef(false);
  const activeLockRef = useRef(null);
  const operationVersionRef = useRef(0);
  const operationQueueRef = useRef(Promise.resolve());
  const debounceRef = useRef(null);
  const desiredSeatIdsRef = useRef(normalizedSeatIds);
  const callbacksRef = useRef({ onConflict, onExpired, onError });

  desiredSeatIdsRef.current = normalizedSeatIds;
  callbacksRef.current = { onConflict, onExpired, onError };

  const safeSetMachine = useCallback((nextMachine) => {
    if (mountedRef.current) setMachine(nextMachine);
  }, []);

  const unlock = useCallback(async (lock) => {
    if (!canUnlock(lock)) return;
    await bookingService.unlockSeats({
      showId: lock.showId,
      seatIds: lock.seatIds,
      lockToken: lock.lockToken,
    });
  }, []);

  const replaceLock = useCallback(
    async (targetSeatIds, operationVersion) => {
      const previousLock = activeLockRef.current;
      if (previousLock) {
        safeSetMachine({ status: SEAT_LOCK_STATUS.UNLOCKING, lock: previousLock });
        try {
          await unlock(previousLock);
        } catch {
          // The lock may already be expired. Local ownership is cleared either way.
        } finally {
          if (activeLockRef.current?.lockToken === previousLock.lockToken) {
            activeLockRef.current = null;
          }
        }
      }

      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      if (targetSeatIds.length === 0) {
        safeSetMachine({ status: SEAT_LOCK_STATUS.IDLE, lock: null });
        return;
      }

      safeSetMachine({ status: SEAT_LOCK_STATUS.LOCKING, lock: null });
      try {
        const response = await bookingService.lockSeats({
          showId,
          seatIds: targetSeatIds,
          duration: 600,
        });
        const lock = {
          showId,
          seatIds: targetSeatIds,
          lockToken: response?.lockToken,
          lockedUntil: response?.lockedUntil,
          expiresIn: response?.expiresIn,
        };

        if (!canUnlock(lock) || new Date(lock.lockedUntil).getTime() <= Date.now()) {
          throw new Error("Phản hồi giữ ghế không hợp lệ.");
        }

        if (!mountedRef.current || operationVersion !== operationVersionRef.current) {
          try {
            await unlock(lock);
          } catch {
            // Best effort cleanup for a superseded request.
          }
          return;
        }

        activeLockRef.current = lock;
        safeSetMachine({ status: SEAT_LOCK_STATUS.LOCKED, lock });
      } catch (error) {
        if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
        activeLockRef.current = null;
        safeSetMachine({ status: SEAT_LOCK_STATUS.IDLE, lock: null });
        if (error?.response?.status === 409) {
          callbacksRef.current.onConflict?.(error, targetSeatIds);
        } else {
          callbacksRef.current.onError?.(error);
        }
      }
    },
    [safeSetMachine, showId, unlock],
  );

  const enqueueReplacement = useCallback(
    (targetSeatIds, version) => {
      operationQueueRef.current = operationQueueRef.current
        .catch(() => undefined)
        .then(() => replaceLock(targetSeatIds, version));
      return operationQueueRef.current;
    },
    [replaceLock],
  );

  useEffect(() => {
    transferredRef.current = false;
    const version = ++operationVersionRef.current;
    const targetSeatIds = desiredSeatIdsRef.current;
    clearTimeout(debounceRef.current);

    if (targetSeatIds.length === 0) {
      enqueueReplacement([], version);
      return undefined;
    }

    debounceRef.current = setTimeout(
      () => enqueueReplacement(targetSeatIds, version),
      LOCK_REPLACE_DEBOUNCE_MS,
    );
    return () => clearTimeout(debounceRef.current);
  }, [enqueueReplacement, seatKey]); // seatKey intentionally represents the normalized set.

  const expireLock = useCallback(() => {
    const activeLock = activeLockRef.current;
    if (!activeLock) return;
    operationVersionRef.current += 1;
    clearTimeout(debounceRef.current);
    activeLockRef.current = null;
    safeSetMachine({ status: SEAT_LOCK_STATUS.EXPIRED, lock: null });
    callbacksRef.current.onExpired?.(activeLock);
  }, [safeSetMachine]);

  const remainingMs = useAbsoluteCountdown(machine.lock?.lockedUntil, expireLock);

  const markTransferred = useCallback(() => {
    if (activeLockRef.current) transferredRef.current = true;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationVersionRef.current += 1;
      clearTimeout(debounceRef.current);
      const lock = activeLockRef.current;
      activeLockRef.current = null;
      if (lock && !transferredRef.current) unlock(lock).catch(() => undefined);
    };
  }, [unlock]);

  const selectionIsLocked =
    machine.status === SEAT_LOCK_STATUS.LOCKED &&
    sameSeatSet(machine.lock?.seatIds, normalizedSeatIds);

  return {
    status: machine.status,
    lock: machine.lock,
    remainingMs,
    selectionIsLocked,
    markTransferred,
  };
}

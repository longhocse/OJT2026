import { useEffect, useRef, useState } from "react";

export const getRemainingMilliseconds = (lockedUntil, now = Date.now()) => {
  const deadline = new Date(lockedUntil).getTime();
  return Number.isFinite(deadline) ? Math.max(0, deadline - now) : 0;
};

export const formatCountdown = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function useAbsoluteCountdown(lockedUntil, onExpire) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMilliseconds(lockedUntil));
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);

  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;

    const tick = () => {
      const remaining = getRemainingMilliseconds(lockedUntil);
      setRemainingMs(remaining);
      if (remaining === 0 && lockedUntil && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick();
    if (!lockedUntil || expiredRef.current) return undefined;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  return remainingMs;
}

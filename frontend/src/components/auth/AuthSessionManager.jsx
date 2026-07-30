import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  sessionVerificationFailed,
  sessionVerified,
  setCredentials,
  startSessionVerification,
} from "../../redux/slices/authSlice";
import { authService } from "../../services/authService";
import { setUnauthorizedHandler } from "../../services/api";

const currentDestination = (location) => `${location.pathname}${location.search}${location.hash}`;

export default function AuthSessionManager() {
  const { token, verificationStatus } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const verificationStarted = useRef(false);
  const verificationStatusRef = useRef(verificationStatus);
  const tokenRef = useRef(token);
  const locationRef = useRef(location);

  tokenRef.current = token;

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    verificationStatusRef.current = verificationStatus;
  }, [verificationStatus]);

  useEffect(
    () =>
      setUnauthorizedHandler(() => {
        const activeLocation = locationRef.current;
        if (activeLocation.pathname === "/login") return;

        navigate("/login", {
          replace: true,
          state: { from: currentDestination(activeLocation) },
        });
      }),
    [navigate],
  );

  useEffect(() => {
    if (!token) {
      verificationStarted.current = false;
      return;
    }
    if (verificationStatusRef.current !== "idle" || verificationStarted.current) return;

    verificationStarted.current = true;
    const tokenBeingVerified = token;
    dispatch(startSessionVerification());

    authService
      .getMe()
      .then((user) => {
        if (tokenRef.current === tokenBeingVerified) dispatch(sessionVerified(user));
      })
      .catch((error) => {
        if (tokenRef.current !== tokenBeingVerified) return;
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          authService
            .refresh()
            .then((session) => {
              if (tokenRef.current === tokenBeingVerified) dispatch(setCredentials(session));
            })
            .catch(() => dispatch(sessionVerificationFailed()));
          return;
        }
        dispatch(sessionVerificationFailed());
      });
  }, [dispatch, token]);

  return null;
}

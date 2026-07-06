import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { sessionVerified, startSessionVerification } from "../../redux/slices/authSlice";
import { authService } from "../../services/authService";
import { setUnauthorizedHandler } from "../../services/api";
import { clearClientSession } from "../../services/authSession";

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
      .catch(() => {
        if (tokenRef.current === tokenBeingVerified) void clearClientSession();
      });
  }, [dispatch, token]);

  return null;
}

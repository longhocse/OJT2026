import React, { useEffect, useRef, useState } from "react";

const SCRIPT_ID = "google-identity-services";
// This is a public OAuth identifier, not a secret. Keep a committed default so a fresh clone works.
const DEFAULT_GOOGLE_CLIENT_ID =
  "917795743488-0q3bc60rg3pg9kn337j2p3g1rhda56fr.apps.googleusercontent.com";

const loadGoogleIdentity = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [loadError, setLoadError] = useState(false);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID;

  callbackRef.current = onCredential;

  useEffect(() => {
    if (!clientId || !containerRef.current) return undefined;
    let cancelled = false;

    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => credential && callbackRef.current?.(credential),
          ux_mode: "popup",
        });
        containerRef.current.replaceChildren();
        google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.min(containerRef.current.clientWidth || 400, 400),
          locale: "vi",
        });
      })
      .catch(() => !cancelled && setLoadError(true));

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return <p className="text-center text-xs text-amber-700">Google Login chưa được cấu hình.</p>;
  }
  if (loadError) {
    return <p className="text-center text-sm text-[#DC2626]">Không thể tải đăng nhập Google.</p>;
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : ""} aria-disabled={disabled}>
      <div ref={containerRef} className="flex min-h-11 w-full justify-center" />
    </div>
  );
}

import React from "react";
import { getSafeResourceUrl } from "../../utils/security";

const DEFAULT_FALLBACK = "/placeholder.svg";

const SafeImage = ({
  src,
  fallback = DEFAULT_FALLBACK,
  onError,
  alt = "",
  loading = "lazy",
  decoding = "async",
  width = 300,
  height = 450,
  ...props
}) => {
  const safeFallback = getSafeResourceUrl(fallback, DEFAULT_FALLBACK);
  const safeSrc = getSafeResourceUrl(src, safeFallback);

  const handleError = (event) => {
    if (event.currentTarget.src !== new URL(safeFallback, window.location.origin).href) {
      event.currentTarget.src = safeFallback;
    }
    onError?.(event);
  };

  return (
    <img
      src={safeSrc}
      onError={handleError}
      alt={alt}
      loading={loading}
      decoding={decoding}
      width={width}
      height={height}
      {...props}
    />
  );
};

export default SafeImage;

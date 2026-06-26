const SENSITIVE_KEYS =
  /^(authorization|cookie|password|password_hash|token|access_token|refresh_token|email|phone|name|user)$/i;

export const redactSensitive = (value, seen = new WeakSet()) => {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, seen));
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  return Object.entries(value).reduce((safe, [key, nestedValue]) => {
    safe[key] = SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactSensitive(nestedValue, seen);
    return safe;
  }, {});
};

export const getSafeResourceUrl = (value, fallback = null) => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const candidate = value.trim();
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
};

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const getYouTubeVideoId = (url) => {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return YOUTUBE_VIDEO_ID.test(id) ? id : null;
  }

  if (
    !["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(
      hostname,
    )
  ) {
    return null;
  }

  const watchId = url.searchParams.get("v");
  if (YOUTUBE_VIDEO_ID.test(watchId)) return watchId;

  const [section, id] = url.pathname.split("/").filter(Boolean);
  if (["embed", "shorts", "live"].includes(section) && YOUTUBE_VIDEO_ID.test(id)) return id;

  return null;
};

export const getSafeYouTubeEmbedUrl = (value, fallback = null) => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return fallback;
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : fallback;
  } catch {
    return fallback;
  }
};

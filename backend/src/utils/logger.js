const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api[-_]?key|credential/i;

const redact = (value, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(process.env.NODE_ENV === "development" && { stack: value.stack }),
    };
  }
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(item, seen),
    ]),
  );
};

const write = (level, event, details = {}) => {
  const entry = redact({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  });
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else console.log(output);
};

module.exports = {
  info: (event, details) => write("info", event, details),
  error: (event, details) => write("error", event, details),
  redact,
};

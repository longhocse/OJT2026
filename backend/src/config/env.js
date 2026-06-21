const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(1433),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string().min(12),
    DB_DATABASE: z.string().min(1),
    DB_INSTANCE: z.string().min(1).optional(),
    DB_ENCRYPT: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    DB_TRUST_SERVER_CERTIFICATE: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
    JWT_EXPIRES_IN: z.string().default("1h"),
    JWT_REFRESH_EXPIRES_IN: z.string().optional(),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    CORS_ORIGINS: z.string().optional(),
  })
  .superRefine((data, context) => {
    const origins = (data.CORS_ORIGINS || data.CORS_ORIGIN)
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (origins.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["CORS_ORIGINS"],
        message: "At least one origin is required",
      });
    }
    if (data.NODE_ENV === "production" && origins.includes("*")) {
      context.addIssue({
        code: "custom",
        path: ["CORS_ORIGINS"],
        message: "Wildcard is forbidden in production",
      });
    }
    for (const origin of origins.filter((value) => value !== "*")) {
      if (!URL.canParse(origin)) {
        context.addIssue({
          code: "custom",
          path: ["CORS_ORIGINS"],
          message: `Invalid origin: ${origin}`,
        });
      }
    }
  });

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment configuration: ${fields}`);
}

const corsAllowedOrigins = (result.data.CORS_ORIGINS || result.data.CORS_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  env: Object.freeze({ ...result.data, CORS_ALLOWED_ORIGINS: Object.freeze(corsAllowedOrigins) }),
  envSchema,
};

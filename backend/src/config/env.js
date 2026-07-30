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
    DB_PASSWORD: z.string().min(1),
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
    JWT_REFRESH_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/)
      .default("7d"),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
    EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    SMTP_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(1).optional(),
    SHOW_CLEANING_BUFFER_MINUTES: z.coerce.number().int().min(0).max(180).default(15),
    PAYMENT_PROVIDER_MODE: z.enum(["mock", "payos"]).default("mock"),
    PAYMENT_WEBHOOK_SECRET: z.string().min(32),
    PAYOS_CLIENT_ID: z.string().min(1).optional(),
    PAYOS_API_KEY: z.string().min(1).optional(),
    PAYOS_CHECKSUM_KEY: z.string().min(32).optional(),
    PAYOS_API_BASE_URL: z.string().url().default("https://api-merchant.payos.vn"),
    API_PUBLIC_URL: z.string().url().optional(),
    PAYOS_RETURN_URL: z.string().url().optional(),
    PAYOS_CANCEL_URL: z.string().url().optional(),
    PAYOS_WEBHOOK_URL: z.string().url().optional(),
    TICKET_QR_SECRET: z.string().min(32),
    PAYMENT_PENDING_TTL_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
    CASH_PAYMENT_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
    BOOKING_EXPIRY_INTERVAL_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
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
    const mailFields = [data.SMTP_HOST, data.SMTP_PORT, data.SMTP_USER, data.SMTP_PASS];
    if (mailFields.some(Boolean) && mailFields.some((value) => value === undefined)) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS must be provided together",
      });
    }
    if (data.PAYMENT_PROVIDER_MODE === "payos") {
      for (const field of ["PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY"]) {
        if (!data[field]) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required when PAYMENT_PROVIDER_MODE=payos`,
          });
        }
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

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().default("pfa_token"),
  CSRF_COOKIE_NAME: z.string().default("pfa_csrf"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  APP_BASE_URL: z.string().default("http://localhost:4000"),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().default(60),
  DEFAULT_TIMEZONE: z.string().default("Asia/Bangkok"),
  TRUST_PROXY: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): Env {
  if (cached && process.env.NODE_ENV !== "test") return cached;
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache() {
  cached = null;
}

export function isProduction() {
  return loadEnv().NODE_ENV === "production";
}

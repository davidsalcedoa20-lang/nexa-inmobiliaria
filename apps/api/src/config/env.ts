import { z } from "zod";

const EnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  ADMIN_ORIGIN: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(3),
  R2_ENDPOINT: z.string().url(),
  R2_REGION: z.string().default("auto"),
});

export function readEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = EnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new Error(`Configuración de API inválida: ${z.prettifyError(parsed.error)}`);
  }

  return {
    ...parsed.data,
    adminOrigins: parsed.data.ADMIN_ORIGIN.split(",").map((origin) => origin.trim()),
  };
}

export type ApiEnvironment = ReturnType<typeof readEnvironment>;

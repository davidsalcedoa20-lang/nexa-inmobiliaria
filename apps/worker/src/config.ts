import { z } from "zod";

const WorkerEnvironmentSchema = z.object({
  WORKER_API_URL: z.string().url(),
  WORKER_TOKEN: z.string().min(32),
  WORKER_ID: z.string().trim().min(3).max(100).default("nexa-local-gpu-01"),
  WORKER_POLL_SECONDS: z.coerce.number().int().min(5).max(300).default(15),
  RECONSTRUCTION_WORK_ROOT: z.string().min(3),
  COLMAP_PATH: z.string().min(3),
  BLENDER_PATH: z.string().min(3),
  RECONSTRUCTION_QUALITY: z.enum(["low", "medium"]).default("medium"),
  R2_ENDPOINT: z.string().url(),
  R2_REGION: z.string().default("auto"),
  R2_BUCKET_NAME: z.string().min(3),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
});

export function readWorkerEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = WorkerEnvironmentSchema.safeParse(environment);
  if (!parsed.success) throw new Error(`Configuración del procesador inválida: ${z.prettifyError(parsed.error)}`);
  return { ...parsed.data, apiUrl: parsed.data.WORKER_API_URL.replace(/\/$/, "") };
}

export type WorkerEnvironment = ReturnType<typeof readWorkerEnvironment>;

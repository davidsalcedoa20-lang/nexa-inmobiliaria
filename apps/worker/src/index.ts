import type { ReconstructionProgressStage } from "@nexa/contracts";
import { ReconstructionApiClient } from "./api-client.js";
import { readWorkerEnvironment } from "./config.js";
import { LocalColmapThreeDReconstructionProvider } from "./provider.js";
import { R2ObjectStorageProvider } from "./storage.js";

const environment = readWorkerEnvironment();
const runOnce = process.argv.includes("--once");
const api = new ReconstructionApiClient(
  environment.apiUrl,
  environment.WORKER_TOKEN,
  environment.WORKER_ID,
);
const storage = new R2ObjectStorageProvider(environment.R2_BUCKET_NAME, {
  endpoint: environment.R2_ENDPOINT,
  region: environment.R2_REGION,
  accessKeyId: environment.R2_ACCESS_KEY_ID,
  secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
});
const provider = new LocalColmapThreeDReconstructionProvider({
  workRoot: environment.RECONSTRUCTION_WORK_ROOT,
  colmapPath: environment.COLMAP_PATH,
  blenderPath: environment.BLENDER_PATH,
  quality: environment.RECONSTRUCTION_QUALITY,
  storage,
});

let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

console.log(`Procesador ${environment.WORKER_ID} listo (${provider.name}).`);

try {
  do {
    let assignment;
    try {
      assignment = await api.claim();
    } catch (error) {
      console.error(`No fue posible consultar la cola: ${message(error)}`);
      if (runOnce) throw error;
      await delay(environment.WORKER_POLL_SECONDS * 1000);
      continue;
    }

    if (!assignment) {
      if (runOnce) break;
      await delay(environment.WORKER_POLL_SECONDS * 1000);
      continue;
    }

    console.log(`Procesando trabajo ${assignment.jobId} con ${assignment.rooms.reduce((sum, room) => sum + room.photos.length, 0)} fotos.`);
    let current = { progressPercent: 1, progressStage: "downloading" as ReconstructionProgressStage };
    const heartbeat = setInterval(() => {
      void api.progress(assignment.jobId, current.progressPercent, current.progressStage).catch((error) => {
        console.error(`No fue posible renovar el trabajo: ${message(error)}`);
      });
    }, 45_000);

    try {
      const result = await provider.reconstruct(assignment, async (progress) => {
        current = progress;
        await api.progress(assignment.jobId, progress.progressPercent, progress.progressStage);
        console.log(`${progress.progressPercent}% — ${progress.progressStage}`);
      });
      await api.complete(assignment.jobId, result);
      console.log(`Trabajo ${assignment.jobId} listo para revisión.`);
    } catch (error) {
      const detail = message(error);
      console.error(`Trabajo ${assignment.jobId} falló: ${detail}`);
      await api.fail(assignment.jobId, detail).catch((reportError) => {
        console.error(`No fue posible reportar el fallo: ${message(reportError)}`);
      });
    } finally {
      clearInterval(heartbeat);
    }
  } while (!stopping && !runOnce);
} finally {
  storage.close();
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido";
}

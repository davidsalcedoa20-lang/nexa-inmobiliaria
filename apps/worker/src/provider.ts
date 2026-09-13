import type {
  ReconstructionProgressStage,
  WorkerReconstructionAssignment,
} from "@nexa/contracts";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ObjectStorageProvider } from "./storage.js";

export type ReconstructionProgress = {
  progressPercent: number;
  progressStage: ReconstructionProgressStage;
};

export type ThreeDReconstructionResult = {
  modelObjectKey: string;
  modelByteSize: number;
  previewObjectKey: string;
};

export interface ThreeDReconstructionProvider {
  readonly name: string;
  reconstruct(
    assignment: WorkerReconstructionAssignment,
    report: (progress: ReconstructionProgress) => Promise<void>,
  ): Promise<ThreeDReconstructionResult>;
}

type LocalProviderOptions = {
  workRoot: string;
  colmapPath: string;
  blenderPath: string;
  quality: "low" | "medium";
  storage: ObjectStorageProvider;
};

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export class LocalColmapThreeDReconstructionProvider implements ThreeDReconstructionProvider {
  readonly name = "local-colmap";

  constructor(private readonly options: LocalProviderOptions) {}

  async reconstruct(
    assignment: WorkerReconstructionAssignment,
    report: (progress: ReconstructionProgress) => Promise<void>,
  ) {
    const attemptName = `attempt-${assignment.attemptCount}-${Date.now()}`;
    const root = join(resolve(this.options.workRoot), assignment.jobId, attemptName);
    const images = join(root, "images");
    const colmap = join(root, "colmap");
    const textured = join(root, "textured");
    const preview = join(root, "preview");
    await Promise.all([mkdir(images, { recursive: true }), mkdir(join(colmap, "logs"), { recursive: true })]);

    await report({ progressPercent: 5, progressStage: "downloading" });
    const photos = assignment.rooms.flatMap((room) => room.photos.map((photo) => ({ room, photo })));
    for (let index = 0; index < photos.length; index += 1) {
      const current = photos[index]!;
      const extension = imageExtension(current.photo.contentType);
      const filename = `${String(index + 1).padStart(4, "0")}-${current.room.id}-${current.photo.id}${extension}`;
      await this.options.storage.download(current.photo.objectKey, join(images, filename));
      const percent = 5 + Math.floor(((index + 1) / photos.length) * 10);
      await report({ progressPercent: percent, progressStage: "downloading" });
    }

    await report({ progressPercent: 20, progressStage: "reconstructing" });
    await runCommand(this.options.colmapPath, [
      "automatic_reconstructor",
      "--workspace_path", colmap,
      "--image_path", images,
      "--data_type", "individual",
      "--quality", this.options.quality,
      "--camera_model", "SIMPLE_RADIAL",
      "--single_camera", "1",
      "--use_gpu", "1",
      "--gpu_index", "0",
      "--num_threads", "4",
      "--log_path", join(colmap, "logs"),
    ]);

    const poissonMesh = join(colmap, "dense", "0", "meshed-poisson.ply");
    await report({ progressPercent: 78, progressStage: "texturing" });
    await runCommand(this.options.colmapPath, [
      "mesh_texturer",
      "--workspace_path", join(colmap, "dense", "0"),
      "--input_path", poissonMesh,
      "--output_path", textured,
      "--MeshTextureMapping.texture_scale_factor", "0.5",
      "--MeshTextureMapping.num_threads", "4",
    ]);

    await report({ progressPercent: 87, progressStage: "optimizing" });
    const obj = join(textured, "mesh.obj");
    await runCommand(process.execPath, [
      join(repositoryRoot, "scripts", "colmap-textured-ply-to-obj.mjs"),
      join(textured, "mesh.ply"),
      obj,
    ]);
    await runCommand(this.options.blenderPath, [
      "--background",
      "--factory-startup",
      "--python", join(repositoryRoot, "scripts", "prepare-reconstruction-preview.py"),
      "--",
      "--mesh", obj,
      "--texture", join(textured, "texture.png"),
      "--output-dir", preview,
      "--target-faces", "150000",
    ]);

    await report({ progressPercent: 95, progressStage: "uploading" });
    const outputPrefix = `properties/${assignment.propertyId}/reconstruction/${assignment.jobId}`;
    const modelObjectKey = `${outputPrefix}/reconstruction.glb`;
    const previewObjectKey = `${outputPrefix}/preview.png`;
    const modelByteSize = await this.options.storage.upload(
      modelObjectKey,
      join(preview, "reconstruction.glb"),
      "model/gltf-binary",
    );
    await this.options.storage.upload(previewObjectKey, join(preview, "preview-2.png"), "image/png");
    return { modelObjectKey, modelByteSize, previewObjectKey };
  }
}

function imageExtension(contentType: string) {
  const extension = ({
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  } as Record<string, string>)[contentType];
  if (!extension) {
    throw new Error(`El procesador local todavía no admite fotografías ${contentType}. Usa JPG, PNG o WebP.`);
  }
  return extension;
}

async function runCommand(executable: string, args: string[]) {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(executable, args, { cwd: repositoryRoot, windowsHide: true });
    let tail = "";
    const collect = (chunk: Buffer) => {
      tail = `${tail}${chunk.toString("utf8")}`.slice(-16_000);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`El proceso ${executable} terminó con código ${code ?? "desconocido"}. ${tail}`));
    });
  });
}

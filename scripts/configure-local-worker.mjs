import { randomBytes } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const environmentPath = resolve(".env");
const current = await readFile(environmentPath, "utf8");
const values = new Map(
  current
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const workerToken = values.get("WORKER_TOKEN") || randomBytes(48).toString("base64url");
const workerSettings = {
  WORKER_TOKEN: workerToken,
  WORKER_API_URL: "https://nexa-inmobiliaria-api.vercel.app",
  WORKER_ID: "nexa-local-gpu-01",
  WORKER_POLL_SECONDS: "15",
  RECONSTRUCTION_WORK_ROOT: "D:\\Nexa-3D-Work",
  COLMAP_PATH: "D:\\Nexa-3D-Tools\\COLMAP-4.2.0-CUDA\\bin\\colmap.exe",
  BLENDER_PATH: "D:\\Nexa-3D-Tools\\Blender-5.2.1\\blender-5.2.1-windows-x64\\blender.exe",
  RECONSTRUCTION_QUALITY: "medium",
  RECONSTRUCTION_PROVIDER: "local-colmap",
};

for (const path of [workerSettings.COLMAP_PATH, workerSettings.BLENDER_PATH]) await access(path);

let updated = current.replace(/\r?\n$/, "");
for (const [key, value] of Object.entries(workerSettings)) {
  const line = `${key}=${value}`;
  const matcher = new RegExp(`^${key}=.*$`, "m");
  updated = matcher.test(updated) ? updated.replace(matcher, line) : `${updated}\n${line}`;
}
await writeFile(environmentPath, `${updated}\n`, { encoding: "utf8", mode: 0o600 });

console.log(JSON.stringify({
  ok: true,
  tokenGenerated: !values.has("WORKER_TOKEN"),
  apiHost: new URL(workerSettings.WORKER_API_URL).host,
  colmapAvailable: true,
  blenderAvailable: true,
}, null, 2));

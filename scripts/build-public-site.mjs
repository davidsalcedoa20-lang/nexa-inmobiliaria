import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(projectRoot, "public");
const publicEntries = ["index.html", "assets", "css", "js", "pages"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all(
  publicEntries.map((entry) =>
    cp(resolve(projectRoot, entry), resolve(outputDirectory, entry), {
      recursive: true,
    }),
  ),
);

console.info(`Sitio público preparado en ${outputDirectory}`);

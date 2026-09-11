import { spawnSync } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";

const protectedPaths = ["index.html", "assets", "css", "js", "pages"];
const checkpoint = "4d6640c";
const diff = spawnSync("git", ["diff", "--exit-code", checkpoint, "--", ...protectedPaths], {
  encoding: "utf8",
  shell: false,
});

assert.equal(
  diff.status,
  0,
  `El sitio público difiere del checkpoint ${checkpoint}:\n${diff.stdout}\n${diff.stderr}`,
);

const reservasPagePath = "pages/lote-reservas-del-lago.html";
const glbPath = "assets/models/casa-modelo.glb";
const usdzPath = "assets/models/casa-modelo.usdz";

await Promise.all([access(reservasPagePath), access(glbPath), access(usdzPath)]);
const [page, glb, usdz] = await Promise.all([
  readFile(reservasPagePath, "utf8"),
  stat(glbPath),
  stat(usdzPath),
]);

assert.match(page, /@google\/model-viewer@3\.5\.0/);
assert.match(page, /<model-viewer/);
assert.match(page, /src="\.\.\/assets\/models\/casa-modelo\.glb"/);
assert.match(page, /ios-src="\.\.\/assets\/models\/casa-modelo\.usdz"/);
assert.ok(glb.size > 0, "El archivo GLB de Reservas del Lago está vacío");
assert.ok(usdz.size > 0, "El archivo USDZ de Reservas del Lago está vacío");

console.info(`Sitio público intacto respecto a ${checkpoint}.`);
console.info(`Reservas del Lago: GLB (${glb.size} bytes), USDZ (${usdz.size} bytes) y model-viewer verificados.`);

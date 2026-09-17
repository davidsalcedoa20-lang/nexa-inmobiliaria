import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const htmlFiles = [
  "index.html",
  "pages/casa.html",
  "pages/lote.html",
  "pages/lote-reservas-del-lago.html",
  "pages/propiedad.html",
  "pages/proyecto.html",
  "pages/proyectos.html",
  "pages/sobreplano.html",
  "pages/sobreplano-detalle.html",
];
const errors = [];

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

for (const relativeFile of htmlFiles) {
  const absoluteFile = path.join(root, relativeFile);
  const html = await readFile(absoluteFile, "utf8");
  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]));

  if (/Canal de contacto por confirmar|Contacto próximamente|Agendamiento por confirmar/i.test(html)) {
    errors.push(`${relativeFile}: conserva un llamado a contacto inactivo`);
  }

  for (const match of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g)) {
    const value = match[1].trim();
    if (!value || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;

    if (value.startsWith("#")) {
      const anchor = decodeURIComponent(value.slice(1));
      if (anchor && !ids.has(anchor)) errors.push(`${relativeFile}: no existe el ancla ${value}`);
      continue;
    }

    const [resourcePart, fragment] = value.split("#", 2);
    const resource = resourcePart.split("?", 1)[0];
    if (!resource) continue;
    const target = path.resolve(path.dirname(absoluteFile), decodeURIComponent(resource));
    if (!(await exists(target))) {
      errors.push(`${relativeFile}: no existe el recurso ${value}`);
      continue;
    }

    if (fragment && target.endsWith(".html")) {
      const targetHtml = await readFile(target, "utf8");
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`\\sid=["']${escaped}["']`).test(targetHtml)) {
        errors.push(`${relativeFile}: ${value} apunta a un ancla inexistente`);
      }
    }
  }
}

const allMarkup = (await Promise.all(htmlFiles.map((file) => readFile(path.join(root, file), "utf8")))).join("\n");
assert.match(allMarkup, /https:\/\/wa\.me\/573176740334/);
assert.doesNotMatch(allMarkup, /wa\.me\/(?!573176740334)\d+/);

const realPropertyFiles = [
  "assets/images/properties/local-rodolfo.jpg",
  "assets/images/properties/lote-san-sebastian.jpg",
  "assets/images/properties/altos-san-sebastian.jpg",
  "assets/images/properties/edificio-yarumo.jpg",
];
for (const file of realPropertyFiles) {
  const metadata = await stat(path.join(root, file));
  assert.ok(metadata.size > 0, `${file} está vacío`);
}

const homePage = await readFile(path.join(root, "index.html"), "utf8");
for (const name of ["Local Rodolfo", "Lote en San Sebastián", "Altos de San Sebastián", "Edificio Yarumo"]) {
  assert.match(homePage, new RegExp(name), `Falta ${name} en el catálogo`);
}
assert.match(homePage, /id="casas"[^>]+hidden/);
assert.match(homePage, /id="lotes"[^>]+hidden/);
assert.match(homePage, /id="sobreplano"[^>]+hidden/);
assert.match(homePage, /id="experiencia-3d"/);
assert.match(homePage, /<model-viewer[\s\S]+assets\/models\/casa-modelo\.glb/);
for (const model of ["assets/models/casa-modelo.glb", "assets/models/casa-modelo.usdz"]) {
  const metadata = await stat(path.join(root, model));
  assert.ok(metadata.size > 0, `${model} está vacío`);
}

assert.deepEqual(errors, [], `Errores del sitio público:\n${errors.join("\n")}`);
console.info(`Verificados ${htmlFiles.length} documentos HTML, sus enlaces, recursos y anclas.`);
console.info("Catálogo real, visor GLB/USDZ, portadas optimizadas y WhatsApp 573176740334 verificados.");

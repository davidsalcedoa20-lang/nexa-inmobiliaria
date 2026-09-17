import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const htmlFiles = [
  "index.html",
  "pages/casa.html",
  "pages/lote.html",
  "pages/lote-reservas-del-lago.html",
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

const reservasPage = await readFile(path.join(root, "pages/lote-reservas-del-lago.html"), "utf8");
const glbPath = path.join(root, "assets/models/casa-modelo.glb");
const usdzPath = path.join(root, "assets/models/casa-modelo.usdz");
const [glb, usdz] = await Promise.all([stat(glbPath), stat(usdzPath)]);
assert.match(reservasPage, /<model-viewer/);
assert.ok(glb.size > 0, "El archivo GLB de Reservas del Lago está vacío");
assert.ok(usdz.size > 0, "El archivo USDZ de Reservas del Lago está vacío");

assert.deepEqual(errors, [], `Errores del sitio público:\n${errors.join("\n")}`);
console.info(`Verificados ${htmlFiles.length} documentos HTML, sus enlaces, recursos y anclas.`);
console.info("WhatsApp 573176740334 y experiencia 3D/AR de Reservas del Lago verificados.");

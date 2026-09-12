import { randomUUID } from "node:crypto";
import { adminProfiles, createDatabase, eq, properties } from "../packages/database/dist/index.js";
import { DrizzleCaptureRepository } from "../apps/api/dist/capture/drizzle-capture-repository.js";
import { DrizzlePropertyRepository } from "../apps/api/dist/properties/drizzle-property-repository.js";
import { R2ObjectStorageProvider } from "../apps/api/dist/storage/r2-object-storage-provider.js";

const required = [
  "DATABASE_URL",
  "R2_ENDPOINT",
  "R2_REGION",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) throw new Error(`Faltan variables: ${missing.join(", ")}`);

const connection = createDatabase(process.env.DATABASE_URL);
const propertiesRepository = new DrizzlePropertyRepository(connection.db);
const capturesRepository = new DrizzleCaptureRepository(connection.db);
const storage = new R2ObjectStorageProvider({
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION,
  bucketName: process.env.R2_BUCKET_NAME,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
});

let propertyId = null;
let objectKey = null;

try {
  const [administrator] = await connection.db
    .select({ id: adminProfiles.id })
    .from(adminProfiles)
    .where(eq(adminProfiles.isActive, true))
    .limit(1);
  if (!administrator) throw new Error("No existe un perfil administrativo activo");

  const createdProperty = await propertiesRepository.create(
    {
      type: "house",
      title: "Verificación temporal ETAPA 3",
      slug: `codex-stage3-smoke-${Date.now()}`,
      summary: null,
      description: null,
      price: null,
      currency: "COP",
      areaSquareMeters: null,
      bedrooms: null,
      bathrooms: null,
      parkingSpaces: null,
      address: null,
      neighborhood: null,
      city: "Cúcuta",
      department: "Norte de Santander",
      country: "Colombia",
      latitude: null,
      longitude: null,
      specifications: {},
    },
    administrator.id,
  );
  propertyId = createdProperty.id;

  const session = await capturesRepository.getOrCreateActiveSession(propertyId, administrator.id);
  const room = await capturesRepository.createRoom(
    propertyId,
    { type: "living_room", name: "Sala de verificación" },
    administrator.id,
  );
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const photoId = randomUUID();
  objectKey = `properties/${propertyId}/capture/rooms/${room.id}/${photoId}.jpg`;
  await capturesRepository.createPendingPhoto({
    propertyId,
    roomId: room.id,
    photoId,
    objectKey,
    metadata: {
      originalFileName: "verificacion.jpg",
      contentType: "image/jpeg",
      byteSize: bytes.byteLength,
      width: 1,
      height: 1,
      capturedAt: new Date().toISOString(),
    },
    administratorId: administrator.id,
  });

  const uploadUrl = await storage.createUploadUrl({ objectKey, contentType: "image/jpeg" });
  const preflight = await fetch(uploadUrl, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  if (
    !preflight.ok ||
    preflight.headers.get("access-control-allow-origin") !== "http://localhost:5173" ||
    !preflight.headers.get("access-control-allow-methods")?.includes("PUT")
  ) {
    throw new Error("La política CORS de R2 no permite cargas desde el panel local");
  }
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: bytes,
  });
  if (!upload.ok) throw new Error(`R2 rechazó la carga temporal (${upload.status})`);

  const stored = await storage.headObject(objectKey);
  if (stored?.contentLength !== bytes.byteLength || stored.contentType !== "image/jpeg") {
    throw new Error("Los metadatos guardados en R2 no coinciden");
  }
  await capturesRepository.markPhotoUploaded(propertyId, photoId, { etag: stored.etag });
  const snapshot = await capturesRepository.getSnapshot(propertyId);

  const previewUrl = await storage.createDownloadUrl(objectKey);
  const preview = await fetch(previewUrl);
  if (!preview.ok || (await preview.arrayBuffer()).byteLength !== bytes.byteLength) {
    throw new Error("La vista previa firmada no pudo leerse");
  }

  await storage.deleteObject(objectKey);
  if ((await storage.headObject(objectKey)) !== null) {
    throw new Error("El archivo temporal no fue eliminado de R2");
  }
  objectKey = null;
  await capturesRepository.deletePhoto(propertyId, photoId);
  await propertiesRepository.delete(propertyId, createdProperty.version);
  propertyId = null;

  console.log(JSON.stringify({
    ok: true,
    sessionCreated: session.status === "active",
    roomCreated: room.name === "Sala de verificación",
    photoUploaded: snapshot?.totalPhotoCount === 1,
    browserCorsReady: true,
    signedPreviewReadable: true,
    cleanupComplete: true,
  }, null, 2));
} finally {
  if (objectKey) await storage.deleteObject(objectKey).catch(() => undefined);
  if (propertyId) await connection.db.delete(properties).where(eq(properties.id, propertyId));
  await connection.close();
}

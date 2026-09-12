import { randomUUID } from "node:crypto";
import { adminProfiles, createDatabase, eq, properties } from "../packages/database/dist/index.js";
import { DrizzleCaptureRepository } from "../apps/api/dist/capture/drizzle-capture-repository.js";
import { DrizzlePropertyRepository } from "../apps/api/dist/properties/drizzle-property-repository.js";
import { DrizzleReconstructionRepository } from "../apps/api/dist/reconstruction/drizzle-reconstruction-repository.js";
import { MockThreeDReconstructionProvider } from "../apps/api/dist/reconstruction/provider.js";
import { ThreeDReconstructionService } from "../apps/api/dist/reconstruction/service.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL no está configurada");

const connection = createDatabase(databaseUrl);
const propertyRepository = new DrizzlePropertyRepository(connection.db);
const captureRepository = new DrizzleCaptureRepository(connection.db);
const reconstructionRepository = new DrizzleReconstructionRepository(connection.db);
const service = new ThreeDReconstructionService(
  captureRepository,
  reconstructionRepository,
  new MockThreeDReconstructionProvider(),
);
let temporaryPropertyId = null;

try {
  const [administrator] = await connection.db
    .select({ id: adminProfiles.id })
    .from(adminProfiles)
    .where(eq(adminProfiles.isActive, true))
    .limit(1);
  if (!administrator) throw new Error("No existe un perfil administrativo activo");

  const created = await propertyRepository.create(
    {
      type: "house",
      title: "Verificación temporal ETAPA 4",
      slug: `codex-stage4-smoke-${Date.now()}`,
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
  temporaryPropertyId = created.id;
  if (created.threeDStatus !== "not_started") {
    throw new Error("La propiedad no inició con el estado 3D esperado");
  }

  const room = await captureRepository.createRoom(
    created.id,
    { type: "living_room", name: "Sala de verificación" },
    administrator.id,
  );
  const photoId = randomUUID();
  await captureRepository.createPendingPhoto({
    propertyId: created.id,
    roomId: room.id,
    photoId,
    objectKey: `verification/stage4/${photoId}.jpg`,
    metadata: {
      originalFileName: "verificacion.jpg",
      contentType: "image/jpeg",
      byteSize: 4,
      width: 1,
      height: 1,
      capturedAt: new Date().toISOString(),
    },
    administratorId: administrator.id,
  });
  await captureRepository.markPhotoUploaded(created.id, photoId, { etag: "mock-etag" });

  const reviewed = await service.prepare(created.id, administrator.id);
  if (reviewed.status !== "review_required" || reviewed.latestJob?.provider !== "mock") {
    throw new Error("El proveedor mock no terminó en revisión");
  }

  const ready = await service.publish(created.id, administrator.id);
  if (ready.status !== "ready" || ready.latestJob?.status !== "ready") {
    throw new Error("La experiencia mock no quedó lista");
  }

  await propertyRepository.delete(created.id, created.version);
  temporaryPropertyId = null;

  console.log(JSON.stringify({
    ok: true,
    initialStatus: created.threeDStatus,
    preparedStatus: reviewed.status,
    provider: reviewed.latestJob.provider,
    publishedStatus: ready.status,
    cleanupComplete: true,
  }, null, 2));
} finally {
  if (temporaryPropertyId) {
    await connection.db.delete(properties).where(eq(properties.id, temporaryPropertyId));
  }
  await connection.close();
}

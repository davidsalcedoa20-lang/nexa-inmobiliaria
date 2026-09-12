import { adminProfiles, createDatabase, eq, properties } from "../packages/database/dist/index.js";
import { DrizzlePropertyRepository } from "../apps/api/dist/properties/drizzle-property-repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL no está configurada");

const connection = createDatabase(databaseUrl);
const repository = new DrizzlePropertyRepository(connection.db);
let temporaryId = null;

try {
  const [administrator] = await connection.db
    .select({ id: adminProfiles.id })
    .from(adminProfiles)
    .where(eq(adminProfiles.isActive, true))
    .limit(1);
  if (!administrator) throw new Error("No existe un perfil administrativo activo");

  const slug = `codex-stage2-smoke-${Date.now()}`;
  const created = await repository.create(
    {
      type: "lot",
      title: "Verificación temporal ETAPA 2",
      slug,
      summary: null,
      description: null,
      price: null,
      currency: "COP",
      areaSquareMeters: 100,
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
  temporaryId = created.id;

  const listed = await repository.list({ search: slug, page: 1, pageSize: 20 });
  const updated = await repository.update(
    created.id,
    { title: "Verificación temporal actualizada", version: created.version },
    administrator.id,
  );
  const published = await repository.changePublicationStatus(
    updated.id,
    "published",
    updated.version,
    administrator.id,
  );
  const unpublished = await repository.changePublicationStatus(
    published.id,
    "unpublished",
    published.version,
    administrator.id,
  );
  await repository.delete(unpublished.id, unpublished.version);
  temporaryId = null;

  const removed = (await repository.findById(created.id)) === null;
  console.log(
    JSON.stringify(
      {
        ok: true,
        createDraft: created.publicationStatus === "draft",
        listed: listed.pagination.total === 1,
        updated: updated.version === created.version + 1,
        published: published.publicationStatus === "published",
        unpublished: unpublished.publicationStatus === "unpublished",
        removed,
      },
      null,
      2,
    ),
  );
} finally {
  if (temporaryId) {
    await connection.db.delete(properties).where(eq(properties.id, temporaryId));
  }
  await connection.close();
}

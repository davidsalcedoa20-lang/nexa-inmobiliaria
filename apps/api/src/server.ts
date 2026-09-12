import { createDatabase } from "@nexa/database";
import { buildApp } from "./app.js";
import { DrizzleAdminProfileRepository } from "./auth/drizzle-admin-profile-repository.js";
import { SupabaseTokenVerifier } from "./auth/supabase-token-verifier.js";
import { DrizzleCaptureRepository } from "./capture/drizzle-capture-repository.js";
import { readEnvironment } from "./config/env.js";
import { DrizzlePropertyRepository } from "./properties/drizzle-property-repository.js";
import { DrizzleReconstructionRepository } from "./reconstruction/drizzle-reconstruction-repository.js";
import { MockThreeDReconstructionProvider } from "./reconstruction/provider.js";
import { ThreeDReconstructionService } from "./reconstruction/service.js";
import { R2ObjectStorageProvider } from "./storage/r2-object-storage-provider.js";

const environment = readEnvironment();
const connection = createDatabase(environment.DATABASE_URL);
const captures = new DrizzleCaptureRepository(connection.db);
const reconstruction = new ThreeDReconstructionService(
  captures,
  new DrizzleReconstructionRepository(connection.db),
  new MockThreeDReconstructionProvider(),
);

const app = await buildApp({
  tokenVerifier: new SupabaseTokenVerifier(environment.SUPABASE_URL),
  adminProfiles: new DrizzleAdminProfileRepository(connection.db),
  properties: new DrizzlePropertyRepository(connection.db),
  captures,
  reconstruction,
  objectStorage: new R2ObjectStorageProvider({
    endpoint: environment.R2_ENDPOINT,
    region: environment.R2_REGION,
    bucketName: environment.R2_BUCKET_NAME,
    accessKeyId: environment.R2_ACCESS_KEY_ID,
    secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
  }),
  adminOrigins: environment.adminOrigins,
  logger: { level: environment.LOG_LEVEL },
});

const shutdown = async () => {
  await app.close();
  await connection.close();
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await app.listen({ port: environment.PORT, host: environment.HOST });

import { createDatabase } from "@nexa/database";
import { buildApp } from "./app.js";
import { DrizzleAdminProfileRepository } from "./auth/drizzle-admin-profile-repository.js";
import { SupabaseTokenVerifier } from "./auth/supabase-token-verifier.js";
import { readEnvironment } from "./config/env.js";

const environment = readEnvironment();
const connection = createDatabase(environment.DATABASE_URL);

const app = await buildApp({
  tokenVerifier: new SupabaseTokenVerifier(environment.SUPABASE_URL),
  adminProfiles: new DrizzleAdminProfileRepository(connection.db),
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

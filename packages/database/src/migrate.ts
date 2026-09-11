import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./client.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatoria para ejecutar migraciones");
}

const connection = createDatabase(databaseUrl);

try {
  await migrate(connection.db, { migrationsFolder: "./drizzle" });
  console.info("Migraciones aplicadas correctamente");
} finally {
  await connection.close();
}

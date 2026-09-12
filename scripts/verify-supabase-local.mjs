import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const missing = [
  ["DATABASE_URL", databaseUrl],
  ["SUPABASE_URL", supabaseUrl],
  ["VITE_SUPABASE_PUBLISHABLE_KEY", publishableKey],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(JSON.stringify({ ok: false, missing }));
  process.exit(1);
}

if (databaseUrl.includes("localhost:5432/nexa") || databaseUrl.includes("YOUR-PASSWORD")) {
  console.error(JSON.stringify({ ok: false, databaseUrl: "placeholder" }));
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: "require",
  connect_timeout: 10,
});

try {
  const [database] = await sql`
    select
      current_setting('server_version') as postgres_version,
      (select count(*)::int from drizzle.__drizzle_migrations) as drizzle_migrations,
      (
        select count(*)::int
        from public.admin_profiles
        where role = 'admin' and is_active = true
      ) as active_admins,
      (
        select count(*)::int
        from auth.users u
        join public.admin_profiles p on p.id = u.id
        where p.role = 'admin' and p.is_active = true
      ) as linked_auth_admins,
      (
        select relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'admin_profiles'
      ) as admin_profiles_rls,
      (
        select relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'properties'
      ) as properties_rls,
      (
        select bool_and(c.relrowsecurity)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('capture_sessions', 'capture_rooms', 'capture_photos')
      ) as capture_tables_rls,
      (
        select count(*)::int
        from pg_policies
        where schemaname = 'public'
          and tablename in ('admin_profiles', 'properties', 'capture_sessions', 'capture_rooms', 'capture_photos')
      ) as rls_policies
  `;

  const [authResponse, jwksResponse] = await Promise.all([
    fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
    }),
    fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
  ]);

  const jwks = jwksResponse.ok ? await jwksResponse.json() : null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        databaseConnected: true,
        ...database,
        authSettingsReachable: authResponse.ok,
        authStatus: authResponse.status,
        jwksReachable: jwksResponse.ok,
        jwksStatus: jwksResponse.status,
        jwksKeys: Array.isArray(jwks?.keys) ? jwks.keys.length : 0,
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end();
}

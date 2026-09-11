import type { CurrentAdmin } from "../lib/api";
import { supabase } from "../lib/supabase";

export function AdminShell({ admin }: { admin: CurrentAdmin }) {
  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Andrés Lizcano</p>
          <strong>Administración</strong>
        </div>
        <button className="text-button" type="button" onClick={() => void supabase?.auth.signOut()}>
          Salir
        </button>
      </header>

      <main className="admin-main">
        <section className="welcome-card">
          <p className="eyebrow">Base administrativa</p>
          <h1>Hola, {admin.displayName ?? admin.email}</h1>
          <p>
            La autenticación está activa. La gestión de propiedades se incorporará en la siguiente
            etapa sin alterar el sitio público.
          </p>
          <span className="role-chip">Rol: {admin.role}</span>
        </section>
      </main>
    </div>
  );
}

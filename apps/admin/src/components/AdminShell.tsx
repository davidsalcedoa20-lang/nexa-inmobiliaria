import type { CurrentAdmin } from "../lib/api";
import { supabase } from "../lib/supabase";
import { PropertyDashboard } from "./PropertyDashboard";

export function AdminShell({ admin }: { admin: CurrentAdmin }) {
  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="mini-brand-mark" aria-hidden="true">AL</div>
          <div>
            <p className="eyebrow">Andrés Lizcano</p>
            <strong>Administración</strong>
          </div>
        </div>
        <div className="account-actions">
          <span>{admin.displayName ?? admin.email}</span>
          <button className="text-button" type="button" onClick={() => void supabase?.auth.signOut()}>
            Salir
          </button>
        </div>
      </header>

      <main className="admin-main">
        <PropertyDashboard role={admin.role} />
      </main>
    </div>
  );
}

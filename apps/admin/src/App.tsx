import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { AdminShell } from "./components/AdminShell";
import { LoginForm } from "./components/LoginForm";
import { ResetPasswordForm } from "./components/ResetPasswordForm";
import { getCurrentAdmin, type CurrentAdmin } from "./lib/api";
import { hasSupabaseConfiguration, supabase } from "./lib/supabase";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "recovering" }
  | { status: "authenticated"; admin: CurrentAdmin }
  | { status: "forbidden"; message: string };

function recoveryRequested() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const explicitRecovery = query.get("recovery") === "1" || hash.get("type") === "recovery";
  if (explicitRecovery) {
    window.localStorage.setItem("nexa:password-recovery-pending", "true");
  }
  return explicitRecovery || window.localStorage.getItem("nexa:password-recovery-pending") === "true";
}

async function resolveSession(session: Session | null, setState: (state: AuthState) => void) {
  if (!session) {
    setState({ status: "anonymous" });
    return;
  }

  try {
    const admin = await getCurrentAdmin(session);
    setState({ status: "authenticated", admin });
  } catch (error) {
    setState({
      status: "forbidden",
      message: error instanceof Error ? error.message : "Acceso administrativo no disponible",
    });
  }
}

export default function App() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    if (!supabase) return;
    const recoveryPending = recoveryRequested();

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && recoveryPending) {
        setState({ status: "recovering" });
        return;
      }
      void resolveSession(data.session, setState);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && recoveryRequested())) {
        window.localStorage.setItem("nexa:password-recovery-pending", "true");
        setState({ status: "recovering" });
        return;
      }
      void resolveSession(session, setState);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (!hasSupabaseConfiguration) {
    return (
      <main className="auth-layout">
        <section className="auth-card">
          <p className="eyebrow">Configuración pendiente</p>
          <h1>Conecta Supabase</h1>
          <p className="muted">
            Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el entorno del panel.
          </p>
        </section>
      </main>
    );
  }

  if (state.status === "loading") return <div className="loading-screen">Validando sesión…</div>;
  if (state.status === "anonymous") return <LoginForm />;
  if (state.status === "recovering") {
    return (
      <ResetPasswordForm
        onComplete={() => {
          window.localStorage.removeItem("nexa:password-recovery-pending");
          window.history.replaceState({}, "", "/");
          setState({ status: "anonymous" });
        }}
      />
    );
  }
  if (state.status === "authenticated") return <AdminShell admin={state.admin} />;

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">Acceso restringido</p>
        <h1>No tienes acceso al panel</h1>
        <p className="form-error">{state.message}</p>
        <button className="primary-button" type="button" onClick={() => void supabase?.auth.signOut()}>
          Volver al inicio de sesión
        </button>
      </section>
    </main>
  );
}

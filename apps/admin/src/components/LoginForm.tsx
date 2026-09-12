import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const LoginSchema = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type LoginValues = z.infer<typeof LoginSchema>;

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema) });

  const submit = async (values: LoginValues) => {
    setServerError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) setServerError("No fue posible iniciar sesión. Verifica tus datos.");
  };

  const sendRecovery = async () => {
    setServerError(null);
    const email = getValues("email");
    const validation = z.email().safeParse(email);
    if (!validation.success) {
      setError("email", { message: "Ingresa el correo del administrador" });
      return;
    }
    if (!supabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) {
      setServerError(
        error.status === 429
          ? "Supabase alcanzó el límite temporal de correos. Espera antes de solicitar otro enlace."
          : `Supabase rechazó la solicitud: ${error.message}`,
      );
      return;
    }
    window.localStorage.setItem("nexa:password-recovery-pending", "true");
    setRecoverySent(true);
  };

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">AL</div>
        <p className="eyebrow">Andrés Lizcano · Ingeniería + Inversión</p>
        <h1 id="login-title">Panel administrativo</h1>
        <p className="muted">
          {recoveryMode
            ? "Recibe un enlace seguro para definir una contraseña nueva."
            : "Gestiona propiedades y prepara sus futuras experiencias 3D."}
        </p>

        <form onSubmit={recoveryMode ? (event) => { event.preventDefault(); void sendRecovery(); } : handleSubmit(submit)} noValidate>
          <label>
            Correo
            <input type="email" autoComplete="email" inputMode="email" {...register("email")} />
          </label>
          {errors.email && <p className="field-error">{errors.email.message}</p>}

          {!recoveryMode && (
            <>
              <label>
                Contraseña
                <input type="password" autoComplete="current-password" {...register("password")} />
              </label>
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </>
          )}
          {serverError && <p className="form-error" role="alert">{serverError}</p>}
          {recoverySent && (
            <p className="success-message" role="status">
              Revisa tu correo y abre el enlace de recuperación en este equipo.
            </p>
          )}

          <button className="primary-button" type="submit" disabled={isSubmitting || recoverySent}>
            {recoveryMode ? "Enviar enlace" : isSubmitting ? "Ingresando…" : "Ingresar"}
          </button>
          <button
            className="link-button"
            type="button"
            onClick={() => {
              setRecoveryMode((value) => !value);
              setRecoverySent(false);
              setServerError(null);
            }}
          >
            {recoveryMode ? "Volver al inicio de sesión" : "¿Olvidaste tu contraseña?"}
          </button>
        </form>
      </section>
    </main>
  );
}

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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema) });

  const submit = async (values: LoginValues) => {
    setServerError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) setServerError("No fue posible iniciar sesión. Verifica tus datos.");
  };

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">AL</div>
        <p className="eyebrow">Andrés Lizcano · Ingeniería + Inversión</p>
        <h1 id="login-title">Panel administrativo</h1>
        <p className="muted">Gestiona propiedades y prepara sus futuras experiencias 3D.</p>

        <form onSubmit={handleSubmit(submit)} noValidate>
          <label>
            Correo
            <input type="email" autoComplete="email" inputMode="email" {...register("email")} />
          </label>
          {errors.email && <p className="field-error">{errors.email.message}</p>}

          <label>
            Contraseña
            <input type="password" autoComplete="current-password" {...register("password")} />
          </label>
          {errors.password && <p className="field-error">{errors.password.message}</p>}
          {serverError && <p className="form-error" role="alert">{serverError}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}

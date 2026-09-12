import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ["confirmation"],
    message: "Las contraseñas no coinciden",
  });

type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

export function ResetPasswordForm({ onComplete }: { onComplete: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(ResetPasswordSchema) });

  const submit = async ({ password }: ResetPasswordValues) => {
    setServerError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setServerError("No fue posible cambiar la contraseña. Solicita un enlace nuevo.");
      return;
    }
    await supabase.auth.signOut();
    onComplete();
  };

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="reset-title">
        <div className="brand-mark" aria-hidden="true">AL</div>
        <p className="eyebrow">Recuperación segura</p>
        <h1 id="reset-title">Crea una contraseña nueva</h1>
        <p className="muted">Utiliza al menos 8 caracteres y guárdala en un lugar seguro.</p>

        <form onSubmit={handleSubmit(submit)} noValidate>
          <label>
            Nueva contraseña
            <input type="password" autoComplete="new-password" {...register("password")} />
          </label>
          {errors.password && <p className="field-error">{errors.password.message}</p>}

          <label>
            Confirmar contraseña
            <input type="password" autoComplete="new-password" {...register("confirmation")} />
          </label>
          {errors.confirmation && <p className="field-error">{errors.confirmation.message}</p>}
          {serverError && <p className="form-error" role="alert">{serverError}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser } from "@/features/auth/application/login-user";
import { registerUser } from "@/features/auth/application/register-user";
import {
  SupabaseAuthError,
  SupabaseAuthRepository,
} from "@/features/auth/infrastructure/supabase-auth-repository";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authRepository = useMemo(
    () => new SupabaseAuthRepository(supabaseBrowser),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function redirectSignedInUser() {
      const { data } = await supabaseBrowser.auth.getSession();

      if (isMounted && data.session) {
        router.replace("/dashboard");
      }
    }

    redirectSignedInUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(
      formData.get("passwordConfirmation") ?? "",
    );

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (password !== passwordConfirmation) {
          throw new Error("Die Passwoerter stimmen nicht ueberein.");
        }

        const result = await registerUser(authRepository, {
          name,
          email,
          password,
        });

        setMessage(result.message);
        return;
      }

      const result = await loginUser(authRepository, {
        email,
        password,
      });

      setMessage(`${result.message} Angemeldet als ${result.user?.email}.`);
      router.push("/dashboard");
    } catch (caughtError) {
      setError(formatAuthError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
            Neuroplex
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {isRegister ? "Account erstellen" : "Einloggen"}
          </h1>
        </div>

        <form
          className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          {isRegister && (
            <label className="block text-sm font-medium text-zinc-700">
              Name
              <input
                name="name"
                type="text"
                autoComplete="name"
                required
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              />
            </label>
          )}

          <label className="block text-sm font-medium text-zinc-700">
            E-Mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Passwort
            <input
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={6}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            />
          </label>

          {isRegister && (
            <label className="block text-sm font-medium text-zinc-700">
              Passwort bestaetigen
              <input
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              />
            </label>
          )}

          {message && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting
              ? "Bitte warten..."
              : isRegister
                ? "Account erstellen"
                : "Einloggen"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setMessage(null);
            setError(null);
          }}
          className="mt-5 w-full text-center text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
        >
          {isRegister
            ? "Schon einen Account? Einloggen"
            : "Noch keinen Account? Registrieren"}
        </button>
      </section>
    </main>
  );
}

function formatAuthError(error: unknown) {
  if (error instanceof SupabaseAuthError || error instanceof Error) {
    return error.message;
  }

  return "Die Anmeldung ist fehlgeschlagen.";
}

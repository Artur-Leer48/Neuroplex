"use client";

import { FormEvent, useMemo, useState } from "react";

import { loginUser } from "@/features/auth/application/login-user";
import { registerUser } from "@/features/auth/application/register-user";
import {
  SupabaseAuthError,
  SupabaseAuthRepository,
} from "@/features/auth/infrastructure/supabase-auth-repository";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authRepository = useMemo(
    () => new SupabaseAuthRepository(supabaseBrowser),
    [],
  );

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
    } catch (caughtError) {
      setError(formatAuthError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isRegister ? "Registrieren" : "Login"}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <input
              name="name"
              type="text"
              placeholder="Name"
              required
              className="w-full border rounded-lg px-4 py-2"
            />
          )}

          <input
            name="email"
            type="email"
            placeholder="E-Mail"
            required
            className="w-full border rounded-lg px-4 py-2"
          />

          <input
            name="password"
            type="password"
            placeholder="Passwort"
            required
            minLength={6}
            className="w-full border rounded-lg px-4 py-2"
          />

          {isRegister && (
            <input
              name="passwordConfirmation"
              type="password"
              placeholder="Passwort bestaetigen"
              required
              minLength={6}
              className="w-full border rounded-lg px-4 py-2"
            />
          )}

          {message && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white rounded-lg py-2 font-semibold disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSubmitting
              ? "Bitte warten..."
              : isRegister
                ? "Account erstellen"
                : "Einloggen"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setMessage(null);
            setError(null);
          }}
          className="mt-4 text-sm text-blue-600 w-full"
        >
          {isRegister
            ? "Schon einen Account? Login"
            : "Noch keinen Account? Registrieren"}
        </button>
      </div>
    </main>
  );
}

function formatAuthError(error: unknown) {
  if (error instanceof SupabaseAuthError || error instanceof Error) {
    return error.message;
  }

  return "Die Anmeldung ist fehlgeschlagen.";
}

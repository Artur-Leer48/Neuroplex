"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase-browser";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabaseBrowser.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      setEmail(data.session.user.email ?? "Unbekannte E-Mail");
      setIsLoading(false);
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    setIsLoggingOut(true);
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm font-medium text-zinc-600">Session wird geprueft...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
              Neuroplex
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/personal"
              aria-label="Persoenlicher Bereich"
              title="Persoenlicher Bereich"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
            >
              <UserIcon />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              {isLoggingOut ? "Abmelden..." : "Abmelden"}
            </button>
          </div>
        </header>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Eingeloggt als</p>
          <p className="mt-2 text-lg font-semibold text-zinc-950">{email}</p>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Training</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Plasticity
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Starte einen Fokus-Timer und waehle die Erholung danach.
              </p>
            </div>

            <Link
              href="/plasticity"
              className="flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Start Plasticity
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Planung</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Eisenhower
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Sortiere Tasks nach Dringlichkeit und Wichtigkeit.
              </p>
            </div>

            <Link
              href="/eisenhower"
              className="flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Start Eisenhower
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Lernen</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Learning Topics
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Plane Ressourcen, Wiederholungen und Active-Recall-Sessions.
              </p>
            </div>

            <Link
              href="/learning"
              className="flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Start Learning
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
    </svg>
  );
}

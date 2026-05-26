"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/app/app-header";
import { hasDemoOrSupabaseSession } from "@/lib/demo-auth";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { isDemo, session, error } = await hasDemoOrSupabaseSession(() =>
        supabaseBrowser.auth.getSession(),
      );

      if (!isMounted) {
        return;
      }

      if (error || (!isDemo && !session)) {
        router.replace("/login");
        return;
      }

      setEmail(
        isDemo
          ? "Demo-Modus"
          : session?.user.email ?? "Unbekannte E-Mail",
      );
      setIsLoading(false);
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

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
        <AppHeader title="Dashboard" />

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

            <a
              href="/plasticity"
              className="flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Start Plasticity
            </a>
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

            <a
              href="/eisenhower"
              className="flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Start Eisenhower
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Lernen</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Spaced Repetition Kalender
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Plane Lernressourcen, Wiederholungen und Active-Recall-Sessions.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href="/learning?panel=calendar"
                className="flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Kalender oeffnen
              </a>
              <a
                href="/learning"
                className="flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
              >
                Themen
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

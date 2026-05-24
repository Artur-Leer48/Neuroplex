"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  readPlasticityStats,
  summarizePlasticityStats,
  type PlasticityStatEntry,
  type PlasticityStatSummary,
} from "@/lib/plasticity-stats";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function PersonalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<PlasticityStatEntry[]>([]);
  const [summary, setSummary] = useState<PlasticityStatSummary>({
    today: 0,
    week: 0,
    month: 0,
    year: 0,
    meditation: 0,
    yogaNidra: 0,
    walk: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPersonalArea() {
      const { data, error } = await supabaseBrowser.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      const nextEntries = readPlasticityStats();
      setEntries(nextEntries);
      setSummary(summarizePlasticityStats(nextEntries));
      setIsLoading(false);
    }

    loadPersonalArea();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm font-medium text-zinc-600">
          Session wird geprueft...
        </p>
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
              Persoenlicher Bereich
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              aria-label="Home"
              title="Home"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
            >
              <HomeIcon />
            </Link>

            <Link
              href="/plasticity"
              aria-label="Plasticity"
              title="Plasticity"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
            >
              <TimerIcon />
            </Link>
          </div>
        </header>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Arbeitsminuten
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard label="Heute" seconds={summary.today} />
            <StatCard label="Diese Woche" seconds={summary.week} />
            <StatCard label="Dieser Monat" seconds={summary.month} />
            <StatCard label="Dieses Jahr" seconds={summary.year} />
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Recovery-Minuten
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Meditation" seconds={summary.meditation} />
            <StatCard label="Yoga Nidra" seconds={summary.yogaNidra} />
            <StatCard label="Spaziergang" seconds={summary.walk} />
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Letzte Eintraege
          </p>

          {entries.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">
              Noch keine abgeschlossenen Sessions.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-zinc-100">
              {entries.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="font-medium text-zinc-800">
                    {formatType(entry.type)}
                  </span>
                  <span className="text-zinc-500">
                    {formatMinutes(entry.seconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, seconds }: { label: string; seconds: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">
        {formatMinutes(seconds)}
      </p>
    </div>
  );
}

function formatMinutes(seconds: number) {
  const minutes = seconds / 60;

  if (minutes < 1 && seconds > 0) {
    return `${minutes.toFixed(1)} min`;
  }

  return `${Math.round(minutes)} min`;
}

function formatType(type: PlasticityStatEntry["type"]) {
  if (type === "plasticity") {
    return "Plasticity";
  }

  if (type === "yoga-nidra") {
    return "Yoga Nidra";
  }

  if (type === "walk") {
    return "Spaziergang";
  }

  return "Meditation";
}

function HomeIcon() {
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
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function TimerIcon() {
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
      <path d="M10 2h4" />
      <path d="M12 14V8" />
      <path d="M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
    </svg>
  );
}

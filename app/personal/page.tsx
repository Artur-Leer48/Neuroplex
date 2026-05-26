"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/app/app-header";
import { hasDemoOrSupabaseSession } from "@/lib/demo-auth";
import {
  readPlasticityStats,
  summarizePlasticityStats,
  summarizeTaskTime,
  type PlasticityStatEntry,
  type PlasticityStatSummary,
  type TaskTimeSummary,
} from "@/lib/plasticity-stats";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function PersonalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<PlasticityStatEntry[]>([]);
  const [taskSummaries, setTaskSummaries] = useState<TaskTimeSummary[]>([]);
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

      const nextEntries = isDemo
        ? []
        : await readPlasticityStats(supabaseBrowser);
      setEntries(nextEntries);
      setSummary(summarizePlasticityStats(nextEntries));
      setTaskSummaries(summarizeTaskTime(nextEntries));
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
        <AppHeader title="Persoenlicher Bereich" />

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
            Task-Zeit
          </p>

          {taskSummaries.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">
              Noch keine Task-Zeit erfasst.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-zinc-100">
              {taskSummaries.map((taskSummary) => (
                <div
                  key={taskSummary.taskId ?? taskSummary.taskTitle}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="font-medium text-zinc-800">
                    {taskSummary.taskTitle}
                  </span>
                  <span className="text-zinc-500">
                    {formatMinutes(taskSummary.seconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
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

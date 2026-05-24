"use client";

const STORAGE_KEY = "neuroplex:plasticity-stats";

export type PlasticityStatType =
  | "plasticity"
  | "meditation"
  | "yoga-nidra"
  | "walk";

export type PlasticityStatEntry = {
  id: string;
  type: PlasticityStatType;
  seconds: number;
  createdAt: string;
};

export type PlasticityStatSummary = {
  today: number;
  week: number;
  month: number;
  year: number;
  meditation: number;
  yogaNidra: number;
  walk: number;
};

export function recordPlasticityStat(type: PlasticityStatType, seconds: number) {
  if (typeof window === "undefined") {
    return;
  }

  const entries = readPlasticityStats();
  const nextEntry: PlasticityStatEntry = {
    id: crypto.randomUUID(),
    type,
    seconds,
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([nextEntry, ...entries]),
  );
}

export function readPlasticityStats() {
  if (typeof window === "undefined") {
    return [];
  }

  const rawStats = window.localStorage.getItem(STORAGE_KEY);

  if (!rawStats) {
    return [];
  }

  try {
    const parsedStats = JSON.parse(rawStats);

    if (!Array.isArray(parsedStats)) {
      return [];
    }

    return parsedStats.filter(isPlasticityStatEntry);
  } catch {
    return [];
  }
}

export function summarizePlasticityStats(
  entries: PlasticityStatEntry[],
): PlasticityStatSummary {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  return entries.reduce(
    (summary, entry) => {
      const entryDate = new Date(entry.createdAt);

      if (entry.type === "plasticity") {
        if (entryDate >= todayStart) {
          summary.today += entry.seconds;
        }

        if (entryDate >= weekStart) {
          summary.week += entry.seconds;
        }

        if (entryDate >= monthStart) {
          summary.month += entry.seconds;
        }

        if (entryDate >= yearStart) {
          summary.year += entry.seconds;
        }
      }

      if (entry.type === "meditation") {
        summary.meditation += entry.seconds;
      }

      if (entry.type === "yoga-nidra") {
        summary.yogaNidra += entry.seconds;
      }

      if (entry.type === "walk") {
        summary.walk += entry.seconds;
      }

      return summary;
    },
    {
      today: 0,
      week: 0,
      month: 0,
      year: 0,
      meditation: 0,
      yogaNidra: 0,
      walk: 0,
    },
  );
}

function isPlasticityStatEntry(value: unknown): value is PlasticityStatEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<PlasticityStatEntry>;

  return (
    typeof entry.id === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.seconds === "number" &&
    (entry.type === "plasticity" ||
      entry.type === "meditation" ||
      entry.type === "yoga-nidra" ||
      entry.type === "walk")
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const weekStart = startOfDay(date);
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  return weekStart;
}

"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

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
  taskId?: string | null;
  taskTitle?: string | null;
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

export type TaskTimeSummary = {
  taskId: string | null;
  taskTitle: string;
  seconds: number;
};

type WorkSessionRow = {
  id: string;
  task_id: string | null;
  task_title: string | null;
  timer_name: string;
  duration_seconds: number;
  completed_at: string;
};

type RecoverySessionRow = {
  id: string;
  activity_type: "meditation" | "yoga-nidra" | "walk";
  timer_name: string;
  duration_seconds: number;
  completed_at: string;
};

export async function recordPlasticityStat(
  supabase: SupabaseClient,
  type: PlasticityStatType,
  seconds: number,
  task?: {
    id?: string | null;
    title?: string | null;
  },
) {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return;
  }

  if (type === "plasticity") {
    await supabase.from("work_sessions").insert({
      user_id: userData.user.id,
      task_id: task?.id ?? null,
      task_title: task?.title ?? null,
      timer_name: task?.title ?? "Plasticity",
      duration_seconds: seconds,
      started_at: new Date(Date.now() - seconds * 1000).toISOString(),
      completed_at: new Date().toISOString(),
    });
    return;
  }

  await supabase.from("recovery_sessions").insert({
    user_id: userData.user.id,
    activity_type: type,
    timer_name: formatType(type),
    duration_seconds: seconds,
    completed_at: new Date().toISOString(),
  });
}

export function summarizeTaskTime(entries: PlasticityStatEntry[]) {
  const taskMap = new Map<string, TaskTimeSummary>();

  for (const entry of entries) {
    if (entry.type !== "plasticity" || !entry.taskTitle) {
      continue;
    }

    const taskKey = entry.taskId ?? entry.taskTitle;
    const existingSummary = taskMap.get(taskKey);

    if (existingSummary) {
      existingSummary.seconds += entry.seconds;
      continue;
    }

    taskMap.set(taskKey, {
      taskId: entry.taskId ?? null,
      taskTitle: entry.taskTitle,
      seconds: entry.seconds,
    });
  }

  return Array.from(taskMap.values()).sort(
    (firstTask, secondTask) => secondTask.seconds - firstTask.seconds,
  );
}

export async function readPlasticityStats(supabase: SupabaseClient) {
  const [workSessionsResult, recoverySessionsResult] = await Promise.all([
    supabase
      .from("work_sessions")
      .select("id,task_id,task_title,timer_name,duration_seconds,completed_at")
      .order("completed_at", { ascending: false }),
    supabase
      .from("recovery_sessions")
      .select("id,activity_type,timer_name,duration_seconds,completed_at")
      .order("completed_at", { ascending: false }),
  ]);

  if (workSessionsResult.error) {
    throw new Error(workSessionsResult.error.message);
  }

  if (recoverySessionsResult.error) {
    throw new Error(recoverySessionsResult.error.message);
  }

  return [
    ...((workSessionsResult.data ?? []) as WorkSessionRow[]).map(
      mapWorkSession,
    ),
    ...((recoverySessionsResult.data ?? []) as RecoverySessionRow[]).map(
      mapRecoverySession,
    ),
  ].sort(
    (firstEntry, secondEntry) =>
      new Date(secondEntry.createdAt).getTime() -
      new Date(firstEntry.createdAt).getTime(),
  );
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

function mapWorkSession(row: WorkSessionRow): PlasticityStatEntry {
  return {
    id: row.id,
    type: "plasticity",
    seconds: row.duration_seconds,
    createdAt: row.completed_at,
    taskId: row.task_id,
    taskTitle: row.task_title ?? row.timer_name,
  };
}

function mapRecoverySession(row: RecoverySessionRow): PlasticityStatEntry {
  return {
    id: row.id,
    type: row.activity_type,
    seconds: row.duration_seconds,
    createdAt: row.completed_at,
  };
}

function formatType(type: PlasticityStatType) {
  if (type === "yoga-nidra") {
    return "Yoga Nidra";
  }

  if (type === "walk") {
    return "Spaziergang";
  }

  if (type === "meditation") {
    return "Meditation";
  }

  return "Plasticity";
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

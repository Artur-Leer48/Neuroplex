"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getScopedStorageKey } from "@/lib/scoped-storage";

const STORAGE_KEY = "neuroplex:quests";
const DAY_STORAGE_KEY = "neuroplex:quest-days";

export type QuestType = "Task" | "Wiederholung";

export type QuestItem = {
  id: string;
  title: string;
  type: QuestType;
  sourceId: string | null;
  sourceDate: string | null;
  isDone: boolean;
  createdAt: string;
  completedAt: string | null;
};

export type QuestDayObject = {
  date: string;
  quests: QuestItem[];
  addedQuests: QuestItem[];
  completedQuests: QuestItem[];
  updatedAt: string;
};

export function readQuests() {
  if (typeof window === "undefined") {
    return [];
  }

  const rawQuests = window.localStorage.getItem(getScopedStorageKey(STORAGE_KEY));

  if (!rawQuests) {
    return [];
  }

  try {
    const parsedQuests = JSON.parse(rawQuests);

    if (!Array.isArray(parsedQuests)) {
      return [];
    }

    return parsedQuests.filter(isQuestItem);
  } catch {
    return [];
  }
}

export function writeQuests(quests: QuestItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getScopedStorageKey(STORAGE_KEY),
    JSON.stringify(quests),
  );
}

export function recordQuestDay(quests: QuestItem[], date = getLocalDate()) {
  const now = new Date().toISOString();
  const existingDay = readQuestDay(date);
  const addedQuestMap = new Map(
    existingDay.addedQuests.map((quest) => [quest.id, quest]),
  );
  const completedQuestMap = new Map(
    existingDay.completedQuests.map((quest) => [quest.id, quest]),
  );

  quests.forEach((quest) => {
    addedQuestMap.set(quest.id, quest);

    if (quest.isDone) {
      completedQuestMap.set(quest.id, quest);
    }
  });

  const nextDay: QuestDayObject = {
    date,
    quests,
    addedQuests: Array.from(addedQuestMap.values()),
    completedQuests: Array.from(completedQuestMap.values()),
    updatedAt: now,
  };

  writeQuestDay(nextDay);

  return nextDay;
}

export async function syncQuestDayToDatabase(
  supabase: SupabaseClient,
  quests: QuestItem[],
  date = getLocalDate(),
) {
  const dayObject = recordQuestDay(quests, date);
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user) {
    return { dayObject, error: userError };
  }

  const { error } = await supabase.from("quest_days").upsert(
    {
      user_id: data.user.id,
      quest_date: date,
      day_object: dayObject,
      updated_at: dayObject.updatedAt,
    },
    {
      onConflict: "user_id,quest_date",
    },
  );

  return { dayObject, error };
}

export function createQuest(title: string): QuestItem {
  return {
    id: crypto.randomUUID(),
    title,
    type: "Task",
    sourceId: null,
    sourceDate: null,
    isDone: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function createReviewQuest(
  topicId: string,
  topicTitle: string,
  date: string,
): QuestItem {
  return {
    id: `review:${topicId}:${date}`,
    title: topicTitle,
    type: "Wiederholung",
    sourceId: topicId,
    sourceDate: date,
    isDone: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

function readQuestDay(date: string): QuestDayObject {
  const fallbackDay: QuestDayObject = {
    date,
    quests: [],
    addedQuests: [],
    completedQuests: [],
    updatedAt: new Date().toISOString(),
  };

  if (typeof window === "undefined") {
    return fallbackDay;
  }

  const rawDays = window.localStorage.getItem(
    getScopedStorageKey(DAY_STORAGE_KEY),
  );

  if (!rawDays) {
    return fallbackDay;
  }

  try {
    const parsedDays = JSON.parse(rawDays);

    if (!parsedDays || typeof parsedDays !== "object") {
      return fallbackDay;
    }

    const day = (parsedDays as Record<string, unknown>)[date];

    if (!isQuestDayObject(day)) {
      return fallbackDay;
    }

    return day;
  } catch {
    return fallbackDay;
  }
}

function writeQuestDay(day: QuestDayObject) {
  if (typeof window === "undefined") {
    return;
  }

  const rawDays = window.localStorage.getItem(
    getScopedStorageKey(DAY_STORAGE_KEY),
  );
  const days =
    rawDays && typeof rawDays === "string"
      ? safeParseDayMap(rawDays)
      : {};

  days[day.date] = day;

  window.localStorage.setItem(
    getScopedStorageKey(DAY_STORAGE_KEY),
    JSON.stringify(days),
  );
}

function safeParseDayMap(rawDays: string) {
  try {
    const parsedDays = JSON.parse(rawDays);

    if (!parsedDays || typeof parsedDays !== "object") {
      return {};
    }

    return parsedDays as Record<string, QuestDayObject>;
  } catch {
    return {};
  }
}

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isQuestDayObject(value: unknown): value is QuestDayObject {
  if (!value || typeof value !== "object") {
    return false;
  }

  const day = value as Partial<QuestDayObject>;

  return (
    typeof day.date === "string" &&
    Array.isArray(day.quests) &&
    day.quests.every(isQuestItem) &&
    Array.isArray(day.addedQuests) &&
    day.addedQuests.every(isQuestItem) &&
    Array.isArray(day.completedQuests) &&
    day.completedQuests.every(isQuestItem) &&
    typeof day.updatedAt === "string"
  );
}

function isQuestItem(value: unknown): value is QuestItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const quest = value as Partial<QuestItem>;

  return (
    typeof quest.id === "string" &&
    typeof quest.title === "string" &&
    (quest.type === "Task" || quest.type === "Wiederholung") &&
    (quest.sourceId === null || typeof quest.sourceId === "string") &&
    (quest.sourceDate === null || typeof quest.sourceDate === "string") &&
    typeof quest.isDone === "boolean" &&
    typeof quest.createdAt === "string" &&
    (quest.completedAt === null || typeof quest.completedAt === "string")
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/app/app-header";
import { hasDemoOrSupabaseSession } from "@/lib/demo-auth";
import {
  getTopicReviewState,
  readLearningTopics,
  type LearningTopic,
} from "@/lib/learning";
import {
  createQuest,
  createReviewQuest,
  recordQuestDay,
  readQuests,
  syncQuestDayToDatabase,
  writeQuests,
  type QuestItem,
} from "@/lib/quests";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function QuestsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draggedQuestId, setDraggedQuestId] = useState<string | null>(null);
  const [syncQuestDays, setSyncQuestDays] = useState(false);

  const persistQuests = useCallback(
    (nextQuests: QuestItem[], shouldSyncQuestDays = syncQuestDays) => {
      writeQuests(nextQuests);

      if (!shouldSyncQuestDays) {
        recordQuestDay(nextQuests);
        return;
      }

      void syncQuestDayToDatabase(supabaseBrowser, nextQuests).then(
        ({ error }) => {
          if (error) {
            console.warn("Quest day sync failed", error);
          }
        },
      );
    },
    [syncQuestDays],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
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

      const savedQuests = readQuests();
      const topics = readLearningTopics();
      const nextQuests = addDueReviewQuests(savedQuests, topics);
      const shouldSyncQuestDays = !isDemo && Boolean(session);
      setQuests(nextQuests);
      setSyncQuestDays(shouldSyncQuestDays);
      persistQuests(nextQuests, shouldSyncQuestDays);
      setIsLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [persistQuests, router]);

  const openQuestCount = useMemo(
    () => quests.filter((quest) => !quest.isDone).length,
    [quests],
  );

  function updateQuests(nextQuests: QuestItem[]) {
    setQuests(nextQuests);
    persistQuests(nextQuests);
  }

  function addQuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draftTitle.trim();

    if (!title) {
      return;
    }

    updateQuests([...quests, createQuest(title)]);
    setDraftTitle("");
  }

  function toggleQuest(questId: string) {
    updateQuests(
      quests.map((quest) =>
        quest.id === questId
          ? {
              ...quest,
              isDone: !quest.isDone,
              completedAt: quest.isDone ? null : new Date().toISOString(),
            }
          : quest,
      ),
    );
  }

  function moveQuestToTarget(targetQuestId: string) {
    if (!draggedQuestId || draggedQuestId === targetQuestId) {
      setDraggedQuestId(null);
      return;
    }

    const questIndex = quests.findIndex((quest) => quest.id === draggedQuestId);
    const targetIndex = quests.findIndex((quest) => quest.id === targetQuestId);

    if (questIndex < 0 || targetIndex < 0) {
      setDraggedQuestId(null);
      return;
    }

    const nextQuests = [...quests];
    const [quest] = nextQuests.splice(questIndex, 1);
    nextQuests.splice(targetIndex, 0, quest);
    updateQuests(nextQuests);
    setDraggedQuestId(null);
  }

  function clearDoneQuests() {
    updateQuests(quests.filter((quest) => !quest.isDone));
  }

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
        <AppHeader title="Quests" />

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Heute
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                {openQuestCount} offene Quests
              </h2>
            </div>

            {quests.some((quest) => quest.isDone) && (
              <button
                type="button"
                onClick={clearDoneQuests}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold transition hover:border-zinc-950"
              >
                Clear done
              </button>
            )}
          </div>

          <form
            onSubmit={addQuest}
            className="mt-5 grid grid-cols-[1fr_auto] gap-3"
          >
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Neue Quest"
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-950"
            />
            <button
              type="submit"
              className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Add
            </button>
          </form>
        </div>

        <div className="mt-6">
          {quests.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
              Keine Quests geplant.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              {quests.map((quest) => (
                <QuestRow
                  key={quest.id}
                  quest={quest}
                  isDragging={draggedQuestId === quest.id}
                  onDragStart={() => setDraggedQuestId(quest.id)}
                  onDragEnd={() => setDraggedQuestId(null)}
                  onDrop={() => moveQuestToTarget(quest.id)}
                  onToggle={() => toggleQuest(quest.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

type QuestRowProps = {
  quest: QuestItem;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onToggle: () => void;
};

function QuestRow({
  quest,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onToggle,
}: QuestRowProps) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", quest.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={`grid cursor-grab grid-cols-[auto_auto_1fr] items-center gap-3 border-b border-zinc-100 px-3 py-2 transition last:border-b-0 active:cursor-grabbing ${
        quest.isDone ? "opacity-60" : ""
      } ${isDragging ? "bg-zinc-100" : "bg-white hover:bg-zinc-50"}`}
    >
      <span
        aria-label="Quest verschieben"
        className="select-none text-sm font-semibold text-zinc-400"
      >
        ::
      </span>

      <button
        type="button"
        onClick={onToggle}
        aria-label={quest.isDone ? "Quest wieder oeffnen" : "Quest abschliessen"}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-sm font-semibold"
      >
        {quest.isDone ? "x" : ""}
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`truncate text-sm font-semibold ${
              quest.isDone ? "line-through" : ""
            }`}
          >
            {quest.title}
          </p>
          <span
            className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              quest.type === "Wiederholung"
                ? "bg-sky-100 text-sky-800"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {quest.type}
          </span>
        </div>
        {quest.sourceDate && (
          <p className="mt-1 text-xs font-medium text-zinc-500">
            Faellig: {formatDate(quest.sourceDate)}
          </p>
        )}
      </div>
    </div>
  );
}

function addDueReviewQuests(
  quests: QuestItem[],
  topics: LearningTopic[],
): QuestItem[] {
  const dueTopics = topics.filter((topic) => {
    const state = getTopicReviewState(topic);
    return state === "today" || state === "overdue";
  });
  const existingReviewKeys = new Set(
    quests
      .filter((quest) => quest.type === "Wiederholung")
      .map((quest) => `${quest.sourceId}:${quest.sourceDate}`),
  );
  const reviewQuests = dueTopics
    .filter(
      (topic) =>
        !existingReviewKeys.has(`${topic.id}:${topic.schedule.nextReviewDate}`),
    )
    .map((topic) =>
      createReviewQuest(topic.id, topic.title, topic.schedule.nextReviewDate),
    );

  return [...reviewQuests, ...quests];
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

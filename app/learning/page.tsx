"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppHeader } from "@/app/app-header";
import { hasDemoOrSupabaseSession, isDemoMode } from "@/lib/demo-auth";
import {
  getClampedReviewRepetitionCount,
  getProjectedReviews,
  getTopicReviewState,
  createLearningTopic,
  readLearningTopics,
  toDateInputValue,
  writeLearningTopics,
  type LearningResource,
  type LearningResourceDraft,
  type LearningResourceFile,
  type LearningTopic,
  type LearningTopicDraft,
} from "@/lib/learning";
import { supabaseBrowser } from "@/lib/supabase-browser";

import {
  ReviewCalendar,
  TodayReviews,
  TopicForm,
  TopicList,
  TopicOverviewOverlay,
  buildResource,
} from "./components";

export default function LearningPage() {
  const router = useRouter();
  const calendarSectionRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week">(
    "month",
  );
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [message, setMessage] = useState<string | null>(null);

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

      const savedTopics = readLearningTopics();
      const params = new URLSearchParams(window.location.search);
      const today = toDateInputValue(new Date());
      const shouldSeedDueReview = params.get("seed") === "due-review";
      const hasSeedTopic = savedTopics.some(
        (topic) =>
          topic.title === "Test Review Heute" &&
          topic.schedule.nextReviewDate === today,
      );
      const nextTopics =
        shouldSeedDueReview && !hasSeedTopic
          ? [createDueReviewSeedTopic(today), ...savedTopics]
          : savedTopics;

      setTopics(nextTopics);
      setSelectedTopicId(nextTopics[0]?.id ?? null);

      if (shouldSeedDueReview) {
        setCalendarDate(parseDateInputValue(today));
        setMessage(
          hasSeedTopic
            ? "Test-Review für heute ist bereits vorhanden."
            : "Test-Review für heute angelegt.",
        );
      }

      setIsLoading(false);
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    writeLearningTopics(topics);
  }, [isLoading, topics]);

  useEffect(() => {
    if (isLoading || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("panel") === "calendar") {
      calendarSectionRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }
  }, [isLoading]);

  const openTopic = useMemo(
    () => topics.find((topic) => topic.id === openTopicId) ?? null,
    [openTopicId, topics],
  );

  const summary = useMemo(() => {
    const todayCount = topics.filter(
      (topic) => getTopicReviewState(topic) === "today",
    ).length;
    const overdueCount = topics.filter(
      (topic) => getTopicReviewState(topic) === "overdue",
    ).length;

    return {
      todayCount,
      overdueCount,
      activeTopics: topics.filter((topic) => getProjectedReviews(topic).length > 0)
        .length,
    };
  }, [topics]);

  function createTopic(topic: LearningTopic) {
    setTopics((currentTopics) => [topic, ...currentTopics]);
    setSelectedTopicId(topic.id);
    setCalendarDate(parseDateInputValue(topic.schedule.nextReviewDate));
    setMessage(
      `Thema gespeichert. Die erste Wiederholung ist am ${formatDisplayDate(
        topic.schedule.nextReviewDate,
      )} geplant.`,
    );
  }

  function createCalendarTopic(
    draft: LearningTopicDraft,
    resourceDraft: LearningResourceDraft | null,
  ) {
    const topic = createLearningTopic(draft);
    const calendarTopic: LearningTopic = {
      ...topic,
      resources: resourceDraft
        ? [buildResource(topic.id, resourceDraft, null)]
        : topic.resources,
      schedule: {
        ...topic.schedule,
        nextReviewDate: draft.startDate,
      },
    };

    setTopics((currentTopics) => [calendarTopic, ...currentTopics]);
    setSelectedTopicId(calendarTopic.id);
    setCalendarDate(parseDateInputValue(draft.startDate));
    setMessage(`Eintrag am ${formatDisplayDate(draft.startDate)} erstellt.`);
  }

  function selectTopic(topicId: string) {
    const topic = topics.find((currentTopic) => currentTopic.id === topicId);
    setSelectedTopicId(topicId);

    if (topic) {
      setCalendarDate(parseDateInputValue(topic.schedule.nextReviewDate));
    }
  }

  function openTopicOverlay(topicId: string) {
    selectTopic(topicId);
    setOpenTopicId(topicId);
  }

  async function addResource(
    topicId: string,
    draft: LearningResourceDraft,
    file: File | null,
  ) {
    let uploadedFile: LearningResourceFile | null = null;
    let uploadErrorMessage: string | null = null;

    if (file) {
      try {
        uploadedFile = await uploadLearningResourceFile(topicId, file);
      } catch (error) {
        uploadErrorMessage =
          error instanceof Error
            ? error.message
            : "Datei konnte nicht gespeichert werden.";
      }
    }

    setTopics((currentTopics) =>
      currentTopics.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              resources: [
                buildResource(topicId, draft, uploadedFile),
                ...topic.resources,
              ],
              updatedAt: new Date().toISOString(),
            }
          : topic,
      ),
    );
    setMessage(
      uploadErrorMessage
        ? `Ressource hinzugefuegt. ${uploadErrorMessage}`
        : uploadedFile
        ? "Ressource hinzugefuegt und Datei in Postgres gespeichert."
        : "Ressource hinzugefuegt.",
    );
  }

  function updateResource(
    topicId: string,
    resourceId: string,
    draft: LearningResourceDraft,
  ) {
    setTopics((currentTopics) =>
      currentTopics.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              resources: topic.resources.map((resource) =>
                resource.id === resourceId
                  ? {
                      ...resource,
                      ...draft,
                      title: draft.title.trim() || resource.title,
                      reference: draft.reference.trim(),
                      summary: draft.summary.trim(),
                      locator: draft.locator.trim(),
                    }
                  : resource,
              ),
              updatedAt: new Date().toISOString(),
            }
          : topic,
      ),
    );
    setMessage("Ressource aktualisiert.");
  }

  async function openResource(
    resource: LearningResource,
    mode: "open" | "download" = "open",
  ) {
    if (resource.file) {
      const openedWindow =
        mode === "open" ? window.open("about:blank", "_blank") : null;

      try {
        await openLearningResourceFile(resource.file, mode, openedWindow);
      } catch (error) {
        openedWindow?.close();
        setMessage(
          error instanceof Error
            ? error.message
            : "Datei konnte nicht geoeffnet werden.",
        );
      }
      return;
    }

    const url = normalizeResourceUrl(resource.reference);

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function updateReviewRepetitionCount(topicId: string, count: number) {
    setTopics((currentTopics) =>
      currentTopics.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              reviewRepetitionCount: getClampedReviewRepetitionCount(count),
              deletedReviewKeys: [],
              schedule: {
                ...topic.schedule,
                isCompleted: false,
              },
              updatedAt: new Date().toISOString(),
            }
          : topic,
      ),
    );
  }

  function deleteProjectedReview(topicId: string, reviewKey: string) {
    setTopics((currentTopics) =>
      currentTopics.map((topic) => {
        if (topic.id !== topicId) {
          return topic;
        }

        const deletedReviewKeys = Array.from(
          new Set([...(topic.deletedReviewKeys ?? []), reviewKey]),
        );
        const nextTopic = {
          ...topic,
          deletedReviewKeys,
          updatedAt: new Date().toISOString(),
        };

        return {
          ...nextTopic,
          schedule: {
            ...nextTopic.schedule,
            isCompleted: getProjectedReviews(nextTopic).length === 0,
          },
        };
      }),
    );
    setMessage("Wiederholung geloescht.");
  }

  function deleteAllProjectedReviews(topicId: string) {
    setTopics((currentTopics) =>
      currentTopics.map((topic) => {
        if (topic.id !== topicId) {
          return topic;
        }

        const reviewKeys = getProjectedReviews(topic).map(
          (review) => review.reviewKey,
        );

        return {
          ...topic,
          deletedReviewKeys: Array.from(
            new Set([...(topic.deletedReviewKeys ?? []), ...reviewKeys]),
          ),
          schedule: {
            ...topic.schedule,
            isCompleted: true,
          },
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    setMessage("Alle geplanten Wiederholungen geloescht.");
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef6ff_0,#fafafa_34%,#f4f4f5_100%)] px-4 py-10 text-zinc-950">
      <section className="mx-auto w-full max-w-7xl">
        <AppHeader title="Kalender" />

        <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-200/60 backdrop-blur sm:grid-cols-3">
          <SummaryTile
            label="Geplante Wiederholungen heute"
            value={summary.todayCount}
            hasDivider
          />
          <SummaryTile
            label="Ueberfaellige Wiederholungen"
            value={summary.overdueCount}
            hasDivider
          />
          <SummaryTile label="Aktive Vorhaben" value={summary.activeTopics} />
        </div>

        {message && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {message}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
          <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <TodayReviews
              topics={topics}
              selectedTopicId={selectedTopicId}
              onSelectTopic={selectTopic}
            />
            <TopicList
              topics={topics}
              selectedTopicId={selectedTopicId}
              onSelectTopic={selectTopic}
              onOpenTopic={openTopicOverlay}
            />
            <TopicForm onCreateTopic={createTopic} />
          </div>

          <div ref={calendarSectionRef} className="min-w-0 scroll-mt-6 space-y-6">
            <ReviewCalendar
              topics={topics}
              selectedTopicId={selectedTopicId}
              viewMode={calendarViewMode}
              calendarDate={calendarDate}
              onSelectTopic={selectTopic}
              onOpenTopic={openTopicOverlay}
              onCreateTopic={createCalendarTopic}
              onChangeViewMode={setCalendarViewMode}
              onChangeCalendarDate={setCalendarDate}
            />
          </div>
        </div>

        <TopicOverviewOverlay
          topic={openTopic}
          onClose={() => setOpenTopicId(null)}
          onAddResource={addResource}
          onUpdateResource={updateResource}
          onOpenResource={openResource}
          onUpdateReviewRepetitionCount={updateReviewRepetitionCount}
          onDeleteProjectedReview={deleteProjectedReview}
          onDeleteAllProjectedReviews={deleteAllProjectedReviews}
        />
      </section>
    </main>
  );
}

type SummaryTileProps = {
  label: string;
  value: number | string;
  hasDivider?: boolean;
};

function SummaryTile({ label, value, hasDivider = false }: SummaryTileProps) {
  return (
    <div
      className={`relative p-5 ${
        hasDivider
          ? "after:absolute after:bottom-0 after:left-5 after:right-5 after:h-px after:bg-zinc-200 sm:after:bottom-5 sm:after:left-auto sm:after:right-0 sm:after:top-5 sm:after:h-auto sm:after:w-px"
          : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function parseDateInputValue(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDisplayDate(value: string) {
  return parseDateInputValue(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function createDueReviewSeedTopic(today: string): LearningTopic {
  const now = new Date().toISOString();
  const topicId = crypto.randomUUID();

  return {
    id: topicId,
    title: "Test Review Heute",
    description: "Testthema für die Plasticity Review-Vorschau.",
    tags: ["test"],
    goal: "Verstehen",
    startDate: today,
    deadline: null,
    resources: [],
    reviewHistory: [],
    schedule: {
      topicId,
      currentIntervalIndex: 0,
      nextReviewDate: today,
      isCompleted: false,
    },
    reviewInterval: "spaced",
    reviewRepetitionCount: 6,
    entryType: "Vorhaben",
    deckNames: [],
    deletedReviewKeys: [],
    recallQuestions: [
      "Was ist die Kernidee?",
      "Was kannst du ohne Notizen wiedergeben?",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

async function uploadLearningResourceFile(
  topicId: string,
  file: File,
): Promise<LearningResourceFile> {
  if (isDemoMode()) {
    throw new Error("Dateiupload ist im Demo-Modus nicht verfuegbar.");
  }

  const { data: userData, error: userError } =
    await supabaseBrowser.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("Datei konnte nicht gespeichert werden: keine Session.");
  }

  const fileBytes = await file.arrayBuffer();
  const { data, error } = await supabaseBrowser
    .from("learning_resource_files")
    .insert({
      user_id: userData.user.id,
      topic_id: topicId,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      file_bytes: arrayBufferToByteaHex(fileBytes),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Datei konnte nicht in Postgres gespeichert werden: ${
        error?.message ?? "unbekannter Fehler"
      }`,
    );
  }

  return {
    databaseId: data.id as string,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  };
}

async function openLearningResourceFile(
  file: LearningResourceFile,
  mode: "open" | "download",
  openedWindow: Window | null,
) {
  openedWindow?.document.write(
    "<!doctype html><title>Datei wird geladen...</title><body style=\"font-family:system-ui;padding:24px\">Datei wird geladen...</body>",
  );

  const { data, error } = await supabaseBrowser
    .from("learning_resource_files")
    .select("file_name,mime_type,file_bytes")
    .eq("id", file.databaseId)
    .single();

  if (error || !data) {
    throw new Error(
      `Datei konnte nicht aus Postgres geladen werden: ${
        error?.message ?? "unbekannter Fehler"
      }`,
    );
  }

  const bytes = byteaToUint8Array(data.file_bytes);
  const blob = new Blob([bytes], {
    type: (data.mime_type as string | null) || file.mimeType,
  });
  const objectUrl = URL.createObjectURL(blob);
  const fileName = (data.file_name as string | null) || file.name;

  if (mode === "download") {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    return;
  }

  const targetWindow = openedWindow ?? window.open("about:blank", "_blank");

  if (!targetWindow) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Datei konnte nicht geoeffnet werden.");
  }

  targetWindow.document.open();
  targetWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(fileName)}</title>
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; background: #f4f4f5; color: #18181b; }
          header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; background: white; border-bottom: 1px solid #d4d4d8; }
          a { color: #18181b; font-weight: 700; text-decoration: none; border: 1px solid #d4d4d8; border-radius: 6px; padding: 8px 12px; background: white; }
          iframe { width: 100vw; height: calc(100vh - 58px); border: 0; background: white; }
        </style>
      </head>
      <body>
        <header>
          <strong>${escapeHtml(fileName)}</strong>
          <a href="${objectUrl}" download="${escapeHtml(fileName)}">Download</a>
        </header>
        <iframe src="${objectUrl}" title="${escapeHtml(fileName)}"></iframe>
      </body>
    </html>
  `);
  targetWindow.document.close();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function arrayBufferToByteaHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let hex = "\\x";

  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex;
}

function byteaToUint8Array(value: unknown) {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value as number[]);
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  ) {
    return new Uint8Array((value as { data: number[] }).data);
  }

  if (typeof value !== "string") {
    throw new Error("Dateiformat aus Postgres konnte nicht gelesen werden.");
  }

  if (value.startsWith("\\x")) {
    const hex = value.slice(2);
    const bytes = new Uint8Array(hex.length / 2);

    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    }

    return bytes;
  }

  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function normalizeResourceUrl(reference: string) {
  const trimmedReference = reference.trim();

  if (!trimmedReference) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedReference)) {
    return trimmedReference;
  }

  if (!/[./]/.test(trimmedReference)) {
    return `https://www.${trimmedReference.toLowerCase()}.com`;
  }

  return `https://${trimmedReference}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

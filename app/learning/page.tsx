"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  calculateLearningStreak,
  getClampedReviewRepetitionCount,
  getTopicReviewState,
  readLearningTopics,
  writeLearningTopics,
  type LearningResource,
  type LearningResourceDraft,
  type LearningResourceFile,
  type LearningTopic,
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
      const { data, error } = await supabaseBrowser.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      const savedTopics = readLearningTopics();
      setTopics(savedTopics);
      setSelectedTopicId(savedTopics[0]?.id ?? null);
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
      activeTopics: topics.filter((topic) => !topic.schedule.isCompleted)
        .length,
      streak: calculateLearningStreak(topics),
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
              updatedAt: new Date().toISOString(),
            }
          : topic,
      ),
    );
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
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
              Neuroplex
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Learning Topics
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/plasticity"
              className="flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
            >
              Plasticity
            </Link>
            <Link
              href="/dashboard"
              className="flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile label="Reviews heute" value={summary.todayCount} />
          <SummaryTile label="Ueberfaellig" value={summary.overdueCount} />
          <SummaryTile label="Aktive Themen" value={summary.activeTopics} />
          <SummaryTile label="Lernstreak" value={`${summary.streak} Tage`} />
        </div>

        {message && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {message}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
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

          <div className="space-y-6">
            <ReviewCalendar
              topics={topics}
              selectedTopicId={selectedTopicId}
              viewMode={calendarViewMode}
              calendarDate={calendarDate}
              onSelectTopic={selectTopic}
              onOpenTopic={openTopicOverlay}
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
        />
      </section>
    </main>
  );
}

type SummaryTileProps = {
  label: string;
  value: number | string;
};

function SummaryTile({ label, value }: SummaryTileProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
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

async function uploadLearningResourceFile(
  topicId: string,
  file: File,
): Promise<LearningResourceFile> {
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

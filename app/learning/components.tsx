"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  REVIEW_INTERVAL_DAYS,
  completeReview,
  countRepeatedDays,
  createLearningResource,
  createLearningTopic,
  getProjectedReviews,
  getTopicReviewState,
  toDateInputValue,
  type LearningEntryType,
  type LearningResource,
  type LearningResourceDraft,
  type LearningResourceFile,
  type LearningTopic,
  type LearningTopicDraft,
  type ResourceStatus,
  type ResourceType,
  type ReviewInterval,
  type ReviewRating,
} from "@/lib/learning";

const RESOURCE_TYPES: ResourceType[] = [
  "Buch",
  "Artikel",
  "Video",
  "Kurs",
  "Podcast",
  "Eigene Notiz",
  "Datei",
  "Link",
];
const RESOURCE_STATUS: ResourceStatus[] = [
  "offen",
  "in Bearbeitung",
  "abgeschlossen",
];
const MAX_RESOURCE_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_RESOURCE_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "text/csv",
  "text/markdown",
  "text/plain",
]);
const BLOCKED_RESOURCE_FILE_EXTENSIONS = new Set([
  "bat",
  "cmd",
  "com",
  "exe",
  "html",
  "hta",
  "js",
  "mjs",
  "msi",
  "ps1",
  "scr",
  "sh",
  "vbs",
]);
const RESOURCE_FILE_ACCEPT = [
  ".csv",
  ".doc",
  ".docx",
  ".gif",
  ".jpeg",
  ".jpg",
  ".md",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".txt",
  ".wav",
  ".webp",
  ".xls",
  ".xlsx",
].join(",");
const REVIEW_INTERVALS: Array<{
  value: ReviewInterval;
  label: string;
}> = [
  { value: "spaced", label: "Spaced Repetition" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];
const ENTRY_TYPES: LearningEntryType[] = ["Vorhaben", "Spaced Repetition"];

type TopicFormProps = {
  onCreateTopic: (topic: LearningTopic) => void;
};

export function TopicForm({ onCreateTopic }: TopicFormProps) {
  const today = toDateInputValue(new Date());
  const [draft, setDraft] = useState<LearningTopicDraft>({
    title: "",
    description: "",
    tags: "",
    goal: "Projekt",
    startDate: today,
    deadline: getDeadlineForRepetitionCount(today, 6, "spaced"),
    reviewInterval: "spaced",
    reviewRepetitionCount: "6",
    entryType: "Vorhaben",
    deckNames: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  function submitTopic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Bezeichnung ist erforderlich.");
      return;
    }

    onCreateTopic(createLearningTopic(normalizeTopicPlan(draft)));
    const resetStartDate = toDateInputValue(new Date());
    setDraft({
      title: "",
      description: "",
      tags: "",
      goal: "Projekt",
      startDate: resetStartDate,
      deadline: getDeadlineForRepetitionCount(resetStartDate, 6, "spaced"),
      reviewInterval: "spaced",
      reviewRepetitionCount: "6",
      entryType: "Vorhaben",
      deckNames: "",
    });
    setError(null);
    setIsDescriptionOpen(false);
  }

  return (
    <form
      onSubmit={submitTopic}
      className="rounded-xl border border-zinc-200/80 bg-white/95 p-5 shadow-sm shadow-zinc-200/60"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Neues Vorhaben
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <label className="block text-sm font-medium text-zinc-700">
          Bezeichnung
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          />
        </label>

        {isDescriptionOpen ? (
          <label className="block text-sm font-medium text-zinc-700">
            Beschreibung
            <textarea
              autoFocus
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setIsDescriptionOpen(true)}
            className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-left text-sm font-medium text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Klicken um Beschreibung hinzuzufuegen
          </button>
        )}

        <label className="block text-sm font-medium text-zinc-700">
          Typ
          <select
            value={draft.entryType ?? "Vorhaben"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                entryType: event.target.value as LearningEntryType,
              }))
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          >
            {ENTRY_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        {(draft.entryType ?? "Vorhaben") === "Spaced Repetition" && (
          <label className="block text-sm font-medium text-zinc-700">
            Decks
            <input
              value={draft.deckNames ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  deckNames: event.target.value,
                }))
              }
              placeholder="Neuroanatomie, Mathe Beweise"
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            />
          </label>
        )}

        <label className="block text-sm font-medium text-zinc-700">
          Projekt
          <input
            value={draft.tags}
            onChange={(event) =>
              setDraft((current) => ({ ...current, tags: event.target.value }))
            }
            placeholder="Leer lassen für eigenes Projekt"
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Startdatum
            <GermanDateInput
              key={`start-${draft.startDate}`}
              value={draft.startDate}
              onChange={(value) =>
                setDraft((current) =>
                  applyTopicPlanFromRepetitionCount({
                    ...current,
                    startDate: value,
                  }),
                )
              }
              required
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Enddatum
            <GermanDateInput
              key={`deadline-${draft.deadline}`}
              value={draft.deadline}
              onChange={(value) =>
                setDraft((current) =>
                  applyTopicPlanFromDeadline({
                    ...current,
                    deadline: value,
                  }),
                )
              }
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Intervall
            <select
              value={draft.reviewInterval}
              onChange={(event) =>
                setDraft((current) =>
                  applyTopicPlanFromRepetitionCount({
                    ...current,
                    reviewInterval: event.target.value as ReviewInterval,
                  }),
                )
              }
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            >
              {REVIEW_INTERVALS.map((interval) => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Wiederholungen
            <input
              type="number"
              min={1}
              max={36}
              value={draft.reviewRepetitionCount}
              onChange={(event) =>
                setDraft((current) =>
                  applyTopicPlanFromRepetitionCount({
                    ...current,
                    reviewRepetitionCount: event.target.value,
                  }),
                )
              }
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            />
          </label>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}

      <button
        type="submit"
        className="mt-5 flex h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        Thema speichern
      </button>
    </form>
  );
}

type TodayReviewsProps = {
  topics: LearningTopic[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
};

export function TodayReviews({
  topics,
  selectedTopicId,
  onSelectTopic,
}: TodayReviewsProps) {
  const dueTopics = topics
    .filter((topic) => {
      const state = getTopicReviewState(topic);
      return state === "today" || state === "overdue";
    })
    .sort((firstTopic, secondTopic) =>
      firstTopic.schedule.nextReviewDate.localeCompare(
        secondTopic.schedule.nextReviewDate,
      ),
    );

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/95 p-5 shadow-sm shadow-zinc-200/60">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Heute faellig
      </p>
      <div className="mt-4 space-y-2">
        {dueTopics.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 p-4 text-sm text-zinc-600">
            Heute ist nichts faellig.
          </div>
        ) : (
          dueTopics.map((topic) => {
            const state = getTopicReviewState(topic);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onSelectTopic(topic.id)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                  selectedTopicId === topic.id
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <span className="block text-sm font-semibold">{topic.title}</span>
                <span
                  className={`mt-1 block text-xs ${
                    selectedTopicId === topic.id
                      ? "text-zinc-200"
                      : state === "overdue"
                        ? "text-red-700"
                        : "text-emerald-700"
                  }`}
                >
                  {state === "overdue" ? "Ueberfaellig" : "Heute"} ·{" "}
                  {formatDisplayDate(topic.schedule.nextReviewDate)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

type ResourceListProps = {
  topic: LearningTopic | null;
  onAddResource: (
    topicId: string,
    resource: LearningResourceDraft,
    file: File | null,
  ) => Promise<void> | void;
  onUpdateResource: (
    topicId: string,
    resourceId: string,
    resource: LearningResourceDraft,
  ) => void;
  onOpenResource: (
    resource: LearningResource,
    mode?: "open" | "download",
  ) => Promise<void> | void;
};

export function ResourceList({
  topic,
  onAddResource,
  onUpdateResource,
  onOpenResource,
}: ResourceListProps) {
  const [draft, setDraft] = useState<LearningResourceDraft>({
    type: "Artikel",
    title: "",
    reference: "",
    summary: "",
    locator: "",
    status: "offen",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null,
  );
  const [editDraft, setEditDraft] = useState<LearningResourceDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectResourceFile(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const fileError = validateResourceFile(file);

    if (fileError) {
      setSelectedFile(null);
      setFileInputKey((currentKey) => currentKey + 1);
      setError(fileError);
      return;
    }

    setSelectedFile(file);
    setError(null);
  }

  function handleFileDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingFile(false);

    const file = event.dataTransfer.files[0] ?? null;
    selectResourceFile(file);
  }

  async function submitResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic) {
      setError("Waehle zuerst ein Thema aus.");
      return;
    }

    const resourceTitle =
      draft.title.trim() ||
      getResourceTitleFromReference(draft.reference) ||
      selectedFile?.name ||
      "";

    if (!resourceTitle) {
      setError("Ressourcen-Titel oder URL ist erforderlich.");
      return;
    }

    await onAddResource(
      topic.id,
      {
        ...draft,
        title: resourceTitle,
        locator: "",
        type: selectedFile && draft.type !== "Link" ? "Datei" : draft.type,
      },
      selectedFile,
    );
    setDraft({
      type: "Artikel",
      title: "",
      reference: "",
      summary: "",
      locator: "",
      status: "offen",
    });
    setSelectedFile(null);
    setFileInputKey((currentKey) => currentKey + 1);
    setError(null);
  }

  function startEditingResource(resource: LearningResource) {
    setEditingResourceId(resource.id);
    setEditDraft({
      type: resource.type,
      title: resource.title,
      reference: resource.reference,
      summary: resource.summary,
      locator: resource.locator,
      status: resource.status,
    });
  }

  function saveEditedResource(resource: LearningResource) {
    if (!topic || !editDraft) {
      return;
    }

    const resourceTitle =
      editDraft.title.trim() ||
      getResourceTitleFromReference(editDraft.reference);

    if (!resourceTitle) {
      setError("Ressourcen-Titel oder URL ist erforderlich.");
      return;
    }

    onUpdateResource(topic.id, resource.id, {
      ...editDraft,
      title: resourceTitle,
      locator: "",
    });
    setEditingResourceId(null);
    setEditDraft(null);
    setError(null);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Ressourcen
      </p>

      {!topic ? (
        <p className="mt-4 text-sm text-zinc-600">
          Waehle ein Thema aus, um Ressourcen zu dokumentieren.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {topic.resources.length === 0 ? (
              <p className="text-sm text-zinc-600">
                Noch keine Ressourcen erfasst.
              </p>
            ) : (
              topic.resources.map((resource) => (
                <div
                  key={resource.id}
                  onDoubleClick={() => {
                    if (editingResourceId !== resource.id) {
                      void onOpenResource(resource, "open");
                    }
                  }}
                  className={`rounded-md border border-zinc-200 bg-zinc-50 p-3 ${
                    resource.reference || resource.file ? "cursor-pointer" : ""
                  }`}
                >
                  {editingResourceId === resource.id && editDraft ? (
                    <ResourceEditForm
                      draft={editDraft}
                      onChange={setEditDraft}
                      onCancel={() => {
                        setEditingResourceId(null);
                        setEditDraft(null);
                      }}
                      onSave={() => saveEditedResource(resource)}
                    />
                  ) : (
                    <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <ResourceFavicon reference={resource.reference} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-950">
                          {resource.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {resource.type} · {resource.status}
                        </p>
                        {resource.file && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {resource.file.name} · {formatBytes(resource.file.size)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {resource.reference && (
                    <p className="mt-2 break-words text-xs text-zinc-600">
                      {resource.reference}
                    </p>
                  )}
                  {resource.summary && (
                    <p className="mt-2 text-sm text-zinc-700">
                      {resource.summary}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(resource.reference || resource.file) && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onOpenResource(resource, "open");
                        }}
                        className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:border-zinc-950"
                      >
                        Oeffnen
                      </button>
                    )}
                    {resource.file && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onOpenResource(resource, "download");
                        }}
                        className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:border-zinc-950"
                      >
                        Download
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEditingResource(resource);
                      }}
                      className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:border-zinc-950"
                    >
                      Bearbeiten
                    </button>
                  </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={submitResource} className="mt-5 border-t border-zinc-200 pt-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                Typ
                <select
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      type: event.target.value as ResourceType,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Titel
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm font-medium text-zinc-700">
              URL oder Datei-Referenz
              <input
                value={draft.reference}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              />
            </label>

            <label className="mt-3 block text-sm font-medium text-zinc-700">
              Kurze Zusammenfassung
              <textarea
                value={draft.summary}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                rows={3}
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              />
            </label>

            <div className="mt-3">
              <label className="block text-sm font-medium text-zinc-700">
                Status
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as ResourceStatus,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                >
                  {RESOURCE_STATUS.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block text-sm font-medium text-zinc-700">
              Datei hochladen
              <span
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(false);
                }}
                onDrop={handleFileDrop}
                className={`mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-5 text-center transition ${
                  isDraggingFile
                    ? "border-zinc-950 bg-zinc-100"
                    : "border-zinc-300 bg-white hover:border-zinc-950"
                }`}
              >
                <span className="text-sm font-semibold text-zinc-900">
                  Datei hier ablegen oder auswaehlen
                </span>
                <span className="mt-1 text-xs text-zinc-500">
                  PDF, Office, Text, Bilder, Audio oder Video bis 25 MB
                </span>
                {selectedFile && (
                  <span className="mt-2 text-xs font-medium text-zinc-700">
                    {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </span>
                )}
                <input
                  key={fileInputKey}
                  type="file"
                  accept={RESOURCE_FILE_ACCEPT}
                  onChange={(event) =>
                    selectResourceFile(event.target.files?.[0] ?? null)
                  }
                  className="sr-only"
                />
              </span>
            </label>

            {error && (
              <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
            )}

            <button
              type="submit"
              className="mt-4 flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
            >
              Ressource hinzufuegen
            </button>
          </form>
        </>
      )}
    </div>
  );
}

type ResourceEditFormProps = {
  draft: LearningResourceDraft;
  onChange: React.Dispatch<React.SetStateAction<LearningResourceDraft | null>>;
  onCancel: () => void;
  onSave: () => void;
};

function ResourceEditForm({
  draft,
  onChange,
  onCancel,
  onSave,
}: ResourceEditFormProps) {
  const faviconUrl = getFaviconUrl(draft.reference);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Typ
          <select
            value={draft.type}
            onChange={(event) =>
              onChange((current) =>
                current
                  ? { ...current, type: event.target.value as ResourceType }
                  : current,
              )
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-zinc-700">
          Titel
          <input
            value={draft.title}
            onChange={(event) =>
              onChange((current) =>
                current ? { ...current, title: event.target.value } : current,
              )
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        URL oder Datei-Referenz
        {faviconUrl && (
          <span className="mt-2 flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
            <ResourceFavicon reference={draft.reference} />
            Icon erkannt
          </span>
        )}
        <input
          value={draft.reference}
          onChange={(event) =>
            onChange((current) =>
              current ? { ...current, reference: event.target.value } : current,
            )
          }
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Kurze Zusammenfassung
        <textarea
          value={draft.summary}
          onChange={(event) =>
            onChange((current) =>
              current ? { ...current, summary: event.target.value } : current,
            )
          }
          rows={3}
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
        />
      </label>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              onChange((current) =>
                current
                  ? {
                      ...current,
                      status: event.target.value as ResourceStatus,
                    }
                  : current,
              )
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          >
            {RESOURCE_STATUS.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          className="h-9 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

type ReviewCalendarProps = {
  topics: LearningTopic[];
  selectedTopicId: string | null;
  viewMode: "month" | "week";
  calendarDate: Date;
  onSelectTopic: (topicId: string) => void;
  onOpenTopic: (topicId: string) => void;
  onCreateTopic: (
    topicDraft: LearningTopicDraft,
    resourceDraft: LearningResourceDraft | null,
  ) => void;
  onChangeViewMode: (viewMode: "month" | "week") => void;
  onChangeCalendarDate: (date: Date) => void;
};

export function ReviewCalendar({
  topics,
  selectedTopicId,
  viewMode,
  calendarDate,
  onSelectTopic,
  onOpenTopic,
  onCreateTopic,
  onChangeViewMode,
  onChangeCalendarDate,
}: ReviewCalendarProps) {
  const [quickEntryDate, setQuickEntryDate] = useState<string | null>(null);
  const [quickEntryDraft, setQuickEntryDraft] = useState<LearningTopicDraft | null>(
    null,
  );
  const [quickResourceDraft, setQuickResourceDraft] =
    useState<LearningResourceDraft>({
      type: "Artikel",
      title: "",
      reference: "",
      summary: "",
      locator: "",
      status: "offen",
    });
  const days = useMemo(
    () =>
      viewMode === "month" ? getMonthDays(calendarDate) : getWeekDays(calendarDate),
    [calendarDate, viewMode],
  );
  const reviewEvents = useMemo(
    () => topics.flatMap((topic) => getProjectedReviews(topic)),
    [topics],
  );
  const todayKey = toDateInputValue(new Date());
  const visibleReviewCount = reviewEvents.filter((review) =>
    days.some((day) => toDateInputValue(day) === review.date),
  ).length;
  const dueReviewCount = reviewEvents.filter((review) => {
    const state = getReviewEventState(review.date, review.isCompleted);

    return state === "today" || state === "overdue";
  }).length;

  useEffect(() => {
    if (!quickEntryDate) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeQuickEntry();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [quickEntryDate]);

  function shiftCalendar(direction: number) {
    const nextDate = new Date(calendarDate);

    if (viewMode === "month") {
      nextDate.setMonth(nextDate.getMonth() + direction);
    } else {
      nextDate.setDate(nextDate.getDate() + direction * 7);
    }

    onChangeCalendarDate(nextDate);
  }

  function submitQuickEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quickEntryDate || !quickEntryDraft?.title.trim()) {
      return;
    }

    const resourceReference = quickResourceDraft.reference.trim();
    const resourceTitle =
      quickResourceDraft.title.trim() ||
      getResourceTitleFromReference(resourceReference) ||
      "";
    const nextResourceDraft =
      resourceTitle || resourceReference || quickResourceDraft.summary.trim()
        ? {
            ...quickResourceDraft,
            title: resourceTitle || "Ressource",
            locator: "",
          }
        : null;

    onCreateTopic(normalizeTopicPlan(quickEntryDraft), nextResourceDraft);
    closeQuickEntry();
  }

  function closeQuickEntry() {
    setQuickEntryDate(null);
    setQuickEntryDraft(null);
    setQuickResourceDraft({
      type: "Artikel",
      title: "",
      reference: "",
      summary: "",
      locator: "",
      status: "offen",
    });
  }

  function openQuickEntry(date: string) {
    setQuickEntryDate(date);
    setQuickEntryDraft({
      title: "",
      description: "",
      tags: "",
      goal: "Projekt",
      startDate: date,
      deadline: date,
      reviewInterval: "spaced",
      reviewRepetitionCount: "1",
      entryType: "Vorhaben",
      deckNames: "",
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/60">
      <div className="border-b border-zinc-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_72%)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Kalender
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                {calendarDate.toLocaleDateString("de-DE", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <span className="mb-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                {visibleReviewCount} Eintraege
              </span>
              {dueReviewCount > 0 && (
                <span className="mb-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                  {dueReviewCount} faellig
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Vorheriger Zeitraum"
              title="Zurueck"
              onClick={() => shiftCalendar(-1)}
              className="border-zinc-200 bg-white/80 text-zinc-700 shadow-xs hover:bg-white hover:text-zinc-950"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onChangeCalendarDate(new Date())}
              className="border-zinc-200 bg-white/80 px-4 text-zinc-900 shadow-xs hover:bg-white"
            >
              Heute
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Naechster Zeitraum"
              title="Weiter"
              onClick={() => shiftCalendar(1)}
              className="border-zinc-200 bg-white/80 text-zinc-700 shadow-xs hover:bg-white hover:text-zinc-950"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-zinc-200/80 bg-zinc-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-xs">
        {(["month", "week"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChangeViewMode(mode)}
              className={`h-8 rounded-md px-3 text-sm font-medium transition ${
                viewMode === mode
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-sky-50 hover:text-zinc-950"
            }`}
          >
            {mode === "month" ? "Monat" : "Woche"}
          </button>
        ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
          <CalendarLegend label="Heute" tone="emerald" />
          <CalendarLegend label="Ueberfaellig" tone="red" />
          <CalendarLegend label="Kommend" tone="sky" />
          <CalendarLegend label="Abgeschlossen" tone="zinc" />
        </div>
      </div>

      <div className="grid grid-cols-7 bg-zinc-100/70">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((dayLabel) => (
          <div
            key={dayLabel}
            className="border-b border-r border-zinc-200/80 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 last:border-r-0"
          >
            {dayLabel}
          </div>
        ))}

        {days.map((day) => {
          const dateKey = toDateInputValue(day);
          const dayReviews = reviewEvents.filter((review) => review.date === dateKey);
          const isOutsideMonth = day.getMonth() !== calendarDate.getMonth();
          const isToday = dateKey === todayKey;

          return (
            <div
              key={dateKey}
              onDoubleClick={() => {
                openQuickEntry(dateKey);
              }}
              className={`group min-h-32 border-b border-r border-zinc-200/80 p-2 transition hover:bg-sky-50/40 ${
                isOutsideMonth && viewMode === "month"
                  ? "bg-zinc-50/60 text-zinc-400"
                  : isToday
                    ? "bg-emerald-50/25 text-zinc-950"
                    : "bg-white text-zinc-950"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold ${
                    isToday
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-500 group-hover:text-zinc-950"
                  }`}
                >
                  {day.getDate()}
                </span>
                <span className="text-[11px] font-medium text-zinc-300 opacity-0 transition group-hover:opacity-100">
                  +
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {dayReviews.map((review) => {
                  const topic = topics.find(
                    (currentTopic) => currentTopic.id === review.topicId,
                  );
                  const state = getReviewEventState(review.date, review.isCompleted);

                  if (!topic) {
                    return null;
                  }

                  return (
                    <button
                      key={`${review.topicId}-${review.date}-${review.sequence}`}
                      type="button"
                      onClick={() => onSelectTopic(review.topicId)}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        onOpenTopic(review.topicId);
                      }}
                      className={`w-full rounded-md border px-2 py-1.5 text-left text-xs font-medium shadow-xs transition ${getCalendarEventClass(
                        state,
                        selectedTopicId === review.topicId,
                      )}`}
                    >
                      <span className="block truncate">{review.topicTitle}</span>
                      <span className="mt-0.5 block text-[10px] font-medium opacity-70">
                        Review {review.sequence}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {quickEntryDate && quickEntryDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm"
          onMouseDown={closeQuickEntry}
        >
          <form
            onSubmit={submitQuickEntry}
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 text-zinc-950 shadow-2xl shadow-zinc-950/15"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Kalendereintrag
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">
                  {formatDisplayDate(quickEntryDate)}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Overlay schliessen"
                title="Schliessen"
                onClick={closeQuickEntry}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-lg font-semibold text-zinc-900 transition hover:border-zinc-950"
              >
                x
              </button>
            </div>

            <label className="mt-5 block text-sm font-medium text-zinc-700">
              Bezeichnung
              <input
                autoFocus
                value={quickEntryDraft.title}
                onChange={(event) =>
                  setQuickEntryDraft((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
                placeholder="Neue Bezeichnung"
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Beschreibung
              <textarea
                value={quickEntryDraft.description}
                onChange={(event) =>
                  setQuickEntryDraft((current) =>
                    current
                      ? { ...current, description: event.target.value }
                      : current,
                  )
                }
                rows={3}
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              />
            </label>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                Projekt
                <input
                  value={quickEntryDraft.tags}
                  onChange={(event) =>
                    setQuickEntryDraft((current) =>
                      current ? { ...current, tags: event.target.value } : current,
                    )
                  }
                  placeholder="Leer lassen für eigenes Projekt"
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Typ
                <select
                  value={quickEntryDraft.entryType ?? "Vorhaben"}
                  onChange={(event) =>
                    setQuickEntryDraft((current) =>
                      current
                        ? {
                            ...current,
                            entryType: event.target.value as LearningEntryType,
                          }
                        : current,
                    )
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                >
                  {ENTRY_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>

            {(quickEntryDraft.entryType ?? "Vorhaben") ===
              "Spaced Repetition" && (
              <label className="mt-4 block text-sm font-medium text-zinc-700">
                Decks
                <input
                  value={quickEntryDraft.deckNames ?? ""}
                  onChange={(event) =>
                    setQuickEntryDraft((current) =>
                      current
                        ? { ...current, deckNames: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Neuroanatomie, Mathe Beweise"
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />
              </label>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                Startdatum
                <GermanDateInput
                  key={`quick-start-${quickEntryDraft.startDate}`}
                  value={quickEntryDraft.startDate}
                  onChange={(value) =>
                    setQuickEntryDraft((current) =>
                      current
                        ? applyTopicPlanFromRepetitionCount({
                            ...current,
                            startDate: value,
                          })
                        : current,
                    )
                  }
                  required
                />
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Enddatum
                <GermanDateInput
                  key={`quick-deadline-${quickEntryDraft.deadline}`}
                  value={quickEntryDraft.deadline}
                  onChange={(value) =>
                    setQuickEntryDraft((current) =>
                      current
                        ? applyTopicPlanFromDeadline({
                            ...current,
                            deadline: value,
                          })
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Intervall
              <select
                value={quickEntryDraft.reviewInterval}
                onChange={(event) =>
                  setQuickEntryDraft((current) =>
                    current
                      ? applyTopicPlanFromRepetitionCount({
                          ...current,
                          reviewInterval: event.target.value as ReviewInterval,
                        })
                      : current,
                  )
                }
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              >
                {REVIEW_INTERVALS.map((interval) => (
                  <option key={interval.value} value={interval.value}>
                    {interval.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Wiederholungen
              <input
                type="number"
                min={1}
                max={36}
                value={quickEntryDraft.reviewRepetitionCount}
                onChange={(event) =>
                  setQuickEntryDraft((current) =>
                    current
                      ? applyTopicPlanFromRepetitionCount({
                          ...current,
                          reviewRepetitionCount: event.target.value,
                        })
                      : current,
                  )
                }
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              />
            </label>

            <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Ressource hinzufuegen
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-700">
                  Typ
                  <select
                    value={quickResourceDraft.type}
                    onChange={(event) =>
                      setQuickResourceDraft((current) => ({
                        ...current,
                        type: event.target.value as ResourceType,
                      }))
                    }
                    className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                  >
                    {RESOURCE_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-zinc-700">
                  Titel
                  <input
                    value={quickResourceDraft.title}
                    onChange={(event) =>
                      setQuickResourceDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Optional, sonst aus URL"
                    className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                  />
                </label>
              </div>

              <label className="mt-3 block text-sm font-medium text-zinc-700">
                URL oder Referenz
                <input
                  value={quickResourceDraft.reference}
                  onChange={(event) =>
                    setQuickResourceDraft((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />
              </label>

              <label className="mt-3 block text-sm font-medium text-zinc-700">
                Kurze Zusammenfassung
                <textarea
                  value={quickResourceDraft.summary}
                  onChange={(event) =>
                    setQuickResourceDraft((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  rows={2}
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!quickEntryDraft.title.trim()}
                className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={closeQuickEntry}
                className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

type ReviewSessionViewProps = {
  topic: LearningTopic | null;
  onCompleteReview: (topicId: string, rating: ReviewRating, activeRecall: string, notes: string) => void;
};

export function ReviewSessionView({
  topic,
  onCompleteReview,
}: ReviewSessionViewProps) {
  const [activeRecall, setActiveRecall] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!topic) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Review-Session
        </p>
        <p className="mt-4 text-sm text-zinc-600">
          Waehle ein faelliges Thema im Kalender oder in Today&apos;s Reviews.
        </p>
      </div>
    );
  }

  const lastReview = topic.reviewHistory[0] ?? null;

  function complete(rating: ReviewRating) {
    if (!topic) {
      return;
    }

    if (!activeRecall.trim()) {
      setError("Schreibe zuerst kurz auf, was du aktiv erinnern kannst.");
      return;
    }

    onCompleteReview(topic.id, rating, activeRecall, notes);
    setActiveRecall("");
    setNotes("");
    setShowNotes(false);
    setError(null);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Review-Session
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">
        {topic.title}
      </h2>
      <p className="mt-2 text-sm text-zinc-600">{topic.description}</p>

      <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-semibold text-zinc-900">
          Was weisst du noch?
        </p>
        <textarea
          value={activeRecall}
          onChange={(event) => setActiveRecall(event.target.value)}
          rows={5}
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
        />
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowNotes((current) => !current)}
          className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
        >
          {showNotes ? "Notizen ausblenden" : "Notizen anzeigen"}
        </button>
      </div>

      {showNotes && (
        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-900">
              Recall-Fragen
            </p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              {topic.recallQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>

          {lastReview && (
            <div className="rounded-md border border-zinc-200 p-4">
              <p className="text-sm font-semibold text-zinc-900">
                Letzte Notizen
              </p>
              <p className="mt-2 text-sm text-zinc-700">
                {lastReview.notes || "Keine Notizen gespeichert."}
              </p>
            </div>
          )}

          <div className="rounded-md border border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-900">Ressourcen</p>
            <div className="mt-2 space-y-2">
              {topic.resources.length === 0 ? (
                <p className="text-sm text-zinc-600">
                  Keine Ressourcen hinterlegt.
                </p>
              ) : (
                topic.resources.map((resource) => (
                  <div key={resource.id} className="text-sm text-zinc-700">
                    <span className="font-semibold">{resource.title}</span>
                    {resource.summary && <span> · {resource.summary}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <label className="mt-4 block text-sm font-medium text-zinc-700">
        Review-Notizen
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
        />
      </label>

      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}

      <ReviewRatingButtons onRate={complete} />
    </div>
  );
}

type ReviewRatingButtonsProps = {
  onRate: (rating: ReviewRating) => void;
};

export function ReviewRatingButtons({ onRate }: ReviewRatingButtonsProps) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(["Forgot", "Hard", "Good", "Easy"] as ReviewRating[]).map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onRate(rating)}
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

type TopicListProps = {
  topics: LearningTopic[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
  onOpenTopic: (topicId: string) => void;
};

export function TopicList({
  topics,
  selectedTopicId,
  onSelectTopic,
  onOpenTopic,
}: TopicListProps) {
  const activeTopics = topics.filter((topic) => getProjectedReviews(topic).length > 0);

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/95 p-5 shadow-sm shadow-zinc-200/60">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Uebersicht aktive Vorhaben
      </p>
      <div className="mt-4 space-y-2">
        {activeTopics.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 p-4 text-sm text-zinc-600">
            Keine aktiven Vorhaben.
          </div>
        ) : (
          activeTopics.map((topic) => {
            const state = getTopicReviewState(topic);
            const primaryResourceUrl = getPrimaryResourceUrl(topic);
            const isSelected = selectedTopicId === topic.id;
            const projectLabel = getTopicProjectLabel(topic);
            const deckLabel =
              topic.entryType === "Spaced Repetition" && topic.deckNames.length > 0
                ? ` · Decks: ${topic.deckNames.join(", ")}`
                : "";

            return (
              <div
                key={topic.id}
                className={`flex items-start gap-2 rounded-lg border p-2 transition ${
                  isSelected
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTopic(topic.id)}
                  onDoubleClick={() => onOpenTopic(topic.id)}
                  className="min-w-0 flex-1 px-1 py-1 text-left"
                >
                  <span
                    className={`block truncate text-sm font-semibold ${
                      isSelected ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    {topic.title}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${
                      isSelected ? "text-zinc-200" : "text-zinc-500"
                    }`}
                  >
                    {projectLabel} · naechstes Review{" "}
                    {formatDisplayDate(topic.schedule.nextReviewDate)} ·{" "}
                    {stateLabel(state)}
                    {deckLabel}
                  </span>
                </button>

                {primaryResourceUrl && (
                  <a
                    href={primaryResourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Resource für ${topic.title} oeffnen`}
                    title="Resource oeffnen"
                    onClick={(event) => event.stopPropagation()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                  >
                    <ResourceOpenIcon reference={primaryResourceUrl} />
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type TopicOverviewOverlayProps = {
  topic: LearningTopic | null;
  onClose: () => void;
  onAddResource: (
    topicId: string,
    resource: LearningResourceDraft,
    file: File | null,
  ) => Promise<void> | void;
  onUpdateResource: (
    topicId: string,
    resourceId: string,
    resource: LearningResourceDraft,
  ) => void;
  onOpenResource: (
    resource: LearningResource,
    mode?: "open" | "download",
  ) => Promise<void> | void;
  onUpdateReviewRepetitionCount: (topicId: string, count: number) => void;
  onDeleteProjectedReview: (topicId: string, reviewKey: string) => void;
  onDeleteAllProjectedReviews: (topicId: string) => void;
};

export function TopicOverviewOverlay({
  topic,
  onClose,
  onAddResource,
  onUpdateResource,
  onOpenResource,
  onUpdateReviewRepetitionCount,
  onDeleteProjectedReview,
  onDeleteAllProjectedReviews,
}: TopicOverviewOverlayProps) {
  useEffect(() => {
    if (!topic) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, topic]);

  if (!topic) {
    return null;
  }

  const repeatedDays = countRepeatedDays(topic);
  const projectedReviews = getProjectedReviews(topic);
  const resourceSummary = summarizeResources(topic);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 text-zinc-950 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Thema
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {topic.title}
            </h2>
            {topic.description && (
              <p className="mt-2 text-sm text-zinc-600">
                {topic.description}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Overlay schliessen"
            title="Schliessen"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-lg font-semibold text-zinc-900 transition hover:border-zinc-950"
          >
            x
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OverviewTile label="Wiederholt an Tagen" value={repeatedDays} />
          <OverviewTile label="Ressourcen" value={topic.resources.length} />
          <OverviewTile
            label="Naechstes Review"
            value={formatDisplayDate(topic.schedule.nextReviewDate)}
          />
          <OverviewTile
            label="Wiederholungen"
            value={topic.reviewRepetitionCount}
          />
        </div>

        <MiniFocusSession key={topic.id} topic={topic} />

        <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Ressourcen Dashboard
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <OverviewTile label="Offen" value={resourceSummary.open} />
            <OverviewTile
              label="In Arbeit"
              value={resourceSummary.inProgress}
            />
            <OverviewTile
              label="Abgeschlossen"
              value={resourceSummary.completed}
            />
            <OverviewTile label="Dateien" value={resourceSummary.files} />
          </div>
        </div>

        <label className="mt-5 block text-sm font-medium text-zinc-700">
          Wiederholungen
          <input
            type="number"
            min={1}
            max={36}
            value={topic.reviewRepetitionCount}
            onChange={(event) =>
              onUpdateReviewRepetitionCount(topic.id, Number(event.target.value))
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          />
        </label>

        <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Geplante Wiederholungen
            </p>
            {projectedReviews.length > 0 && (
              <button
                type="button"
                onClick={() => onDeleteAllProjectedReviews(topic.id)}
                className="h-8 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:border-red-500"
              >
                Alle loeschen
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {projectedReviews.length === 0 ? (
              <p className="text-sm text-zinc-600">
                Keine geplanten Wiederholungen.
              </p>
            ) : (
              projectedReviews.map((review) => (
                <span
                  key={`${review.topicId}-${review.reviewKey}`}
                  className={`inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold ${getCalendarColor(
                    getReviewEventState(review.date, review.isCompleted),
                    review.isNextReview,
                  )}`}
                >
                  {formatDisplayDate(review.date)} - {review.intervalDays}d
                  <button
                    type="button"
                    aria-label={`Wiederholung am ${formatDisplayDate(
                      review.date,
                    )} loeschen`}
                    title="Wiederholung loeschen"
                    onClick={() =>
                      onDeleteProjectedReview(topic.id, review.reviewKey)
                    }
                    className="flex h-5 w-5 items-center justify-center rounded border border-current/30 bg-white/70 text-[11px] leading-none transition hover:bg-white"
                  >
                    x
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-5">
          <ResourceList
            topic={topic}
            onAddResource={onAddResource}
            onUpdateResource={onUpdateResource}
            onOpenResource={onOpenResource}
          />
        </div>
      </div>
    </div>
  );
}

type OverviewTileProps = {
  label: string;
  value: number | string;
};

function OverviewTile({ label, value }: OverviewTileProps) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function MiniFocusSession({ topic }: { topic: LearningTopic }) {
  const [durationSeconds, setDurationSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [endAt, setEndAt] = useState<number | null>(null);
  const isRunning = endAt !== null;

  useEffect(() => {
    if (!endAt) {
      return;
    }

    const timerId = window.setInterval(() => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((endAt - Date.now()) / 1000),
      );

      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds === 0) {
        setEndAt(null);
      }
    }, 250);

    return () => window.clearInterval(timerId);
  }, [endAt]);

  function selectDuration(seconds: number) {
    if (isRunning) {
      return;
    }

    setDurationSeconds(seconds);
    setRemainingSeconds(seconds);
  }

  function toggleFocusSession() {
    if (isRunning) {
      setEndAt(null);
      return;
    }

    setEndAt(Date.now() + remainingSeconds * 1000);
  }

  function resetFocusSession() {
    setEndAt(null);
    setRemainingSeconds(durationSeconds);
  }

  return (
    <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Focus Session
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-900">{topic.title}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[15, 25, 50].map((minutes) => {
            const seconds = minutes * 60;

            return (
              <button
                key={minutes}
                type="button"
                onClick={() => selectDuration(seconds)}
                disabled={isRunning}
                className={`h-8 rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  durationSeconds === seconds
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-950"
                }`}
              >
                {minutes}m
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-950">
          {formatFocusSeconds(remainingSeconds)}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleFocusSession}
            className="h-10 min-w-24 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {isRunning ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={resetFocusSession}
            className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function ResourceFavicon({ reference }: { reference: string }) {
  const faviconUrl = getFaviconUrl(reference);

  if (!faviconUrl) {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-200 bg-white text-[10px] font-semibold text-zinc-500">
        R
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="mt-0.5 h-5 w-5 shrink-0 rounded border border-zinc-200 bg-white bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url("${faviconUrl}")` }}
    />
  );
}

function ResourceOpenIcon({ reference }: { reference: string }) {
  const faviconUrl = getFaviconUrl(reference);
  const [failedFaviconUrl, setFailedFaviconUrl] = useState<string | null>(null);

  if (!faviconUrl || failedFaviconUrl === faviconUrl) {
    return <ExternalLinkIcon />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faviconUrl}
      alt=""
      aria-hidden="true"
      className="h-4 w-4 rounded-sm object-contain"
      onError={() => setFailedFaviconUrl(faviconUrl)}
    />
  );
}

function summarizeResources(topic: LearningTopic) {
  return topic.resources.reduce(
    (summary, resource) => {
      if (resource.status === "offen") {
        summary.open += 1;
      }

      if (resource.status === "in Bearbeitung") {
        summary.inProgress += 1;
      }

      if (resource.status === "abgeschlossen") {
        summary.completed += 1;
      }

      if (resource.file) {
        summary.files += 1;
      }

      return summary;
    },
    {
      open: 0,
      inProgress: 0,
      completed: 0,
      files: 0,
    },
  );
}

function getPrimaryResourceUrl(topic: LearningTopic) {
  const resourceWithUrl = topic.resources.find((resource) =>
    normalizeResourceUrl(resource.reference),
  );

  return resourceWithUrl
    ? normalizeResourceUrl(resourceWithUrl.reference)
    : null;
}

function getTopicProjectLabel(topic: LearningTopic) {
  const projectName = topic.tags[0] || topic.title;

  if (projectName === topic.title) {
    return "Eigenes Projekt";
  }

  return `Projekt: ${projectName}`;
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

function getResourceTitleFromReference(reference: string) {
  const url = normalizeResourceUrl(reference);

  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const lastPathSegment = parsedUrl.pathname
      .split("/")
      .filter(Boolean)
      .at(-1);
    const readableSegment = lastPathSegment
      ? decodeURIComponent(lastPathSegment)
          .replace(/\.[a-z0-9]+$/i, "")
          .replace(/[-_]+/g, " ")
          .trim()
      : "";
    const host = parsedUrl.hostname.replace(/^www\./, "");

    if (readableSegment) {
      return `${toTitleCase(readableSegment)} - ${host}`;
    }

    return host;
  } catch {
    return null;
  }
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFaviconUrl(reference: string) {
  const url = normalizeResourceUrl(reference);

  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFocusSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function validateResourceFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (BLOCKED_RESOURCE_FILE_EXTENSIONS.has(extension)) {
    return "Dieser Dateityp ist aus Sicherheitsgruenden nicht erlaubt.";
  }

  if (file.size > MAX_RESOURCE_FILE_SIZE) {
    return `Die Datei ist zu gross. Erlaubt sind maximal ${formatBytes(
      MAX_RESOURCE_FILE_SIZE,
    )}.`;
  }

  if (file.type && !ALLOWED_RESOURCE_FILE_TYPES.has(file.type)) {
    return "Dieser Dateityp ist nicht für Ressourcen freigegeben.";
  }

  return null;
}

export function buildResource(
  topicId: string,
  draft: LearningResourceDraft,
  file: LearningResourceFile | null = null,
) {
  return createLearningResource(topicId, draft, file);
}

export function finishReview(
  topic: LearningTopic,
  rating: ReviewRating,
  activeRecall: string,
  notes: string,
) {
  return completeReview(topic, { rating, activeRecall, notes });
}

function getMonthDays(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index));
}

function getWeekDays(date: Date) {
  const start = new Date(date);
  const startOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startOffset);

  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
}

function addCalendarDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getCalendarColor(state: string, isSelected: boolean) {
  const selectedClass = isSelected ? " outline outline-1 outline-zinc-950" : "";

  if (state === "overdue") {
    return `bg-red-100 text-red-800 hover:bg-red-200${selectedClass}`;
  }

  if (state === "today") {
    return `bg-emerald-100 text-emerald-800 hover:bg-emerald-200${selectedClass}`;
  }

  if (state === "completed") {
    return `bg-zinc-200 text-zinc-700 hover:bg-zinc-300${selectedClass}`;
  }

  return `bg-sky-100 text-sky-800 hover:bg-sky-200${selectedClass}`;
}

function getCalendarEventClass(state: string, isSelected: boolean) {
  const selectedClass = isSelected ? " ring-2 ring-zinc-950/80" : "";

  if (state === "overdue") {
    return `border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300 hover:bg-rose-100${selectedClass}`;
  }

  if (state === "today") {
    return `border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-100${selectedClass}`;
  }

  if (state === "completed") {
    return `border-zinc-200 bg-zinc-100 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-200/70${selectedClass}`;
  }

  return `border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-300 hover:bg-sky-100${selectedClass}`;
}

function CalendarLegend({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "red" | "sky" | "zinc";
}) {
  const colorClass =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "red"
        ? "bg-rose-500"
        : tone === "sky"
          ? "bg-sky-500"
          : "bg-zinc-400";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${colorClass}`} />
      {label}
    </span>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function getReviewEventState(date: string, isCompleted: boolean) {
  if (isCompleted) {
    return "completed";
  }

  const reviewDate = new Date(`${date}T00:00:00`);
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (reviewDate.getTime() < todayStart.getTime()) {
    return "overdue";
  }

  if (reviewDate.getTime() === todayStart.getTime()) {
    return "today";
  }

  return "upcoming";
}

function stateLabel(state: string) {
  if (state === "overdue") {
    return "ueberfaellig";
  }

  if (state === "today") {
    return "heute";
  }

  if (state === "completed") {
    return "abgeschlossen";
  }

  return "kommend";
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function formatDisplayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type GermanDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function GermanDateInput({
  value,
  onChange,
  required = false,
}: GermanDateInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value ? formatDisplayDate(value) : "",
  );

  function updateDate(nextDisplayValue: string) {
    setDisplayValue(nextDisplayValue);

    if (!nextDisplayValue.trim()) {
      onChange("");
      return;
    }

    const parsedDate = parseGermanDate(nextDisplayValue);

    if (parsedDate) {
      onChange(parsedDate);
    }
  }

  function normalizeDate() {
    if (!displayValue.trim()) {
      return;
    }

    const parsedDate = parseGermanDate(displayValue);

    if (parsedDate) {
      setDisplayValue(formatDisplayDate(parsedDate));
      return;
    }

    setDisplayValue(value ? formatDisplayDate(value) : "");
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="TT.MM.JJJJ"
      value={displayValue}
      onChange={(event) => updateDate(event.target.value)}
      onBlur={normalizeDate}
      required={required}
      pattern="\d{2}\.\d{2}\.\d{4}"
      className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
    />
  );
}

function parseGermanDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return toDateInputValue(date);
}

function applyTopicPlanFromDeadline(draft: LearningTopicDraft) {
  if (!draft.deadline || draft.deadline < draft.startDate) {
    return applyTopicPlanFromRepetitionCount({
      ...draft,
      reviewRepetitionCount: "1",
    });
  }

  const repetitionCount = getRepetitionCountBeforeDeadline(
    draft.startDate,
    draft.deadline,
    draft.reviewInterval,
  );

  if (repetitionCount < 1) {
    return applyTopicPlanFromRepetitionCount({
      ...draft,
      reviewRepetitionCount: "1",
    });
  }

  return {
    ...draft,
    reviewRepetitionCount: String(repetitionCount),
  };
}

function applyTopicPlanFromRepetitionCount(draft: LearningTopicDraft) {
  const repetitionCount = getClampedRepetitionCountInput(
    draft.reviewRepetitionCount,
  );

  if (!repetitionCount) {
    return draft;
  }

  return {
    ...draft,
    reviewRepetitionCount: String(repetitionCount),
    deadline: getDeadlineForRepetitionCount(
      draft.startDate,
      repetitionCount,
      draft.reviewInterval,
    ),
  };
}

function normalizeTopicPlan(draft: LearningTopicDraft) {
  const repetitionCount = getClampedRepetitionCountInput(
    draft.reviewRepetitionCount,
  );
  const projectName = draft.tags.trim() || draft.title.trim();

  return applyTopicPlanFromRepetitionCount({
    ...draft,
    tags: projectName,
    goal: "Projekt",
    reviewRepetitionCount: String(repetitionCount ?? 1),
  });
}

function getRepetitionCountBeforeDeadline(
  startDate: string,
  deadline: string,
  reviewInterval: ReviewInterval,
) {
  let repetitions = 0;

  for (const reviewDate of getReviewDates(startDate, 36, reviewInterval)) {
    if (reviewDate > deadline) {
      break;
    }

    repetitions += 1;
  }

  return repetitions;
}

function getDeadlineForRepetitionCount(
  startDate: string,
  repetitionCount: number,
  reviewInterval: ReviewInterval,
) {
  const reviewDates = getReviewDates(startDate, repetitionCount, reviewInterval);

  return reviewDates[reviewDates.length - 1] ?? startDate;
}

function getReviewDates(
  startDate: string,
  repetitionCount: number,
  reviewInterval: ReviewInterval,
) {
  const reviewDates: string[] = [];
  let reviewDate = addDateDays(startDate, getFirstReviewIntervalDays(reviewInterval));
  let intervalIndex = 0;

  while (reviewDates.length < repetitionCount) {
    reviewDates.push(reviewDate);

    const nextIntervalIndex =
      reviewInterval === "spaced"
        ? Math.min(REVIEW_INTERVAL_DAYS.length - 1, intervalIndex + 1)
        : intervalIndex;
    const daysToNextReview =
      reviewInterval === "spaced"
        ? nextIntervalIndex === intervalIndex
          ? REVIEW_INTERVAL_DAYS[nextIntervalIndex]
          : REVIEW_INTERVAL_DAYS[nextIntervalIndex] -
            REVIEW_INTERVAL_DAYS[intervalIndex]
        : getFirstReviewIntervalDays(reviewInterval);

    reviewDate = addDateDays(reviewDate, daysToNextReview);
    intervalIndex = nextIntervalIndex;
  }

  return reviewDates;
}

function getClampedRepetitionCountInput(value: string) {
  const repetitionCount = Number(value);

  if (!Number.isFinite(repetitionCount) || repetitionCount < 1) {
    return null;
  }

  return Math.min(36, Math.round(repetitionCount));
}

function getFirstReviewIntervalDays(reviewInterval: ReviewInterval) {
  if (reviewInterval === "weekly") {
    return 7;
  }

  return 1;
}

function addDateDays(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return toDateInputValue(nextDate);
}

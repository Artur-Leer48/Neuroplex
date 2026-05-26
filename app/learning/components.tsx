"use client";

import { useMemo, useState } from "react";

import {
  completeReview,
  countRepeatedDays,
  createLearningResource,
  createLearningTopic,
  getProjectedReviews,
  getTopicReviewState,
  toDateInputValue,
  type LearningGoal,
  type LearningResource,
  type LearningResourceDraft,
  type LearningResourceFile,
  type LearningTopic,
  type LearningTopicDraft,
  type ResourceStatus,
  type ResourceType,
  type ReviewRating,
} from "@/lib/learning";

const GOALS: LearningGoal[] = [
  "Verstehen",
  "Auswendig lernen",
  "Pruefung",
  "Projekt",
];
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

type TopicFormProps = {
  onCreateTopic: (topic: LearningTopic) => void;
};

export function TopicForm({ onCreateTopic }: TopicFormProps) {
  const [draft, setDraft] = useState<LearningTopicDraft>({
    title: "",
    description: "",
    tags: "",
    goal: "Verstehen",
    startDate: toDateInputValue(new Date()),
    deadline: "",
    reviewRepetitionCount: "6",
  });
  const [error, setError] = useState<string | null>(null);

  function submitTopic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Titel ist erforderlich.");
      return;
    }

    if (draft.deadline && draft.deadline < draft.startDate) {
      setError("Die Deadline darf nicht vor dem Startdatum liegen.");
      return;
    }

    if (
      !Number.isFinite(Number(draft.reviewRepetitionCount)) ||
      Number(draft.reviewRepetitionCount) < 1
    ) {
      setError("Plane mindestens eine Wiederholung.");
      return;
    }

    onCreateTopic(createLearningTopic(draft));
    setDraft({
      title: "",
      description: "",
      tags: "",
      goal: "Verstehen",
      startDate: toDateInputValue(new Date()),
      deadline: "",
      reviewRepetitionCount: "6",
    });
    setError(null);
  }

  return (
    <form
      onSubmit={submitTopic}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Schedule Repetition
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Wiederholung planen
          </h2>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <label className="block text-sm font-medium text-zinc-700">
          Titel
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          />
        </label>

        <label className="block text-sm font-medium text-zinc-700">
          Beschreibung
          <textarea
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Kategorie / Tags
            <input
              value={draft.tags}
              onChange={(event) =>
                setDraft((current) => ({ ...current, tags: event.target.value }))
              }
              placeholder="Neuro, Mathe, Projekt"
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Ziel
            <select
              value={draft.goal}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  goal: event.target.value as LearningGoal,
                }))
              }
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            >
              {GOALS.map((goal) => (
                <option key={goal}>{goal}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Startdatum
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Deadline
            <input
              type="date"
              value={draft.deadline}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  deadline: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-zinc-700">
          Wiederholungen
          <input
            type="number"
            min={1}
            max={36}
            value={draft.reviewRepetitionCount}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                reviewRepetitionCount: event.target.value,
              }))
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}

      <button
        type="submit"
        className="mt-5 flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Today&apos;s Reviews
      </p>
      <div className="mt-4 space-y-2">
        {dueTopics.length === 0 ? (
          <p className="text-sm text-zinc-600">Heute ist nichts faellig.</p>
        ) : (
          dueTopics.map((topic) => {
            const state = getTopicReviewState(topic);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onSelectTopic(topic.id)}
                className={`w-full rounded-md border px-3 py-3 text-left transition ${
                  selectedTopicId === topic.id
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-950"
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
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null,
  );
  const [editDraft, setEditDraft] = useState<LearningResourceDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic) {
      setError("Waehle zuerst ein Thema aus.");
      return;
    }

    if (!draft.title.trim() && !selectedFile) {
      setError("Ressourcen-Titel ist erforderlich.");
      return;
    }

    await onAddResource(
      topic.id,
      {
        ...draft,
        title: draft.title.trim() || selectedFile?.name || "",
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

    if (!editDraft.title.trim()) {
      setError("Ressourcen-Titel ist erforderlich.");
      return;
    }

    onUpdateResource(topic.id, resource.id, editDraft);
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
                    {resource.locator && (
                      <p className="text-xs font-medium text-zinc-600">
                        {resource.locator}
                      </p>
                    )}
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

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                Kapitel / Zeit / Seite
                <input
                  value={draft.locator}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      locator: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />
              </label>

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
              <input
                key={fileInputKey}
                type="file"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-900 focus:border-zinc-950"
              />
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Kapitel / Zeit / Seite
          <input
            value={draft.locator}
            onChange={(event) =>
              onChange((current) =>
                current ? { ...current, locator: event.target.value } : current,
              )
            }
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
          />
        </label>

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
  onChangeViewMode,
  onChangeCalendarDate,
}: ReviewCalendarProps) {
  const days = useMemo(
    () =>
      viewMode === "month" ? getMonthDays(calendarDate) : getWeekDays(calendarDate),
    [calendarDate, viewMode],
  );
  const reviewEvents = useMemo(
    () => topics.flatMap((topic) => getProjectedReviews(topic)),
    [topics],
  );

  function shiftCalendar(direction: number) {
    const nextDate = new Date(calendarDate);

    if (viewMode === "month") {
      nextDate.setMonth(nextDate.getMonth() + direction);
    } else {
      nextDate.setDate(nextDate.getDate() + direction * 7);
    }

    onChangeCalendarDate(nextDate);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Kalender
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            {calendarDate.toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftCalendar(-1)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold transition hover:border-zinc-950"
          >
            Zurueck
          </button>
          <button
            type="button"
            onClick={() => onChangeCalendarDate(new Date())}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold transition hover:border-zinc-950"
          >
            Heute
          </button>
          <button
            type="button"
            onClick={() => shiftCalendar(1)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold transition hover:border-zinc-950"
          >
            Weiter
          </button>
        </div>
      </div>

      <div className="mt-4 flex w-fit overflow-hidden rounded-md border border-zinc-300">
        {(["month", "week"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChangeViewMode(mode)}
            className={`h-9 px-4 text-sm font-semibold ${
              viewMode === mode ? "bg-zinc-950 text-white" : "bg-white text-zinc-900"
            }`}
          >
            {mode === "month" ? "Monat" : "Woche"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-7 border-l border-t border-zinc-200">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((dayLabel) => (
          <div
            key={dayLabel}
            className="border-b border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"
          >
            {dayLabel}
          </div>
        ))}

        {days.map((day) => {
          const dateKey = toDateInputValue(day);
          const dayReviews = reviewEvents.filter((review) => review.date === dateKey);
          const isOutsideMonth = day.getMonth() !== calendarDate.getMonth();

          return (
            <div
              key={dateKey}
              className={`min-h-28 border-b border-r border-zinc-200 p-2 ${
                isOutsideMonth && viewMode === "month" ? "bg-zinc-50" : "bg-white"
              }`}
            >
              <p className="text-xs font-semibold text-zinc-500">
                {day.getDate()}
              </p>
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
                      onDoubleClick={() => onOpenTopic(review.topicId)}
                      className={`w-full rounded px-2 py-1 text-left text-xs font-semibold transition ${getCalendarColor(
                        state,
                        selectedTopicId === review.topicId,
                      )}`}
                    >
                      {review.topicTitle}
                      <span className="ml-1 font-normal">
                        {review.sequence}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
        <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">
          heute
        </span>
        <span className="rounded bg-red-100 px-2 py-1 text-red-800">
          ueberfaellig
        </span>
        <span className="rounded bg-sky-100 px-2 py-1 text-sky-800">
          kommende Reviews
        </span>
        <span className="rounded bg-zinc-200 px-2 py-1 text-zinc-700">
          abgeschlossen
        </span>
      </div>
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
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Aktive Themen
      </p>
      <div className="mt-4 space-y-2">
        {topics.length === 0 ? (
          <p className="text-sm text-zinc-600">Noch keine Themen.</p>
        ) : (
          topics.map((topic) => {
            const state = getTopicReviewState(topic);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onSelectTopic(topic.id)}
                onDoubleClick={() => onOpenTopic(topic.id)}
                className={`w-full rounded-md border px-3 py-3 text-left transition ${
                  selectedTopicId === topic.id
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-950"
                }`}
              >
                <span className="block text-sm font-semibold">{topic.title}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {topic.goal} · naechstes Review{" "}
                  {formatDisplayDate(topic.schedule.nextReviewDate)} ·{" "}
                  {stateLabel(state)}
                </span>
              </button>
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
};

export function TopicOverviewOverlay({
  topic,
  onClose,
  onAddResource,
  onUpdateResource,
  onOpenResource,
  onUpdateReviewRepetitionCount,
}: TopicOverviewOverlayProps) {
  if (!topic) {
    return null;
  }

  const repeatedDays = countRepeatedDays(topic);
  const projectedReviews = getProjectedReviews(topic);
  const resourceSummary = summarizeResources(topic);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Geplante Wiederholungen
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {projectedReviews.map((review) => (
              <span
                key={`${review.topicId}-${review.sequence}-${review.date}`}
                className={`rounded px-2 py-1 text-xs font-semibold ${getCalendarColor(
                  getReviewEventState(review.date, review.isCompleted),
                  review.isNextReview,
                )}`}
              >
                {formatDisplayDate(review.date)} - {review.intervalDays}d
              </span>
            ))}
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

function formatDisplayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

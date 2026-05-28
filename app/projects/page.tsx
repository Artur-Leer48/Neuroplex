"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/app/app-header";
import { hasDemoOrSupabaseSession } from "@/lib/demo-auth";
import {
  readEisenhowerTodos,
  writeEisenhowerTodos,
  type EisenhowerTodo,
  type WorkItemColor,
  type WorkSubtask,
} from "@/lib/eisenhower-todos";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function ProjectsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<EisenhowerTodo[]>([]);
  const [selectedType, setSelectedType] = useState<
    EisenhowerTodo["itemType"] | "Alle"
  >("Alle");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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

      const savedItems = readEisenhowerTodos();
      setItems(savedItems);
      setSelectedItemId(savedItems[0]?.id ?? null);
      setIsLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredItems = useMemo(
    () =>
      selectedType === "Alle"
        ? items
        : items.filter((item) => item.itemType === selectedType),
    [items, selectedType],
  );
  const selectedItem = useMemo(
    () =>
      filteredItems.find((item) => item.id === selectedItemId) ??
      filteredItems[0] ??
      null,
    [filteredItems, selectedItemId],
  );
  const summary = useMemo(() => {
    const activeItems = items.filter((item) => !item.isDone);
    const allSubtasks = items.flatMap((item) => item.subtasks);
    const doneSubtasks = allSubtasks.filter((subtask) => subtask.isDone);

    return {
      activeCount: activeItems.length,
      projectCount: items.filter((item) => item.itemType === "Projekt").length,
      routineCount: items.filter((item) => item.itemType === "Wiederholung")
        .length,
      subtaskProgress:
        allSubtasks.length === 0
          ? "0%"
          : `${Math.round((doneSubtasks.length / allSubtasks.length) * 100)}%`,
    };
  }, [items]);

  function updateItems(nextItems: EisenhowerTodo[]) {
    setItems(nextItems);
    writeEisenhowerTodos(nextItems);
  }

  function toggleSubtask(itemId: string, subtaskId: string) {
    updateItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              subtasks: item.subtasks.map((subtask) =>
                subtask.id === subtaskId
                  ? { ...subtask, isDone: !subtask.isDone }
                  : subtask,
              ),
            }
          : item,
      ),
    );
  }

  function addSubtask(itemId: string, title: string) {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    updateItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              subtasks: [
                ...item.subtasks,
                {
                  id: crypto.randomUUID(),
                  title: trimmedTitle,
                  isDone: false,
                },
              ],
            }
          : item,
      ),
    );
  }

  function updateDescription(itemId: string, description: string) {
    updateItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              description,
            }
          : item,
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
        <AppHeader title="Projekte & Routinen" />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile label="Aktiv" value={summary.activeCount} />
          <SummaryTile label="Projekte" value={summary.projectCount} />
          <SummaryTile label="Routinen" value={summary.routineCount} />
          <SummaryTile label="Checklisten" value={summary.subtaskProgress} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <ProjectTypeFilter
              selectedType={selectedType}
              onSelectType={(type) => {
                setSelectedType(type);
                setSelectedItemId(null);
              }}
            />

            <ProjectList
              items={filteredItems}
              selectedItemId={selectedItem?.id ?? null}
              onSelectItem={setSelectedItemId}
            />
          </div>

          {selectedItem ? (
            <ProjectCard
              item={selectedItem}
              onAddSubtask={addSubtask}
              onToggleSubtask={toggleSubtask}
              onUpdateDescription={updateDescription}
            />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm font-medium text-zinc-600 shadow-sm">
              Keine Projekte für diesen Filter.
            </div>
          )}
        </div>
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

type ProjectTypeFilterProps = {
  selectedType: EisenhowerTodo["itemType"] | "Alle";
  onSelectType: (type: EisenhowerTodo["itemType"] | "Alle") => void;
};

function ProjectTypeFilter({
  selectedType,
  onSelectType,
}: ProjectTypeFilterProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Ansicht
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["Alle", "Projekt", "Wiederholung", "Sprint"] as const).map(
          (type) => (
            <button
              key={type}
              type="button"
              onClick={() => onSelectType(type)}
              className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                selectedType === type
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-950"
              }`}
            >
              {type}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

type ProjectListProps = {
  items: EisenhowerTodo[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
};

function ProjectList({
  items,
  selectedItemId,
  onSelectItem,
}: ProjectListProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Projekte
        </p>
        <span className="text-xs font-semibold text-zinc-500">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">Keine Eintraege vorhanden.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => {
            const doneCount = item.subtasks.filter(
              (subtask) => subtask.isDone,
            ).length;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  selectedItemId === item.id
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">
                    {item.title}
                  </span>
                  <span
                    className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${
                      selectedItemId === item.id
                        ? "bg-white/15 text-white"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {item.itemType}
                  </span>
                </div>
                <p
                  className={`mt-2 text-xs font-medium ${
                    selectedItemId === item.id
                      ? "text-zinc-200"
                      : "text-zinc-500"
                  }`}
                >
                  {doneCount}/{item.subtasks.length} Checkpoints
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ProjectCardProps = {
  item: EisenhowerTodo;
  onAddSubtask: (itemId: string, title: string) => void;
  onToggleSubtask: (itemId: string, subtaskId: string) => void;
  onUpdateDescription: (itemId: string, description: string) => void;
};

function ProjectCard({
  item,
  onAddSubtask,
  onToggleSubtask,
  onUpdateDescription,
}: ProjectCardProps) {
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const doneCount = item.subtasks.filter((subtask) => subtask.isDone).length;

  return (
    <article
      className={`rounded-lg border p-4 shadow-sm ${getProjectCardClass(
        item.color,
      )}`}
      title={getProjectTooltip(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
            {item.itemType}
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">
            {item.title}
          </h2>
        </div>
        <span className="rounded bg-white/70 px-2 py-1 text-xs font-semibold">
          {doneCount}/{item.subtasks.length}
        </span>
      </div>

      <label className="mt-4 block text-sm font-medium">
        Beschreibung
        <textarea
          value={item.description}
          onChange={(event) => onUpdateDescription(item.id, event.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-md border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-zinc-950"
        />
      </label>

      <div className="mt-4 space-y-2">
        {item.subtasks.slice(0, 5).map((subtask) => (
          <SubtaskRow
            key={subtask.id}
            subtask={subtask}
            onToggle={() => onToggleSubtask(item.id, subtask.id)}
          />
        ))}
      </div>

      <form
        className="mt-4 grid grid-cols-[1fr_auto] gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onAddSubtask(item.id, subtaskTitle);
          setSubtaskTitle("");
        }}
      >
        <input
          value={subtaskTitle}
          onChange={(event) => setSubtaskTitle(event.target.value)}
          placeholder="Unteraufgabe"
          className="h-10 rounded-md border border-black/10 bg-white/70 px-3 text-sm outline-none transition focus:border-zinc-950"
        />
        <button
          type="submit"
          className="h-10 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Add
        </button>
      </form>
    </article>
  );
}

function SubtaskRow({
  subtask,
  onToggle,
}: {
  subtask: WorkSubtask;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md bg-white/70 px-3 py-2 text-left text-sm"
    >
      <span className="flex h-4 w-4 items-center justify-center rounded border border-zinc-400 text-[10px]">
        {subtask.isDone ? "x" : ""}
      </span>
      <span className={subtask.isDone ? "line-through opacity-60" : ""}>
        {subtask.title}
      </span>
    </button>
  );
}

function getProjectTooltip(item: EisenhowerTodo) {
  const subtasks = item.subtasks
    .slice(0, 5)
    .map((subtask) => `${subtask.isDone ? "[x]" : "[ ]"} ${subtask.title}`)
    .join("\n");

  return [item.description, subtasks].filter(Boolean).join("\n\n");
}

function getProjectCardClass(color: WorkItemColor) {
  if (color === "sky") {
    return "border-sky-200 bg-sky-50 text-sky-950";
  }

  if (color === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }

  if (color === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }

  if (color === "rose") {
    return "border-rose-200 bg-rose-50 text-rose-950";
  }

  if (color === "violet") {
    return "border-violet-200 bg-violet-50 text-violet-950";
  }

  return "border-zinc-200 bg-white text-zinc-950";
}

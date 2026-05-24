"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createEisenhowerTodo,
  readEisenhowerTodos,
  writeEisenhowerTodos,
  type EisenhowerQuadrant,
  type EisenhowerTodo,
} from "@/lib/eisenhower-todos";
import { setCurrentTask } from "@/lib/current-task";
import { setPendingFocusSession } from "@/lib/focus-session";
import { supabaseBrowser } from "@/lib/supabase-browser";

const INFO_STORAGE_KEY = "neuroplex:eisenhower-info-seen";
const FOCUS_OPTIONS = [15, 30, 45, 60, 90];
const ACTIVE_TIMER_STORAGE_KEY = "neuroplex:active-plasticity-timer";
const TIMER_WIDGET_STORAGE_KEY = "neuroplex:eisenhower-timer-widget";

type TimerWidgetPosition = "top" | "right" | "bottom" | "left";

type ActiveTimerSession =
  | {
      phase: "plasticity";
      durationSeconds: number;
      endAt: number;
      timerName?: string;
    }
  | {
      phase: "recovery";
      activityId: string;
      durationSeconds: number;
      endAt: number;
      timerName?: string;
    };

const QUADRANTS: Array<{
  id: EisenhowerQuadrant;
  title: string;
  description: string;
}> = [
  {
    id: "urgent-important",
    title: "Dringend & wichtig",
    description: "Sofort erledigen",
  },
  {
    id: "not-urgent-important",
    title: "Nicht dringend & wichtig",
    description: "Terminieren",
  },
  {
    id: "urgent-not-important",
    title: "Dringend & unwichtig",
    description: "Delegieren oder kurz halten",
  },
  {
    id: "not-urgent-not-important",
    title: "Nicht dringend & unwichtig",
    description: "Spaeter oder streichen",
  },
];

export default function EisenhowerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [todos, setTodos] = useState<EisenhowerTodo[]>([]);
  const [title, setTitle] = useState("");
  const [isUrgent, setIsUrgent] = useState(true);
  const [isImportant, setIsImportant] = useState(true);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [isDraggingDraft, setIsDraggingDraft] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showTimerWidget, setShowTimerWidget] = useState(true);
  const [timerWidgetPosition, setTimerWidgetPosition] =
    useState<TimerWidgetPosition>("right");
  const [isDraggingTimerWidget, setIsDraggingTimerWidget] = useState(false);
  const [activeTimerSession, setActiveTimerSession] =
    useState<ActiveTimerSession | null>(null);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState(0);
  const [focusTodo, setFocusTodo] = useState<EisenhowerTodo | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    todo: EisenhowerTodo;
    x: number;
    y: number;
  } | null>(null);

  const activeTodos = useMemo(
    () => todos.filter((todo) => !todo.isDone),
    [todos],
  );
  const doneTodos = useMemo(
    () => todos.filter((todo) => todo.isDone),
    [todos],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      const { data, error } = await supabaseBrowser.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      setTodos(readEisenhowerTodos());
      setShowInfo(window.localStorage.getItem(INFO_STORAGE_KEY) !== "true");
      setShowTimerWidget(readTimerWidgetVisible());
      setTimerWidgetPosition(readTimerWidgetPosition());
      setIsLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    function syncActiveTimer() {
      const nextTimerSession = readActiveTimerSession();
      setActiveTimerSession(nextTimerSession);
      setTimerRemainingSeconds(getRemainingSeconds(nextTimerSession?.endAt));
    }

    syncActiveTimer();
    const timerId = window.setInterval(syncActiveTimer, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeContextMenu(event: MouseEvent | KeyboardEvent) {
      if ("key" in event && event.key !== "Escape") {
        return;
      }

      setContextMenu(null);
    }

    window.addEventListener("click", closeContextMenu);
    window.addEventListener("keydown", closeContextMenu);

    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("keydown", closeContextMenu);
    };
  }, [contextMenu]);

  function updateTodos(nextTodos: EisenhowerTodo[]) {
    setTodos(nextTodos);
    writeEisenhowerTodos(nextTodos);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    updateTodos([
      createEisenhowerTodo(trimmedTitle, getQuadrant(isUrgent, isImportant)),
      ...todos,
    ]);
    setTitle("");
  }

  function moveTodo(todoId: string, quadrant: EisenhowerQuadrant) {
    updateTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              quadrant,
            }
          : todo,
      ),
    );
    setDraggedTodoId(null);
  }

  function createTodoInQuadrant(quadrant: EisenhowerQuadrant) {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    updateTodos([createEisenhowerTodo(trimmedTitle, quadrant), ...todos]);
    setTitle("");
    setIsDraggingDraft(false);
  }

  function toggleDone(todoId: string) {
    updateTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              isDone: !todo.isDone,
              completedAt: todo.isDone ? null : new Date().toISOString(),
            }
          : todo,
      ),
    );
  }

  function dismissInfo() {
    window.localStorage.setItem(INFO_STORAGE_KEY, "true");
    setShowInfo(false);
  }

  function startPlasticity(todo: EisenhowerTodo, minutes: number) {
    setCurrentTask({
      id: todo.id,
      title: todo.title,
    });
    setPendingFocusSession({
      taskId: todo.id,
      taskTitle: todo.title,
      seconds: minutes * 60,
    });
    router.push("/plasticity");
  }

  function setTaskAsPriority(todo: EisenhowerTodo) {
    setCurrentTask({
      id: todo.id,
      title: todo.title,
    });
    setContextMenu(null);
  }

  function updateTimerWidgetVisibility(nextVisibility: boolean) {
    setShowTimerWidget(nextVisibility);
    window.localStorage.setItem(
      TIMER_WIDGET_STORAGE_KEY,
      JSON.stringify({
        visible: nextVisibility,
        position: timerWidgetPosition,
      }),
    );
  }

  function moveTimerWidget(position: TimerWidgetPosition) {
    setTimerWidgetPosition(position);
    setIsDraggingTimerWidget(false);
    window.localStorage.setItem(
      TIMER_WIDGET_STORAGE_KEY,
      JSON.stringify({
        visible: showTimerWidget,
        position,
      }),
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
      <section className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
              Neuroplex
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Eisenhower
            </h1>
          </div>

          <Link
            href="/dashboard"
            aria-label="Home"
            title="Home"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
          >
            <HomeIcon />
          </Link>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Task erstellen
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
            <label className="block text-sm font-medium text-zinc-700">
              Name
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task eingeben"
                draggable={title.trim().length > 0}
                onDragStart={() => {
                  if (title.trim()) {
                    setIsDraggingDraft(true);
                  }
                }}
                onDragEnd={() => setIsDraggingDraft(false)}
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
              />
            </label>

            <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(event) => setIsUrgent(event.target.checked)}
                className="h-4 w-4 accent-zinc-950"
              />
              Dringend
            </label>

            <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(event) => setIsImportant(event.target.checked)}
                className="h-4 w-4 accent-zinc-950"
              />
              Wichtig
            </label>

            <button
              type="submit"
              className="flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Erstellen
            </button>
          </div>
        </form>

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Einstellungen
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={showTimerWidget}
                onChange={(event) =>
                  updateTimerWidgetVisibility(event.target.checked)
                }
                className="h-4 w-4 accent-zinc-950"
              />
              Timer anzeigen
            </label>
            <p className="text-sm text-zinc-500">
              Timer per Drag & Drop auf oben, rechts, unten oder links ziehen.
            </p>
          </div>
        </section>

        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2">
          {QUADRANTS.map((quadrant) => {
            const quadrantTodos = activeTodos.filter(
              (todo) => todo.quadrant === quadrant.id,
            );
            const borderClass =
              quadrant.id === "urgent-important"
                ? "border-b border-zinc-200 lg:border-r"
                : quadrant.id === "not-urgent-important"
                  ? "border-b border-zinc-200"
                  : quadrant.id === "urgent-not-important"
                    ? "border-b border-zinc-200 lg:border-r lg:border-b-0"
                    : "";

            return (
              <section
                key={quadrant.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedTodoId) {
                    moveTodo(draggedTodoId, quadrant.id);
                    return;
                  }

                  if (isDraggingDraft) {
                    createTodoInQuadrant(quadrant.id);
                  }
                }}
                className={`min-h-64 p-4 ${borderClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      {quadrant.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {quadrant.description}
                    </p>
                  </div>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold tabular-nums text-zinc-600">
                    {quadrantTodos.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {quadrantTodos.map((todo) => (
                    <button
                      key={todo.id}
                      type="button"
                      draggable
                      onDragStart={() => setDraggedTodoId(todo.id)}
                      onDragEnd={() => setDraggedTodoId(null)}
                      onDoubleClick={() => toggleDone(todo.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          setFocusTodo(todo);
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setContextMenu({
                          todo,
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
                      className="block w-full cursor-grab rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-left text-sm font-medium text-zinc-900 transition hover:border-zinc-300 active:cursor-grabbing"
                    >
                      {todo.title}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
          </div>
        </div>

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Erledigt
          </p>

          {doneTodos.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Noch keine erledigten Tasks.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {doneTodos.map((todo) => (
                <button
                  key={todo.id}
                  type="button"
                  onDoubleClick={() => toggleDone(todo.id)}
                  className="block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-500"
                >
                  {todo.title}
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-6 text-zinc-950 shadow-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Bedienung
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">
              Eisenhower Matrix
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Ziehe Tasks in einen anderen Matrix-Bereich, um sie neu
              einzuordnen. Doppelklick markiert einen Task als erledigt.
            </p>

            <button
              type="button"
              onClick={dismissInfo}
              className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {focusTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-6 text-zinc-950 shadow-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Fokus starten
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">
              {focusTodo.title}
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Wie lange moechtest du mit diesem Task arbeiten?
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => startPlasticity(focusTodo, option)}
                  className="flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
                >
                  {option}m
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFocusTodo(null)}
              className="mt-5 flex h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 w-48 rounded-lg border border-zinc-200 bg-white p-1 text-zinc-950 shadow-xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            type="button"
            onClick={() => startPlasticity(contextMenu.todo, 30)}
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-zinc-100"
          >
            Start Plasticity
          </button>
          <button
            type="button"
            onClick={() => setTaskAsPriority(contextMenu.todo)}
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-zinc-100"
          >
            Set as priority
          </button>
        </div>
      )}

      {showTimerWidget && activeTimerSession && (
        <>
          {isDraggingTimerWidget && (
            <div className="fixed inset-0 z-40 pointer-events-none">
              {(["top", "right", "bottom", "left"] as const).map((position) => (
                <div
                  key={position}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => moveTimerWidget(position)}
                  className={`pointer-events-auto fixed flex items-center justify-center border border-dashed border-zinc-400 bg-white/70 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 ${
                    position === "top"
                      ? "left-1/2 top-4 h-16 w-64 -translate-x-1/2"
                      : position === "right"
                        ? "right-4 top-1/2 h-64 w-16 -translate-y-1/2"
                        : position === "bottom"
                          ? "bottom-4 left-1/2 h-16 w-64 -translate-x-1/2"
                          : "left-4 top-1/2 h-64 w-16 -translate-y-1/2"
                  }`}
                >
                  {position === "top"
                    ? "Oben"
                    : position === "right"
                      ? "Rechts"
                      : position === "bottom"
                        ? "Unten"
                        : "Links"}
                </div>
              ))}
            </div>
          )}

          <aside
            draggable
            onDragStart={() => setIsDraggingTimerWidget(true)}
            onDragEnd={() => setIsDraggingTimerWidget(false)}
            className={`fixed z-50 cursor-grab rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-950 shadow-lg active:cursor-grabbing ${
              timerWidgetPosition === "top"
                ? "left-1/2 top-4 -translate-x-1/2"
                : timerWidgetPosition === "right"
                  ? "right-4 top-1/2 -translate-y-1/2"
                  : timerWidgetPosition === "bottom"
                    ? "bottom-4 left-1/2 -translate-x-1/2"
                    : "left-4 top-1/2 -translate-y-1/2"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Timer
            </p>
            <p className="mt-2 max-w-48 truncate text-sm font-semibold">
              {activeTimerSession.timerName ?? "Plasticity"}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatSeconds(timerRemainingSeconds)}
            </p>
          </aside>
        </>
      )}
    </main>
  );
}

function getQuadrant(isUrgent: boolean, isImportant: boolean) {
  if (isUrgent && isImportant) {
    return "urgent-important";
  }

  if (!isUrgent && isImportant) {
    return "not-urgent-important";
  }

  if (isUrgent && !isImportant) {
    return "urgent-not-important";
  }

  return "not-urgent-not-important";
}

function readActiveTimerSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(ACTIVE_TIMER_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession);
    return isActiveTimerSession(parsedSession) ? parsedSession : null;
  } catch {
    return null;
  }
}

function isActiveTimerSession(value: unknown): value is ActiveTimerSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<ActiveTimerSession>;

  return (
    (session.phase === "plasticity" || session.phase === "recovery") &&
    typeof session.durationSeconds === "number" &&
    typeof session.endAt === "number"
  );
}

function getRemainingSeconds(endAt: number | undefined) {
  if (!endAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

function readTimerWidgetVisible() {
  const settings = readTimerWidgetSettings();
  return settings.visible;
}

function readTimerWidgetPosition() {
  const settings = readTimerWidgetSettings();
  return settings.position;
}

function readTimerWidgetSettings() {
  if (typeof window === "undefined") {
    return {
      visible: true,
      position: "right" as TimerWidgetPosition,
    };
  }

  const rawSettings = window.localStorage.getItem(TIMER_WIDGET_STORAGE_KEY);

  if (!rawSettings) {
    return {
      visible: true,
      position: "right" as TimerWidgetPosition,
    };
  }

  try {
    const parsedSettings = JSON.parse(rawSettings);

    return {
      visible:
        typeof parsedSettings.visible === "boolean"
          ? parsedSettings.visible
          : true,
      position: isTimerWidgetPosition(parsedSettings.position)
        ? parsedSettings.position
        : "right",
    };
  } catch {
    return {
      visible: true,
      position: "right" as TimerWidgetPosition,
    };
  }
}

function isTimerWidgetPosition(value: unknown): value is TimerWidgetPosition {
  return (
    value === "top" ||
    value === "right" ||
    value === "bottom" ||
    value === "left"
  );
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

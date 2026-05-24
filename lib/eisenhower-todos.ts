"use client";

const STORAGE_KEY = "neuroplex:eisenhower-todos";

export type EisenhowerQuadrant =
  | "urgent-important"
  | "not-urgent-important"
  | "urgent-not-important"
  | "not-urgent-not-important";

export type EisenhowerTodo = {
  id: string;
  title: string;
  quadrant: EisenhowerQuadrant;
  isDone: boolean;
  createdAt: string;
  completedAt: string | null;
};

export function readEisenhowerTodos() {
  if (typeof window === "undefined") {
    return [];
  }

  const rawTodos = window.localStorage.getItem(STORAGE_KEY);

  if (!rawTodos) {
    return [];
  }

  try {
    const parsedTodos = JSON.parse(rawTodos);

    if (!Array.isArray(parsedTodos)) {
      return [];
    }

    return parsedTodos.filter(isEisenhowerTodo);
  } catch {
    return [];
  }
}

export function writeEisenhowerTodos(todos: EisenhowerTodo[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

export function createEisenhowerTodo(
  title: string,
  quadrant: EisenhowerQuadrant,
): EisenhowerTodo {
  return {
    id: crypto.randomUUID(),
    title,
    quadrant,
    isDone: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

function isEisenhowerTodo(value: unknown): value is EisenhowerTodo {
  if (!value || typeof value !== "object") {
    return false;
  }

  const todo = value as Partial<EisenhowerTodo>;

  return (
    typeof todo.id === "string" &&
    typeof todo.title === "string" &&
    typeof todo.isDone === "boolean" &&
    typeof todo.createdAt === "string" &&
    (todo.completedAt === null || typeof todo.completedAt === "string") &&
    isQuadrant(todo.quadrant)
  );
}

function isQuadrant(value: unknown): value is EisenhowerQuadrant {
  return (
    value === "urgent-important" ||
    value === "not-urgent-important" ||
    value === "urgent-not-important" ||
    value === "not-urgent-not-important"
  );
}

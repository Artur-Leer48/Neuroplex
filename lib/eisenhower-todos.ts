"use client";

import { getScopedStorageKey } from "@/lib/scoped-storage";

const STORAGE_KEY = "neuroplex:eisenhower-todos";

export type EisenhowerQuadrant =
  | "urgent-important"
  | "not-urgent-important"
  | "urgent-not-important"
  | "not-urgent-not-important";

export type WorkItemType = "Wiederholung" | "Projekt" | "Sprint";

export type WorkItemColor =
  | "zinc"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet";

export type WorkSubtask = {
  id: string;
  title: string;
  isDone: boolean;
};

export type EisenhowerTodo = {
  id: string;
  title: string;
  quadrant: EisenhowerQuadrant;
  itemType: WorkItemType;
  color: WorkItemColor;
  description: string;
  subtasks: WorkSubtask[];
  isDone: boolean;
  createdAt: string;
  completedAt: string | null;
};

export function readEisenhowerTodos() {
  if (typeof window === "undefined") {
    return [];
  }

  const rawTodos = window.localStorage.getItem(getScopedStorageKey(STORAGE_KEY));

  if (!rawTodos) {
    return [];
  }

  try {
    const parsedTodos = JSON.parse(rawTodos);

    if (!Array.isArray(parsedTodos)) {
      return [];
    }

    return parsedTodos.filter(isEisenhowerTodo).map(normalizeEisenhowerTodo);
  } catch {
    return [];
  }
}

export function writeEisenhowerTodos(todos: EisenhowerTodo[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getScopedStorageKey(STORAGE_KEY),
    JSON.stringify(todos),
  );
}

export function createEisenhowerTodo(
  title: string,
  quadrant: EisenhowerQuadrant,
  itemType: WorkItemType = "Projekt",
  color: WorkItemColor = getDefaultColorForType(itemType),
  description = "",
  subtasks: WorkSubtask[] = [],
): EisenhowerTodo {
  return {
    id: crypto.randomUUID(),
    title,
    quadrant,
    itemType,
    color,
    description,
    subtasks,
    isDone: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function getDefaultColorForType(type: WorkItemType): WorkItemColor {
  if (type === "Wiederholung") {
    return "sky";
  }

  if (type === "Sprint") {
    return "amber";
  }

  return "emerald";
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
    isQuadrant(todo.quadrant) &&
    (typeof todo.itemType === "undefined" || isWorkItemType(todo.itemType)) &&
    (typeof todo.color === "undefined" || isWorkItemColor(todo.color)) &&
    (typeof todo.description === "undefined" ||
      typeof todo.description === "string") &&
    (typeof todo.subtasks === "undefined" ||
      (Array.isArray(todo.subtasks) && todo.subtasks.every(isWorkSubtask)))
  );
}

function normalizeEisenhowerTodo(todo: EisenhowerTodo): EisenhowerTodo {
  const itemType = isWorkItemType(todo.itemType) ? todo.itemType : "Projekt";

  return {
    ...todo,
    itemType,
    color: isWorkItemColor(todo.color)
      ? todo.color
      : getDefaultColorForType(itemType),
    description: typeof todo.description === "string" ? todo.description : "",
    subtasks: Array.isArray(todo.subtasks)
      ? todo.subtasks.filter(isWorkSubtask)
      : [],
  };
}

function isQuadrant(value: unknown): value is EisenhowerQuadrant {
  return (
    value === "urgent-important" ||
    value === "not-urgent-important" ||
    value === "urgent-not-important" ||
    value === "not-urgent-not-important"
  );
}

function isWorkItemType(value: unknown): value is WorkItemType {
  return value === "Wiederholung" || value === "Projekt" || value === "Sprint";
}

function isWorkItemColor(value: unknown): value is WorkItemColor {
  return (
    value === "zinc" ||
    value === "sky" ||
    value === "emerald" ||
    value === "amber" ||
    value === "rose" ||
    value === "violet"
  );
}

function isWorkSubtask(value: unknown): value is WorkSubtask {
  if (!value || typeof value !== "object") {
    return false;
  }

  const subtask = value as Partial<WorkSubtask>;

  return (
    typeof subtask.id === "string" &&
    typeof subtask.title === "string" &&
    typeof subtask.isDone === "boolean"
  );
}

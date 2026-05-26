"use client";

import { getScopedStorageKey } from "@/lib/scoped-storage";

const PENDING_FOCUS_STORAGE_KEY = "neuroplex:pending-focus-session";

export type PendingFocusSession = {
  taskId: string;
  taskTitle: string;
  seconds: number;
  createdAt: string;
};

export function setPendingFocusSession(
  session: Pick<PendingFocusSession, "taskId" | "taskTitle" | "seconds">,
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextSession: PendingFocusSession = {
    ...session,
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    getScopedStorageKey(PENDING_FOCUS_STORAGE_KEY),
    JSON.stringify(nextSession),
  );
}

export function consumePendingFocusSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = getScopedStorageKey(PENDING_FOCUS_STORAGE_KEY);
  const rawSession = window.localStorage.getItem(storageKey);
  window.localStorage.removeItem(storageKey);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession);
    return isPendingFocusSession(parsedSession) ? parsedSession : null;
  } catch {
    return null;
  }
}

function isPendingFocusSession(value: unknown): value is PendingFocusSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<PendingFocusSession>;

  return (
    typeof session.taskId === "string" &&
    typeof session.taskTitle === "string" &&
    typeof session.seconds === "number" &&
    typeof session.createdAt === "string"
  );
}

"use client";

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
    PENDING_FOCUS_STORAGE_KEY,
    JSON.stringify(nextSession),
  );
}

export function consumePendingFocusSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(PENDING_FOCUS_STORAGE_KEY);
  window.localStorage.removeItem(PENDING_FOCUS_STORAGE_KEY);

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

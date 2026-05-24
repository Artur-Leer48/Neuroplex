"use client";

const CURRENT_TASK_STORAGE_KEY = "neuroplex:current-task";
export const CURRENT_TASK_CHANGED_EVENT = "neuroplex:current-task-changed";

export type CurrentTask = {
  id: string;
  title: string;
  setAt: string;
};

export function readCurrentTask() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawTask = window.localStorage.getItem(CURRENT_TASK_STORAGE_KEY);

  if (!rawTask) {
    return null;
  }

  try {
    const parsedTask = JSON.parse(rawTask);
    return isCurrentTask(parsedTask) ? parsedTask : null;
  } catch {
    return null;
  }
}

export function setCurrentTask(task: Pick<CurrentTask, "id" | "title">) {
  if (typeof window === "undefined") {
    return;
  }

  const nextTask: CurrentTask = {
    id: task.id,
    title: task.title,
    setAt: new Date().toISOString(),
  };

  window.localStorage.setItem(CURRENT_TASK_STORAGE_KEY, JSON.stringify(nextTask));
  window.dispatchEvent(new Event(CURRENT_TASK_CHANGED_EVENT));
}

function isCurrentTask(value: unknown): value is CurrentTask {
  if (!value || typeof value !== "object") {
    return false;
  }

  const task = value as Partial<CurrentTask>;

  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.setAt === "string"
  );
}

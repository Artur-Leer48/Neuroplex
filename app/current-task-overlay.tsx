"use client";

import { useEffect, useState } from "react";

import {
  CURRENT_TASK_CHANGED_EVENT,
  readCurrentTask,
  type CurrentTask,
} from "@/lib/current-task";

export function CurrentTaskOverlay() {
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);

  useEffect(() => {
    function syncCurrentTask() {
      setCurrentTask(readCurrentTask());
    }

    syncCurrentTask();
    window.addEventListener("storage", syncCurrentTask);
    window.addEventListener(CURRENT_TASK_CHANGED_EVENT, syncCurrentTask);

    return () => {
      window.removeEventListener("storage", syncCurrentTask);
      window.removeEventListener(CURRENT_TASK_CHANGED_EVENT, syncCurrentTask);
    };
  }, []);

  if (!currentTask) {
    return null;
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 max-w-xs rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-950 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Current Task
      </p>
      <p className="mt-2 text-sm font-semibold">{currentTask.title}</p>
    </aside>
  );
}

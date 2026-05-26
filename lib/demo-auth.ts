"use client";

import type { Session } from "@supabase/supabase-js";

import { clearStorageScope, setStorageScope } from "@/lib/scoped-storage";

const DEMO_MODE_STORAGE_KEY = "neuroplex:demo-mode";
const SESSION_TIMEOUT_MS = 3000;

export function startDemoMode() {
  window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, "true");
  setStorageScope("demo");
}

export function stopDemoMode() {
  window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  clearStorageScope();
}

export function isDemoMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true";
}

export async function hasDemoOrSupabaseSession(
  getSession: () => Promise<{
    data: {
      session: Session | null;
    };
    error: unknown;
  }>,
) {
  if (isDemoMode()) {
    setStorageScope("demo");

    return {
      isDemo: true,
      session: null,
      error: null,
    };
  }

  try {
    const { data, error } = await withTimeout(getSession(), SESSION_TIMEOUT_MS);

    if (data.session?.user.id) {
      setStorageScope(`user:${data.session.user.id}`);
    } else {
      clearStorageScope();
    }

    return {
      isDemo: false,
      session: data.session,
      error,
    };
  } catch (error) {
    clearStorageScope();

    return {
      isDemo: false,
      session: null,
      error,
    };
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Session check timed out."));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

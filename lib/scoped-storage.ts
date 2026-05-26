"use client";

const STORAGE_SCOPE_KEY = "neuroplex:storage-scope";
const DEFAULT_SCOPE = "anonymous";

export function setStorageScope(scope: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_SCOPE_KEY, scope);
}

export function clearStorageScope() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_SCOPE_KEY);
}

export function getScopedStorageKey(key: string) {
  if (typeof window === "undefined") {
    return key;
  }

  const scope = window.localStorage.getItem(STORAGE_SCOPE_KEY) ?? DEFAULT_SCOPE;
  return `${key}:${scope}`;
}

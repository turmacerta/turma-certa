"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_EVENT = "tc-storage";

function noopSubscribe() {
  return () => {};
}

export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

export function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useStoredValue(key: string) {
  return useSyncExternalStore(
    subscribeStorage,
    () => readStorage(key),
    () => null,
  );
}

export function usePersistentState<T extends string>(key: string, initial: T, allowed?: readonly T[]) {
  const stored = useStoredValue(key) as T | null;
  const value = stored && (!allowed || allowed.includes(stored)) ? stored : initial;
  const update = useCallback((next: T) => writeStorage(key, next), [key]);
  return [value, update] as const;
}

function subscribeMedia(query: string) {
  return (callback: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  };
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

let nowSnapshot: Date | null = null;
const nowListeners = new Set<() => void>();
let nowTimer: number | null = null;

function subscribeNow(callback: () => void) {
  nowListeners.add(callback);
  if (nowTimer === null) {
    nowSnapshot = new Date();
    nowTimer = window.setInterval(() => {
      nowSnapshot = new Date();
      nowListeners.forEach((listener) => listener());
    }, 30_000);
  }
  return () => {
    nowListeners.delete(callback);
    if (nowListeners.size === 0 && nowTimer !== null) {
      window.clearInterval(nowTimer);
      nowTimer = null;
    }
  };
}

export function useNow() {
  return useSyncExternalStore(
    subscribeNow,
    () => nowSnapshot ?? (nowSnapshot = new Date()),
    () => null,
  );
}

export function useClearQuery() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => router.replace(pathname), [router, pathname]);
}

export function useQueryParam(name: string) {
  return useSearchParams().get(name);
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { errorMessage } from "./errors";
import { useI18n } from "./i18n";

export { usePersistentState } from "./client-store";

type ApiState<T> = { path: string | null; data: T | null; error: unknown };

const STAFF_HEADERS = { "x-act-as": "" };

export function useApi<T>(path: string | null, options: { asStaff?: boolean } = {}) {
  const asStaff = Boolean(options.asStaff);
  const { t } = useI18n();
  const [state, setState] = useState<ApiState<T>>({ path: null, data: null, error: null });

  useEffect(() => {
    if (!path) {
      return;
    }
    let active = true;
    api<T>(path, asStaff ? { headers: STAFF_HEADERS } : undefined).then(
      (data) => {
        if (active) setState({ path, data, error: null });
      },
      (error: unknown) => {
        if (active) setState({ path, data: null, error });
      },
    );
    return () => {
      active = false;
    };
  }, [path, asStaff]);

  const reload = useCallback(async () => {
    if (!path) {
      return;
    }
    try {
      const data = await api<T>(path, asStaff ? { headers: STAFF_HEADERS } : undefined);
      setState({ path, data, error: null });
    } catch (error) {
      setState((current) => ({ path, data: current.path === path ? current.data : null, error }));
    }
  }, [path, asStaff]);

  const setData = useCallback((data: T) => setState({ path, data, error: null }), [path]);
  const current = state.path === path;

  return {
    data: current ? state.data : null,
    error: current && state.error ? errorMessage(state.error, t) : null,
    loading: Boolean(path) && !current,
    reload,
    setData,
  };
}

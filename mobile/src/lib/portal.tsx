import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LinkedStudent, PortalOverview } from "@turma-certa/types";
import { useApi } from "./use-api";

type PortalContextValue = {
  students: LinkedStudent[];
  studentId: string | null;
  setStudentId: (id: string) => void;
  overview: PortalOverview | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const PortalContext = createContext<PortalContextValue | null>(null);
const KEY = "tc-mobile-student";

export function PortalProvider({ children }: { children: ReactNode }) {
  const linked = useApi<LinkedStudent[]>("/api/v1/me/students");
  const [studentId, setStudentIdState] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((value) => {
      if (value) setStudentIdState(value);
    });
  }, []);

  useEffect(() => {
    const list = linked.data ?? [];
    if (!list.length) return;
    if (!studentId || !list.some((item) => item.id === studentId)) {
      const next = list[0]?.id ?? null;
      setStudentIdState(next);
      if (next) void AsyncStorage.setItem(KEY, next);
    }
  }, [linked.data, studentId]);

  const overview = useApi<PortalOverview>(studentId ? `/api/v1/me/students/${studentId}` : null);

  const value = useMemo<PortalContextValue>(
    () => ({
      students: linked.data ?? [],
      studentId,
      setStudentId: (id) => {
        setStudentIdState(id);
        void AsyncStorage.setItem(KEY, id);
      },
      overview: overview.data,
      loading: linked.loading || overview.loading,
      error: linked.error || overview.error,
      reload: () => {
        linked.reload();
        overview.reload();
      },
    }),
    [linked.data, linked.loading, linked.error, studentId, overview.data, overview.loading, overview.error, linked, overview],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("PortalProvider missing");
  return ctx;
}

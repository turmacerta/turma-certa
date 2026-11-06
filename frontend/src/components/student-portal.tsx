"use client";

import { createContext, useContext, useMemo } from "react";
import { api } from "@/lib/api";
import { useStoredValue, writeStorage } from "@/lib/client-store";
import { useApi } from "@/lib/use-api";
import { useOrg } from "./org-provider";

const STUDENT_KEY = "tc-view-student";

export type LessonStatus = "booked" | "attended" | "absent" | "cancelled_with_credit" | "cancelled_late" | "cancelled_by_school";

export type PortalLesson = {
  id: string;
  startsAt: string;
  endsAt: string;
  teacher: string;
  space: string;
  sport: string | null;
  title: string;
  kind: "regular" | "makeup";
  status: LessonStatus;
};

export type PortalSlot = Omit<PortalLesson, "status"> & { status: "open"; vacancies: number };

export type PortalOverview = {
  student: { id: string; full_name: string; photo_url: string | null; organization: { id: string; name: string } | null };
  rules: { noticeHours: number; creditDays: number; maxCredits: number };
  lessons: PortalLesson[];
  slots: PortalSlot[];
  credits: { balance: number; nextExpiry: string | null };
  subscription: { status: string; current_period_end: string; billing_plan: { name: string; price_cents: number; lessons_per_cycle: number | null } | null } | null;
  invoices: Array<{ id: string; amount_cents: number; status: string; due_date: string }>;
  alertOn: boolean;
  notifications: Array<{ id: string; kind: string; title: string; body: string; created_at: string }>;
};

type LinkedStudent = { id: string; full_name: string; organization?: { id: string; name: string } | null; relation?: "self" | "guardian" };

type PortalValue = {
  students: LinkedStudent[];
  studentId: string | null;
  setStudentId: (id: string) => void;
  data: PortalOverview | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  call: (path: string, method?: "POST" | "DELETE" | "PUT", body?: unknown) => Promise<unknown>;
};

const PortalContext = createContext<PortalValue | null>(null);

export function hoursUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

export function StudentPortalProvider({ children }: { children: React.ReactNode }) {
  const org = useOrg();
  const staffPreview = org.realPersona !== "student";
  const linked = useApi<LinkedStudent[]>(staffPreview ? `/api/v1/me/students/staff/${org.orgId}` : "/api/v1/me/students");
  const stored = useStoredValue(STUDENT_KEY);
  const students = useMemo(
    () => (linked.data ?? []).filter((student) => staffPreview || !student.organization || student.organization.id === org.orgId),
    [linked.data, staffPreview, org.orgId],
  );
  const studentId = students.find((student) => student.id === stored)?.id ?? students[0]?.id ?? null;
  const overview = useApi<PortalOverview>(studentId ? `/api/v1/me/students/${studentId}` : null);
  const reloadOverview = overview.reload;

  const value = useMemo<PortalValue>(
    () => ({
      students,
      studentId,
      setStudentId: (id: string) => writeStorage(STUDENT_KEY, id),
      data: overview.data,
      error: linked.error ?? overview.error,
      loading: (!linked.data && !linked.error) || (Boolean(studentId) && !overview.data && !overview.error),
      reload: reloadOverview,
      call: async (path, method = "POST", body) => {
        const result = await api(`/api/v1/me/students/${studentId}${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
        await reloadOverview();
        return result;
      },
    }),
    [students, studentId, overview.data, overview.error, reloadOverview, linked.data, linked.error],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function useStudentPortal() {
  const value = useContext(PortalContext);
  if (!value) {
    throw new Error("useStudentPortal must be used inside StudentPortalProvider");
  }
  return value;
}

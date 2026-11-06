"use client";

import { useState } from "react";
import { CalendarX } from "lucide-react";
import { api } from "@/lib/api";
import { classTitle } from "@/lib/classes";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { ClassDetail, NotifySummary, SessionRow } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { useOrg } from "./org-provider";
import { Drawer, useToast } from "./overlay";
import { Avatar, Badge, Button, EmptyState, ErrorState, InlineAlert, LoadingList, MockBadge, TextArea } from "./ui";

type CancelResponse = { session: SessionRow; notified: NotifySummary | null };

type DrawerProps = { orgId: string; session: SessionRow | null; onClose: () => void; onChanged: (session: SessionRow) => void };

export function SessionDrawer(props: DrawerProps) {
  return <SessionDrawerBody key={props.session?.id ?? "closed"} {...props} />;
}

function SessionDrawerBody({ orgId, session, onClose, onChanged }: DrawerProps) {
  const { t, format } = useI18n();
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { can } = useOrg();
  const canCancel = can("schedule.manage", "schedule.cancel_own");
  const classId = session?.class_group?.id;
  const detail = useApi<ClassDetail>(session && classId ? `/api/v1/organizations/${orgId}/classes/${classId}` : null);
  const recorded = useApi<Array<{ student_id: string; status: string; student: { id: string; full_name: string; class_level_id: string | null; photo_url?: string | null } | null }>>(
    session ? `/api/v1/organizations/${orgId}/schedule/sessions/${session.id}/attendance` : null,
  );

  const enrolled = (detail.data?.enrollments ?? []).filter((item) => item.status === "active" && item.student).map((item) => item.student!);
  const guests = (recorded.data ?? []).filter((row) => row.student && !enrolled.some((student) => student.id === row.student_id)).map((row) => row.student!);
  const students = [...enrolled, ...guests];
  const guestIds = new Set(guests.map((student) => student.id));
  const excusedIds = new Set((recorded.data ?? []).filter((row) => row.status === "cancelled").map((row) => row.student_id));
  const cancelled = Boolean(session?.cancelled_at);
  const upcoming = session ? new Date(session.ends_at) > new Date() : false;

  async function setCancelled(next: boolean) {
    if (!session) {
      return;
    }
    setBusy(true);
    try {
      const result = await api<CancelResponse>(`/api/v1/organizations/${orgId}/schedule/sessions/${session.id}/${next ? "cancel" : "restore"}`, {
        method: "POST",
        body: JSON.stringify(next && reason.trim() ? { reason: reason.trim() } : {}),
      });
      const count = result.notified?.recipients ?? 0;
      onChanged(result.session);
      setCancelling(false);
      setReason("");
      toast({
        message: next ? t.cancelLesson.cancelled(count) : t.cancelLesson.restored(count),
        action: next ? { label: t.common.undo, onClick: () => void setCancelled(false) } : undefined,
      });
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={Boolean(session)}
      onClose={onClose}
      title={detail.data ? classTitle(detail.data, t) : (session?.class_group?.name ?? t.attendance.title)}
      subtitle={
        session ? (
          <span>
            {format.longDate(session.starts_at)} · {format.time(session.starts_at)}–{format.time(session.ends_at)}
            {session.space ? ` · ${session.space.name}` : ""}
          </span>
        ) : null
      }
      footer={
        cancelling ? (
          <>
            <Button variant="ghost" onClick={() => setCancelling(false)}>
              {t.cancelLesson.back}
            </Button>
            <Button variant="danger" onClick={() => void setCancelled(true)} loading={busy}>
              {t.cancelLesson.confirm}
            </Button>
          </>
        ) : null
      }
    >
      {cancelled ? (
        <div className="mb-4">
          <InlineAlert
            tone="danger"
            title={t.cancelLesson.cancelledTitle}
            action={
              upcoming && canCancel ? (
                <Button variant="outline" size="sm" onClick={() => void setCancelled(false)} loading={busy}>
                  {t.cancelLesson.restore}
                </Button>
              ) : null
            }
          >
            {session?.cancel_reason ? t.cancelLesson.cancelledReason(session.cancel_reason) : t.cancelLesson.cancelledText}
          </InlineAlert>
        </div>
      ) : null}
      {cancelling ? (
        <div className="grid gap-4">
          <TextArea
            label={t.cancelLesson.reason}
            optional
            autoFocus
            maxLength={200}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t.cancelLesson.reasonPlaceholder}
          />
          <div className="grid gap-1 rounded-2xl border border-line bg-surface-2 p-4">
            <p className="text-sm">{t.cancelLesson.notice(students.length)}</p>
            <p className="flex items-center gap-2 text-sm font-semibold">
              {t.cancelLesson.channels}
              <MockBadge />
            </p>
          </div>
        </div>
      ) : null}
      {!cancelled && !cancelling && upcoming && canCancel ? (
        <div className="mb-4 flex justify-end">
          <Button variant="quiet-danger" size="sm" onClick={() => setCancelling(true)}>
            <CalendarX className="h-4 w-4" />
            {t.cancelLesson.action}
          </Button>
        </div>
      ) : null}
      {cancelled || cancelling ? null : (
        <>
      {detail.loading ? <LoadingList rows={4} /> : null}
      {detail.error ? <ErrorState message={detail.error} onRetry={() => void detail.reload()} /> : null}
      {!detail.loading && !detail.error && students.length === 0 ? <EmptyState inset title={t.attendance.emptyTitle} description={t.attendance.emptyText} /> : null}
      <ul className="grid gap-2">
        {students.map((student) => {
          return (
            <li key={student.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
              <Avatar name={student.full_name} src={student.photo_url} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{student.full_name}</span>
                  {guestIds.has(student.id) ? <Badge tone="primary">{t.studentArea.makeupBadge}</Badge> : null}
                  {excusedIds.has(student.id) ? <Badge tone="warning">{t.attendance.excused}</Badge> : null}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
        </>
      )}
    </Drawer>
  );
}

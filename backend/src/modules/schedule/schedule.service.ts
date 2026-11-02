import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { notificationService } from "../notifications/notification.service";
import { expiresIn, lessonRules } from "../../shared/rules";
import type { z } from "zod";
import type { attendanceSchema, cancelSessionSchema, generateSessionsSchema } from "./schedule.schema";

const SESSION_FIELDS = `
  *,
  class_group:class_groups!inner(id, name, organization_id, format, organization:organizations(id, name)),
  teacher:teachers(id, full_name),
  space:spaces(id, name)
`;

function nextDate(from: Date, weekday: number) {
  const date = new Date(from);
  const delta = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function atTime(date: Date, time: string) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const copy = new Date(date);
  copy.setHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);
  return copy;
}

export class ScheduleService {
  async list(orgId: string, from: string, to: string, teacherId: string | null = null) {
    let query = getAdminClient()
      .from("class_sessions")
      .select(SESSION_FIELDS)
      .eq("class_group.organization_id", orgId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at");

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    return unwrap(await query);
  }

  async listForProfile(profileId: string, from: string, to: string) {
    const teachers = unwrap(
      await getAdminClient().from("teachers").select("id").eq("profile_id", profileId),
    );
    const ids = (teachers ?? []).map((row) => row.id as string);

    if (ids.length === 0) {
      return [];
    }

    return unwrap(
      await getAdminClient()
        .from("class_sessions")
        .select(SESSION_FIELDS)
        .in("teacher_id", ids)
        .gte("starts_at", from)
        .lt("starts_at", to)
        .order("starts_at"),
    );
  }

  async generate(orgId: string, input: z.infer<typeof generateSessionsSchema>) {
    const classGroup = unwrap(
      await getAdminClient()
        .from("class_groups")
        .select("id, space_id, teacher_id, class_schedules(*)")
        .eq("organization_id", orgId)
        .eq("id", input.classGroupId)
        .maybeSingle(),
    );

    if (!classGroup) {
      throw Errors.notFound("Class");
    }

    const schedules = (classGroup.class_schedules ?? []) as Array<{
      weekday: number;
      starts_at: string;
      ends_at: string;
    }>;

    if (schedules.length === 0) {
      throw Errors.validation({ schedules: "NO_SCHEDULE" });
    }

    const rows: Array<{
      class_group_id: string;
      space_id: string | null;
      teacher_id: string | null;
      starts_at: string;
      ends_at: string;
    }> = [];

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const existing = unwrap(
      await getAdminClient()
        .from("class_sessions")
        .select("starts_at")
        .eq("class_group_id", classGroup.id)
        .gte("starts_at", start.toISOString()),
    );
    const taken = new Set((existing ?? []).map((row) => new Date(row.starts_at as string).getTime()));

    for (let week = 0; week < input.weeks; week += 1) {
      for (const schedule of schedules) {
        const day = nextDate(start, schedule.weekday);
        day.setDate(day.getDate() + week * 7);
        const startsAt = atTime(day, schedule.starts_at);
        if (startsAt <= now || taken.has(startsAt.getTime())) {
          continue;
        }
        rows.push({
          class_group_id: classGroup.id as string,
          space_id: (classGroup.space_id as string | null) ?? null,
          teacher_id: (classGroup.teacher_id as string | null) ?? null,
          starts_at: atTime(day, schedule.starts_at).toISOString(),
          ends_at: atTime(day, schedule.ends_at).toISOString(),
        });
      }
    }

    if (rows.length === 0) {
      return [];
    }

    return unwrap(
      await getAdminClient().from("class_sessions").insert(rows).select("*"),
    );
  }

  async setCancelled(
    orgId: string,
    sessionId: string,
    cancelled: boolean,
    input: z.infer<typeof cancelSessionSchema>,
    teacherId: string | null,
  ) {
    let query = getAdminClient()
      .from("class_sessions")
      .select("id, ends_at, teacher_id, cancelled_at, class_group:class_groups!inner(organization_id)")
      .eq("id", sessionId)
      .eq("class_group.organization_id", orgId);

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    const session = unwrap(await query.maybeSingle());

    if (!session) {
      throw Errors.notFound("Session");
    }

    if (new Date(session.ends_at as string) < new Date()) {
      throw Errors.conflict("This lesson already happened.", "SESSION_PAST");
    }

    const changed = Boolean(session.cancelled_at) !== cancelled;

    const updated = unwrap(
      await getAdminClient()
        .from("class_sessions")
        .update(
          cancelled
            ? { cancelled_at: session.cancelled_at ?? new Date().toISOString(), cancel_reason: input.reason ?? null }
            : { cancelled_at: null, cancel_reason: null },
        )
        .eq("id", sessionId)
        .select(SESSION_FIELDS)
        .single(),
    );

    if (changed) {
      await this.schoolCancelCredits(orgId, sessionId, cancelled);
    }

    const notified = changed
      ? await notificationService.notifySession(orgId, sessionId, cancelled ? "session_cancelled" : "session_restored")
      : null;

    return { session: updated, notified };
  }

  async attendance(orgId: string, sessionId: string) {
    const session = unwrap(
      await getAdminClient()
        .from("class_sessions")
        .select("id, class_group:class_groups!inner(organization_id)")
        .eq("id", sessionId)
        .eq("class_group.organization_id", orgId)
        .maybeSingle(),
    );
    if (!session) {
      throw Errors.notFound("Session");
    }
    return unwrap(
      await getAdminClient().from("attendance").select("student_id, status, student:students(*)").eq("class_session_id", sessionId),
    );
  }

  private async schoolCancelCredits(orgId: string, sessionId: string, cancelled: boolean) {
    const reason = `school_cancel:${sessionId}`;
    if (!cancelled) {
      unwrap(await getAdminClient().from("lesson_credits").delete().eq("reason", reason));
      return;
    }
    const rules = await lessonRules(orgId);
    if (!rules.rainCredit) return;
    const session = unwrap(await getAdminClient().from("class_sessions").select("class_group_id").eq("id", sessionId).maybeSingle());
    const enrollments = unwrap(
      await getAdminClient().from("enrollments").select("student_id").eq("class_group_id", session?.class_group_id ?? "").eq("status", "active"),
    ) ?? [];
    if (!enrollments.length) return;
    unwrap(
      await getAdminClient().from("lesson_credits").insert(
        enrollments.map((row) => ({
          organization_id: orgId,
          student_id: row.student_id,
          kind: "makeup",
          quantity: 1,
          reason,
          expires_at: expiresIn(rules.creditDays),
        })),
      ),
    );
  }

  async markAttendance(
    orgId: string,
    sessionId: string,
    input: z.infer<typeof attendanceSchema>,
  ) {
    const session = unwrap(
      await getAdminClient()
        .from("class_sessions")
        .select("id, class_group:class_groups!inner(organization_id)")
        .eq("id", sessionId)
        .eq("class_group.organization_id", orgId)
        .maybeSingle(),
    );

    if (!session) {
      throw Errors.notFound("Session");
    }

    return unwrap(
      await getAdminClient()
        .from("attendance")
        .upsert(
          {
            class_session_id: sessionId,
            student_id: input.studentId,
            status: input.status,
            makeup_session_id: input.makeupSessionId ?? null,
          },
          { onConflict: "class_session_id,student_id" },
        )
        .select("*")
        .single(),
    );
  }
}

export const scheduleService = new ScheduleService();

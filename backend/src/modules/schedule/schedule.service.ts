import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { notificationService } from "../notifications/notification.service";
import { expiresIn, lessonRules } from "../../shared/rules";
import {
  HORIZON_DAYS,
  addBrtDays,
  brtParts,
  brtWallTime,
  horizonEndExclusive,
  startOfBrtDay,
} from "../../shared/timezone";
import type { z } from "zod";
import type { cancelSessionSchema } from "./schedule.schema";

const SESSION_FIELDS = `
  *,
  class_group:class_groups!inner(id, name, organization_id, format, organization:organizations(id, name)),
  teacher:teachers(id, full_name),
  space:spaces(id, name)
`;

type ClassRow = {
  id: string;
  organization_id: string;
  space_id: string | null;
  teacher_id: string | null;
  class_schedules: Array<{ weekday: number; starts_at: string; ends_at: string }> | null;
};

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

  /** Fill the rolling BRT horizon for one class or every active class. */
  async ensureHorizon(options: { orgId?: string; classGroupId?: string } = {}) {
    const classes = await this.loadActiveClasses(options);
    let created = 0;
    for (const classGroup of classes) {
      created += await this.ensureClassHorizon(classGroup);
    }
    return { classes: classes.length, created, horizonDays: HORIZON_DAYS };
  }

  /** Delete (or cancel if attendance exists) future sessions past the horizon. */
  async trimBeyondHorizon(options: { orgId?: string; classGroupId?: string } = {}) {
    const end = horizonEndExclusive().toISOString();
    let query = getAdminClient()
      .from("class_sessions")
      .select("id, class_group:class_groups!inner(organization_id, id)")
      .gte("starts_at", end)
      .is("cancelled_at", null);

    if (options.classGroupId) {
      query = query.eq("class_group_id", options.classGroupId);
    }
    if (options.orgId) {
      query = query.eq("class_group.organization_id", options.orgId);
    }

    const future = (unwrap(await query) ?? []) as Array<{ id: string }>;
    const ids = future.map((row) => row.id);
    if (!ids.length) {
      return { removed: 0, cancelled: 0 };
    }

    const used = (unwrap(
      await getAdminClient().from("attendance").select("class_session_id").in("class_session_id", ids),
    ) ?? []) as Array<{ class_session_id: string }>;
    const kept = new Set(used.map((row) => row.class_session_id));
    const removable = ids.filter((id) => !kept.has(id));
    const now = new Date().toISOString();

    if (removable.length) {
      unwrap(await getAdminClient().from("class_sessions").delete().in("id", removable));
    }
    if (kept.size) {
      unwrap(await getAdminClient().from("class_sessions").update({ cancelled_at: now }).in("id", [...kept]));
    }

    return { removed: removable.length, cancelled: kept.size };
  }

  async maintainHorizon() {
    const ensured = await this.ensureHorizon();
    const trimmed = await this.trimBeyondHorizon();
    return { ...ensured, ...trimmed };
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

  private async loadActiveClasses(options: { orgId?: string; classGroupId?: string }) {
    let query = getAdminClient()
      .from("class_groups")
      .select("id, organization_id, space_id, teacher_id, class_schedules(*)")
      .eq("is_active", true);

    if (options.orgId) {
      query = query.eq("organization_id", options.orgId);
    }
    if (options.classGroupId) {
      query = query.eq("id", options.classGroupId);
    }

    return ((unwrap(await query) ?? []) as unknown as ClassRow[]).filter(
      (row) => (row.class_schedules ?? []).length > 0,
    );
  }

  private async ensureClassHorizon(classGroup: ClassRow) {
    const schedules = classGroup.class_schedules ?? [];
    if (!schedules.length) {
      return 0;
    }

    const now = new Date();
    const start = startOfBrtDay(now);
    const end = horizonEndExclusive(now);

    const existing = unwrap(
      await getAdminClient()
        .from("class_sessions")
        .select("starts_at")
        .eq("class_group_id", classGroup.id)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString()),
    );
    const taken = new Set((existing ?? []).map((row) => new Date(row.starts_at as string).getTime()));

    const rows: Array<{
      class_group_id: string;
      space_id: string | null;
      teacher_id: string | null;
      starts_at: string;
      ends_at: string;
    }> = [];

    for (let offset = 0; offset <= HORIZON_DAYS; offset += 1) {
      const day = addBrtDays(start, offset);
      const weekday = brtParts(day).weekday;
      for (const schedule of schedules) {
        if (schedule.weekday !== weekday) {
          continue;
        }
        const startsAt = brtWallTime(day, schedule.starts_at);
        const endsAt = brtWallTime(day, schedule.ends_at);
        if (startsAt <= now || startsAt >= end || taken.has(startsAt.getTime())) {
          continue;
        }
        rows.push({
          class_group_id: classGroup.id,
          space_id: classGroup.space_id,
          teacher_id: classGroup.teacher_id,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        });
        taken.add(startsAt.getTime());
      }
    }

    if (!rows.length) {
      return 0;
    }

    unwrap(await getAdminClient().from("class_sessions").insert(rows).select("id"));
    return rows.length;
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
}

export const scheduleService = new ScheduleService();

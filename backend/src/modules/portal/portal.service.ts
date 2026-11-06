import type { Request } from "express";
import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { orgRoles, permissionsFor, type MemberRole } from "../../shared/permissions";
import { expiresIn, lessonRules } from "../../shared/rules";
import { HORIZON_DAYS } from "../../shared/timezone";

type StudentRow = {
  id: string;
  full_name: string;
  photo_url?: string | null;
  profile_id: string | null;
  organization_id: string;
  class_level_id: string | null;
  guardian: { profile_id: string | null } | Array<{ profile_id: string | null }> | null;
  organization: { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

type SessionRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  cancelled_at: string | null;
  class_group_id: string;
  teacher: { full_name: string } | null;
  space: { name: string } | null;
  class_group: { id: string; name: string; max_capacity: number; sport_id: string; class_level_id: string | null; unit_id: string | null; sport: { name: string } | null; class_level: { name: string } | null } | null;
};

const SESSION_FIELDS =
  "id, starts_at, ends_at, cancelled_at, class_group_id, teacher:teachers(full_name), space:spaces(name), class_group:class_groups!inner(id, name, max_capacity, sport_id, class_level_id, unit_id, organization_id, sport:sports(name), class_level:class_levels(name))";

function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function days(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

function lessonOf(session: SessionRow, kind: "regular" | "makeup", status: string) {
  const group = one(session.class_group);
  return {
    id: session.id,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    teacher: one(session.teacher)?.full_name ?? "",
    space: one(session.space)?.name ?? "",
    sport: one(group?.sport)?.name ?? null,
    title: [one(group?.sport)?.name, one(group?.class_level)?.name].filter(Boolean).join(" · ") || (group?.name ?? ""),
    kind,
    status,
  };
}

async function staffCanView(req: Request, orgId: string) {
  if (req.user?.isPlatformAdmin) return true;
  const membership = req.memberships?.find((item) => item.organizationId === orgId);
  if (!membership) return false;
  return permissionsFor(await orgRoles(orgId), membership.role as MemberRole, membership.roleId).includes("students.view_all");
}

export class PortalService {
  async linkedStudents(profileId: string) {
    const own = unwrap(
      await getAdminClient().from("students").select("id, full_name, organization:organizations(id, name)").eq("profile_id", profileId),
    );
    const children = unwrap(
      await getAdminClient()
        .from("students")
        .select("id, full_name, organization:organizations(id, name), guardian:guardians!inner(profile_id)")
        .eq("guardian.profile_id", profileId),
    );
    return [
      ...(own ?? []).map((row) => ({ id: row.id, full_name: row.full_name, organization: one(row.organization as unknown), relation: "self" })),
      ...(children ?? []).map((row) => ({ id: row.id, full_name: row.full_name, organization: one(row.organization as unknown), relation: "guardian" })),
    ];
  }

  async studentsForStaff(req: Request, orgId: string) {
    if (!(await staffCanView(req, orgId))) throw Errors.forbidden();
    return unwrap(await getAdminClient().from("students").select("id, full_name").eq("organization_id", orgId).order("full_name"));
  }

  async access(req: Request, studentId: string) {
    const student = unwrap(
      await getAdminClient()
        .from("students")
        .select("*, guardian:guardians(profile_id), organization:organizations(id, name)")
        .eq("id", studentId)
        .maybeSingle(),
    ) as StudentRow | null;
    if (!student) throw Errors.notFound("Student");
    const userId = req.user?.id;
    const linked = student.profile_id === userId || one(student.guardian)?.profile_id === userId;
    if (!linked && !(await staffCanView(req, student.organization_id))) throw Errors.forbidden();
    return student;
  }

  async overview(req: Request, studentId: string) {
    const student = await this.access(req, studentId);
    const orgId = student.organization_id;
    const rules = await lessonRules(orgId);

    const enrollments = unwrap(
      await getAdminClient().from("enrollments").select("class_group_id").eq("student_id", studentId).eq("status", "active"),
    );
    const classIds = (enrollments ?? []).map((row) => row.class_group_id as string);

    const regular = classIds.length
      ? ((unwrap(
          await getAdminClient().from("class_sessions").select(SESSION_FIELDS).in("class_group_id", classIds).gte("starts_at", days(-30)).lt("starts_at", days(HORIZON_DAYS + 1)).order("starts_at"),
        ) ?? []) as unknown as SessionRow[])
      : [];

    const attendance = unwrap(
      await getAdminClient().from("attendance").select("class_session_id, status").eq("student_id", studentId),
    ) ?? [];
    const statusBySession = new Map(attendance.map((row) => [row.class_session_id as string, row.status as string]));

    const credits = unwrap(
      await getAdminClient().from("lesson_credits").select("quantity, reason, expires_at, kind").eq("student_id", studentId),
    ) ?? [];
    const creditedCancels = new Set(credits.filter((row) => (row.reason as string | null)?.startsWith("cancel:")).map((row) => (row.reason as string).slice(7)));
    const today = new Date().toISOString().slice(0, 10);
    const makeupCredits = credits.filter((row) => row.kind === "makeup" && (!row.expires_at || (row.expires_at as string) >= today));
    const balance = Math.max(0, makeupCredits.reduce((sum, row) => sum + (row.quantity as number), 0));
    const nextExpiry = makeupCredits.filter((row) => (row.quantity as number) > 0 && row.expires_at).map((row) => row.expires_at as string).sort()[0] ?? null;

    const guestIds = attendance
      .filter((row) => !regular.some((session) => session.id === row.class_session_id))
      .map((row) => row.class_session_id as string);
    const guest = guestIds.length
      ? ((unwrap(await getAdminClient().from("class_sessions").select(SESSION_FIELDS).in("id", guestIds)) ?? []) as unknown as SessionRow[])
      : [];

    const now = Date.now();
    const lessons = [
      ...regular.map((session) => {
        const mark = statusBySession.get(session.id);
        const status = session.cancelled_at
          ? "cancelled_by_school"
          : mark === "cancelled"
            ? creditedCancels.has(session.id)
              ? "cancelled_with_credit"
              : "cancelled_late"
            : mark === "present" || mark === "makeup"
              ? "attended"
              : mark === "absent"
                ? "absent"
                : "booked";
        return lessonOf(session, "regular", status);
      }),
      ...guest.map((session) => {
        const mark = statusBySession.get(session.id);
        const status = session.cancelled_at ? "cancelled_by_school" : mark === "absent" ? "absent" : mark === "present" || new Date(session.ends_at).getTime() < now ? "attended" : "booked";
        return lessonOf(session, "makeup", status);
      }),
    ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    const subscription = one(
      unwrap(
        await getAdminClient()
          .from("student_subscriptions")
          .select("id, status, current_period_end, billing_plan:billing_plans(name, price_cents, lessons_per_cycle)")
          .eq("student_id", studentId)
          .order("current_period_end", { ascending: false })
          .limit(1),
      ) as unknown[],
    );

    const invoices = unwrap(
      await getAdminClient().from("invoices").select("id, amount_cents, status, due_date").eq("student_id", studentId).order("due_date", { ascending: false }).limit(6),
    );

    const alerts = unwrap(await getAdminClient().from("vacancy_alerts").select("id").eq("student_id", studentId).eq("is_active", true).limit(1));
    const notifications = await getAdminClient()
      .from("notifications")
      .select("id, kind, title, body, created_at")
      .eq("student_id", studentId)
      .neq("kind", "renewal_request")
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      student: { id: student.id, full_name: student.full_name, photo_url: student.photo_url ?? null, organization: one(student.organization) },
      rules,
      lessons,
      slots: await this.slots(student, classIds, guestIds, rules.sameLevel, rules.anyUnit),
      credits: { balance, nextExpiry },
      subscription,
      invoices: invoices ?? [],
      alertOn: (alerts ?? []).length > 0,
      notifications: notifications.data ?? [],
    };
  }

  private async slots(student: StudentRow, classIds: string[], bookedIds: string[], sameLevel: boolean, anyUnit: boolean) {
    const own = classIds.length
      ? (unwrap(await getAdminClient().from("class_groups").select("sport_id, unit_id").in("id", classIds)) ?? [])
      : [];
    const sports = [...new Set(own.map((row) => row.sport_id as string))];
    const units = [...new Set(own.map((row) => row.unit_id as string | null).filter(Boolean))] as string[];
    if (!sports.length) return [];

    let query = getAdminClient()
      .from("class_sessions")
      .select(SESSION_FIELDS)
      .eq("class_group.organization_id", student.organization_id)
      .in("class_group.sport_id", sports)
      .is("cancelled_at", null)
      .gte("starts_at", new Date().toISOString())
      .lt("starts_at", days(HORIZON_DAYS + 1))
      .order("starts_at")
      .limit(60);
    if (sameLevel && student.class_level_id) query = query.eq("class_group.class_level_id", student.class_level_id);
    if (!anyUnit && units.length) query = query.in("class_group.unit_id", units);
    const sessions = ((unwrap(await query) ?? []) as unknown as SessionRow[]).filter(
      (session) => !classIds.includes(session.class_group_id) && !bookedIds.includes(session.id),
    );
    if (!sessions.length) return [];

    const groupIds = [...new Set(sessions.map((session) => session.class_group_id))];
    const enrolled = unwrap(await getAdminClient().from("enrollments").select("class_group_id").in("class_group_id", groupIds).eq("status", "active")) ?? [];
    const guests = unwrap(
      await getAdminClient().from("attendance").select("class_session_id").in("class_session_id", sessions.map((session) => session.id)).eq("status", "makeup"),
    ) ?? [];

    return sessions.map((session) => {
      const capacity = one(session.class_group)?.max_capacity ?? 0;
      const taken = enrolled.filter((row) => row.class_group_id === session.class_group_id).length + guests.filter((row) => row.class_session_id === session.id).length;
      return { ...lessonOf(session, "makeup", "open"), vacancies: Math.max(0, capacity - taken) };
    });
  }

  async cancel(req: Request, studentId: string, sessionId: string) {
    const student = await this.access(req, studentId);
    const rules = await lessonRules(student.organization_id);
    const session = unwrap(await getAdminClient().from("class_sessions").select("id, starts_at, class_group_id, cancelled_at").eq("id", sessionId).maybeSingle());
    if (!session || session.cancelled_at) throw Errors.notFound("Session");
    const enrolled = unwrap(
      await getAdminClient().from("enrollments").select("id").eq("student_id", studentId).eq("class_group_id", session.class_group_id).eq("status", "active").maybeSingle(),
    );
    if (!enrolled) throw Errors.forbidden();
    if (new Date(session.starts_at as string).getTime() <= Date.now()) throw Errors.conflict("This lesson already started.", "SESSION_PAST");

    unwrap(
      await getAdminClient()
        .from("attendance")
        .upsert({ class_session_id: sessionId, student_id: studentId, status: "cancelled" }, { onConflict: "class_session_id,student_id" }),
    );

    const hours = (new Date(session.starts_at as string).getTime() - Date.now()) / 3_600_000;
    const balance = (unwrap(await getAdminClient().from("lesson_credits").select("quantity").eq("student_id", studentId).eq("kind", "makeup").or(`expires_at.is.null,expires_at.gte.${new Date().toISOString().slice(0, 10)}`)) ?? [])
      .reduce((sum, row) => sum + (row.quantity as number), 0);
    const credited = hours >= rules.noticeHours && balance < rules.maxCredits;
    if (credited) {
      unwrap(
        await getAdminClient().from("lesson_credits").insert({
          organization_id: student.organization_id,
          student_id: studentId,
          kind: "makeup",
          quantity: 1,
          reason: `cancel:${sessionId}`,
          expires_at: expiresIn(rules.creditDays),
        }),
      );
    }
    return { credited, creditDays: rules.creditDays };
  }

  async restore(req: Request, studentId: string, sessionId: string) {
    await this.access(req, studentId);
    unwrap(await getAdminClient().from("attendance").delete().eq("class_session_id", sessionId).eq("student_id", studentId).eq("status", "cancelled"));
    unwrap(await getAdminClient().from("lesson_credits").delete().eq("student_id", studentId).eq("reason", `cancel:${sessionId}`));
    return { id: sessionId };
  }

  async book(req: Request, studentId: string, sessionId: string) {
    const student = await this.access(req, studentId);
    const overview = await this.overview(req, studentId);
    const slot = overview.slots.find((item) => item.id === sessionId);
    if (!slot || slot.vacancies <= 0) throw Errors.conflict("No vacancy.", "CLASS_FULL");
    if (overview.credits.balance <= 0) throw Errors.conflict("No credits.", "NO_CREDITS");
    unwrap(await getAdminClient().from("attendance").insert({ class_session_id: sessionId, student_id: studentId, status: "makeup" }));
    unwrap(
      await getAdminClient().from("lesson_credits").insert({
        organization_id: student.organization_id,
        student_id: studentId,
        kind: "makeup",
        quantity: -1,
        reason: `makeup:${sessionId}`,
      }),
    );
    return { id: sessionId };
  }

  async unbook(req: Request, studentId: string, sessionId: string) {
    await this.access(req, studentId);
    unwrap(await getAdminClient().from("attendance").delete().eq("class_session_id", sessionId).eq("student_id", studentId).eq("status", "makeup"));
    unwrap(await getAdminClient().from("lesson_credits").delete().eq("student_id", studentId).eq("reason", `makeup:${sessionId}`));
    return { id: sessionId };
  }

  async setAlert(req: Request, studentId: string, on: boolean) {
    const student = await this.access(req, studentId);
    if (!on) {
      unwrap(await getAdminClient().from("vacancy_alerts").update({ is_active: false }).eq("student_id", studentId));
      return { alertOn: false };
    }
    const enrollments = unwrap(await getAdminClient().from("enrollments").select("class_group_id").eq("student_id", studentId).eq("status", "active")) ?? [];
    const own = enrollments.map((row) => row.class_group_id as string);
    const sports = own.length ? (unwrap(await getAdminClient().from("class_groups").select("sport_id").in("id", own)) ?? []).map((row) => row.sport_id as string) : [];
    let query = getAdminClient().from("class_groups").select("id").eq("organization_id", student.organization_id).eq("is_active", true);
    if (sports.length) query = query.in("sport_id", sports);
    if (student.class_level_id) query = query.eq("class_level_id", student.class_level_id);
    const targets = (unwrap(await query) ?? []).map((row) => row.id as string).filter((id) => !own.includes(id));
    if (targets.length) {
      unwrap(
        await getAdminClient()
          .from("vacancy_alerts")
          .upsert(targets.map((id) => ({ class_group_id: id, student_id: studentId, is_active: true })), { onConflict: "class_group_id,student_id" }),
      );
    }
    return { alertOn: targets.length > 0 };
  }

  async requestRenewal(req: Request, studentId: string) {
    const student = await this.access(req, studentId);
    unwrap(
      await getAdminClient().from("notifications").insert({
        organization_id: student.organization_id,
        student_id: studentId,
        kind: "renewal_request",
        recipient_name: student.full_name,
        title: "Pedido de renovação",
        body: `${student.full_name} pediu para renovar o plano.`,
        channels: {},
      }),
    );
    return { id: studentId };
  }
}

export const portalService = new PortalService();

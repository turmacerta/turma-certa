import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { planOf } from "../../shared/plans";
import { scheduleService } from "../schedule/schedule.service";
import type { z } from "zod";
import type {
  classGroupSchema,
  classGroupUpdateSchema,
  enrollmentSchema,

  vacancyAlertSchema,
} from "./class.schema";

export class ClassService {
  async list(orgId: string, teacherId: string | null = null) {
    let query = getAdminClient()
      .from("class_groups")
        .select(
          `
          *,
          sport:sports(id, name),
          teacher:teachers(id, full_name),
          class_level:class_levels(id, name, rank),
          unit:units(id, name),
          space:spaces(id, name),
          class_schedules(*)
        `,
      )
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name");

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    const classes = unwrap(await query);

    const occupancy = unwrap(
      await getAdminClient()
        .from("class_group_occupancy")
        .select("class_group_id, enrolled_count, vacancies, max_capacity")
        .eq("organization_id", orgId),
    );

    const occupancyById = new Map(
      (occupancy ?? []).map((row) => [row.class_group_id as string, row]),
    );

    return (classes ?? []).map((item) => ({
      ...item,
      occupancy: occupancyById.get(item.id as string) ?? {
        enrolled_count: 0,
        vacancies: item.max_capacity,
        max_capacity: item.max_capacity,
      },
    }));
  }

  async get(orgId: string, classId: string, teacherId: string | null = null) {
    const classGroup = unwrap(
      await getAdminClient()
        .from("class_groups")
        .select(
          `
          *,
          sport:sports(id, name),
          teacher:teachers(id, full_name),
          class_level:class_levels(id, name, rank),
          enrollments(*, student:students(*, subscriptions:student_subscriptions(status))),
          unit:units(id, name),
          space:spaces(id, name),
          class_schedules(*)
        `,
        )
        .eq("organization_id", orgId)
        .eq("id", classId)
        .maybeSingle(),
    );

    if (!classGroup || (teacherId && classGroup.teacher_id !== teacherId)) {
      throw Errors.notFound("Class");
    }

    const enrolled = ((classGroup.enrollments ?? []) as Array<{ status: string }>).filter((item) => item.status === "active").length;
    const maxCapacity = classGroup.max_capacity as number;
    return { ...classGroup, occupancy: { enrolled_count: enrolled, vacancies: Math.max(0, maxCapacity - enrolled), max_capacity: maxCapacity } };
  }

  private async defaultTeacher(orgId: string) {
    if ((await planOf(orgId)) !== "autonomous") {
      return null;
    }

    const teacher = unwrap(
      await getAdminClient()
        .from("teachers")
        .select("id")
        .eq("organization_id", orgId)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    );

    return (teacher?.id as string | undefined) ?? null;
  }

  async create(orgId: string, input: z.infer<typeof classGroupSchema>) {
    const classGroup = unwrap(
      await getAdminClient()
        .from("class_groups")
        .insert({
          organization_id: orgId,
          name: input.name,
          sport_id: input.sportId,
          teacher_id: input.teacherId ?? (await this.defaultTeacher(orgId)),
          class_level_id: input.classLevelId ?? null,
          unit_id: input.unitId ?? null,
          space_id: input.spaceId ?? null,
          format: input.format,
          max_capacity: input.maxCapacity,
        })
        .select("*")
        .single(),
    );

    if (input.schedules.length > 0) {
      unwrap(
        await getAdminClient().from("class_schedules").insert(
          input.schedules.map((schedule) => ({
            class_group_id: classGroup.id,
            weekday: schedule.weekday,
            starts_at: `${schedule.startsAt}:00`,
            ends_at: `${schedule.endsAt}:00`,
          })),
        ),
      );

      await scheduleService.ensureHorizon({ orgId, classGroupId: classGroup.id as string });
    }

    return classGroup;
  }

  async update(orgId: string, classId: string, input: z.infer<typeof classGroupUpdateSchema>) {
    await this.get(orgId, classId);
    const changes = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sportId !== undefined ? { sport_id: input.sportId } : {}),
      ...(input.teacherId !== undefined ? { teacher_id: input.teacherId } : {}),
      ...(input.classLevelId !== undefined ? { class_level_id: input.classLevelId } : {}),
      ...(input.unitId !== undefined ? { unit_id: input.unitId } : {}),
      ...(input.spaceId !== undefined ? { space_id: input.spaceId } : {}),
      ...(input.maxCapacity !== undefined ? { max_capacity: input.maxCapacity } : {}),
    };
    if (Object.keys(changes).length) {
      unwrap(await getAdminClient().from("class_groups").update(changes).eq("organization_id", orgId).eq("id", classId));
    }
    if (input.teacherId !== undefined) {
      unwrap(
        await getAdminClient()
          .from("class_sessions")
          .update({ teacher_id: input.teacherId })
          .eq("class_group_id", classId)
          .gt("starts_at", new Date().toISOString()),
      );
    }
    if (input.schedules) {
      unwrap(await getAdminClient().from("class_schedules").delete().eq("class_group_id", classId));
      if (input.schedules.length) {
        unwrap(
          await getAdminClient().from("class_schedules").insert(
            input.schedules.map((schedule) => ({
              class_group_id: classId,
              weekday: schedule.weekday,
              starts_at: `${schedule.startsAt}:00`,
              ends_at: `${schedule.endsAt}:00`,
            })),
          ),
        );
      }
      await this.clearFutureSessions(classId);
      if (input.schedules.length) {
        await scheduleService.ensureHorizon({ orgId, classGroupId: classId });
      }
    }
    return this.get(orgId, classId);
  }

  async archive(orgId: string, classId: string) {
    await this.get(orgId, classId);
    unwrap(
      await getAdminClient()
        .from("enrollments")
        .update({ status: "cancelled", ended_at: new Date().toISOString().slice(0, 10) })
        .eq("class_group_id", classId)
        .in("status", ["active", "waitlist", "paused"]),
    );
    await this.clearFutureSessions(classId);
    unwrap(await getAdminClient().from("class_groups").update({ is_active: false }).eq("organization_id", orgId).eq("id", classId));
    return { id: classId };
  }

  async unenroll(orgId: string, classId: string, studentId: string) {
    await this.get(orgId, classId);
    unwrap(
      await getAdminClient()
        .from("enrollments")
        .update({ status: "cancelled", ended_at: new Date().toISOString().slice(0, 10) })
        .eq("class_group_id", classId)
        .eq("student_id", studentId),
    );
    return { classId, studentId };
  }

  private async clearFutureSessions(classId: string) {
    const now = new Date().toISOString();
    const future = unwrap(
      await getAdminClient().from("class_sessions").select("id").eq("class_group_id", classId).gt("starts_at", now).is("cancelled_at", null),
    ) as Array<{ id: string }> | null;
    const ids = (future ?? []).map((row) => row.id);
    if (!ids.length) return;
    const used = unwrap(await getAdminClient().from("attendance").select("class_session_id").in("class_session_id", ids)) as Array<{ class_session_id: string }> | null;
    const kept = new Set((used ?? []).map((row) => row.class_session_id));
    const removable = ids.filter((id) => !kept.has(id));
    if (removable.length) {
      unwrap(await getAdminClient().from("class_sessions").delete().in("id", removable));
    }
    if (kept.size) {
      unwrap(await getAdminClient().from("class_sessions").update({ cancelled_at: now }).in("id", [...kept]));
    }
  }

  private async assertPackageSlot(studentId: string, classId: string, classGroup: { sport_id: string; format: string }) {
    const subscriptions = unwrap(
      await getAdminClient()
        .from("student_subscriptions")
        .select("status, billing_plan:billing_plans(sport_id, format, weekly_classes)")
        .eq("student_id", studentId)
        .in("status", ["active", "past_due"]),
    ) as unknown as Array<{ billing_plan: { sport_id: string | null; format: string; weekly_classes: number | null } | null }>;
    const plans = subscriptions
      .map((item) => item.billing_plan)
      .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan) && (!plan!.sport_id || plan!.sport_id === classGroup.sport_id) && plan!.format === classGroup.format);
    if (!plans.length) {
      throw Errors.conflict("The student has no package for this class.", "NO_PACKAGE");
    }
    if (plans.some((plan) => !plan.weekly_classes)) {
      return;
    }
    const slots = plans.reduce((sum, plan) => sum + (plan.weekly_classes ?? 0), 0);
    const enrollments = unwrap(
      await getAdminClient()
        .from("enrollments")
        .select("class_group_id, class_group:class_groups!inner(sport_id, format, is_active)")
        .eq("student_id", studentId)
        .in("status", ["active", "waitlist"])
        .eq("class_group.is_active", true)
        .eq("class_group.sport_id", classGroup.sport_id)
        .eq("class_group.format", classGroup.format),
    ) as Array<{ class_group_id: string }>;
    const used = enrollments.filter((item) => item.class_group_id !== classId).length;
    if (used >= slots) {
      throw Errors.conflict("The student's package has no free weekly slot.", "PACKAGE_FULL");
    }
  }

  async enroll(
    orgId: string,
    classId: string,
    input: z.infer<typeof enrollmentSchema>,
  ) {
    const classGroup = await this.get(orgId, classId);
    const occupancy = unwrap(
      await getAdminClient()
        .from("class_group_occupancy")
        .select("vacancies")
        .eq("class_group_id", classId)
        .maybeSingle(),
    );

    if (
      input.status === "active" &&
      occupancy &&
      (occupancy.vacancies as number) <= 0
    ) {
      throw Errors.conflict("The class is full. Add the student to the waitlist.", "CLASS_FULL");
    }

    const student = unwrap(
      await getAdminClient()
        .from("students")
        .select("id")
        .eq("id", input.studentId)
        .eq("organization_id", orgId)
        .maybeSingle(),
    );

    if (!student) {
      throw Errors.notFound("Student");
    }

    if (input.status === "active" || input.status === "waitlist") {
      await this.assertPackageSlot(input.studentId, classId, classGroup as { sport_id: string; format: string });
    }

    return {
      classGroup,
      enrollment: unwrap(
        await getAdminClient()
          .from("enrollments")
          .upsert(
            {
              class_group_id: classId,
              student_id: input.studentId,
              status: input.status,
            },
            { onConflict: "class_group_id,student_id" },
          )
          .select("*")
          .single(),
      ),
    };
  }

  async listVacancies(orgId: string) {
    return unwrap(
      await getAdminClient()
        .from("class_group_occupancy")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .gt("vacancies", 0)
        .order("vacancies", { ascending: false }),
    );
  }

  async createAlert(
    orgId: string,
    classId: string,
    input: z.infer<typeof vacancyAlertSchema>,
  ) {
    await this.get(orgId, classId);

    return unwrap(
      await getAdminClient()
        .from("vacancy_alerts")
        .upsert(
          {
            class_group_id: classId,
            student_id: input.studentId,
            is_active: true,
          },
          { onConflict: "class_group_id,student_id" },
        )
        .select("*")
        .single(),
    );
  }

  async notifyVacancies(orgId: string, classId: string) {
    await this.get(orgId, classId);

    const occupancy = unwrap(
      await getAdminClient()
        .from("class_group_occupancy")
        .select("vacancies")
        .eq("class_group_id", classId)
        .maybeSingle(),
    );

    if (!occupancy || (occupancy.vacancies as number) <= 0) {
      return { notified: [], skipped: "CLASS_FULL" };
    }

    const alerts = unwrap(
      await getAdminClient()
        .from("vacancy_alerts")
        .select("id, student_id, student:students(id, full_name, email, organization_id)")
        .eq("class_group_id", classId)
        .eq("is_active", true),
    );

    const notified: Array<{ studentId: string; fullName: string; credits: number }> = [];

    for (const alert of alerts ?? []) {
      const student = (Array.isArray(alert.student)
        ? alert.student[0]
        : alert.student) as
        | {
            id: string;
            full_name: string;
            organization_id: string;
          }
        | null;

      if (!student || student.organization_id !== orgId) {
        continue;
      }

      const credits = (unwrap(
        await getAdminClient().rpc("student_credit_balance", {
          p_student_id: student.id,
        }),
      ) ?? 0) as number;

      if (credits <= 0) {
        continue;
      }

      unwrap(
        await getAdminClient()
          .from("vacancy_alerts")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", alert.id),
      );

      notified.push({
        studentId: student.id,
        fullName: student.full_name,
        credits,
      });
    }

    return { notified };
  }

}

export const classService = new ClassService();

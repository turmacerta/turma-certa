import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { planOf } from "../../shared/plans";
import { scheduleService } from "../schedule/schedule.service";
import { notificationService } from "../notifications/notification.service";
import type { z } from "zod";
import type {
  classGroupSchema,
  classGroupUpdateSchema,
  enrollmentSchema,
  mergeClassSchema,
  vacancyAlertSchema,
} from "./class.schema";

const INITIAL_WEEKS = 8;

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
          enrollments(*, student:students(*)),
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

    return classGroup;
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

      await scheduleService.generate(orgId, { classGroupId: classGroup.id as string, weeks: INITIAL_WEEKS });
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
        await scheduleService.generate(orgId, { classGroupId: classId, weeks: INITIAL_WEEKS });
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

  async merge(orgId: string, sourceId: string, input: z.infer<typeof mergeClassSchema>) {
    if (sourceId === input.targetClassId) {
      throw Errors.validation({ targetClassId: "SAME_CLASS" });
    }

    const [source, target] = await Promise.all([
      this.get(orgId, sourceId),
      this.get(orgId, input.targetClassId),
    ]);

    if (
      source.sport_id !== target.sport_id ||
      (source.class_level_id ?? null) !== (target.class_level_id ?? null) ||
      source.format !== "group" ||
      target.format !== "group"
    ) {
      throw Errors.conflict("Only group classes with the same sport and level can be merged.", "MERGE_MISMATCH");
    }

    type Enrollment = { status: string; student_id: string };
    const targetActive = new Set(
      ((target.enrollments ?? []) as Enrollment[])
        .filter((item) => item.status === "active")
        .map((item) => item.student_id),
    );
    const moving = ((source.enrollments ?? []) as Enrollment[])
      .filter((item) => item.status === "active" && !targetActive.has(item.student_id))
      .map((item) => item.student_id);

    if (targetActive.size + moving.length > (target.max_capacity as number)) {
      throw Errors.conflict("The target class does not have enough spots.", "CLASS_FULL");
    }

    if (moving.length > 0) {
      unwrap(
        await getAdminClient()
          .from("enrollments")
          .upsert(
            moving.map((studentId) => ({ class_group_id: target.id, student_id: studentId, status: "active" })),
            { onConflict: "class_group_id,student_id" },
          ),
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    unwrap(
      await getAdminClient()
        .from("enrollments")
        .update({ status: "cancelled", ended_at: today })
        .eq("class_group_id", sourceId)
        .in("status", ["active", "waitlist", "paused"]),
    );
    unwrap(
      await getAdminClient()
        .from("class_sessions")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("class_group_id", sourceId)
        .gt("starts_at", new Date().toISOString())
        .is("cancelled_at", null),
    );
    unwrap(
      await getAdminClient().from("class_groups").update({ is_active: false }).eq("id", sourceId),
    );

    if (moving.length > 0) {
      await notificationService.notifyMerge(orgId, moving, target.id as string);
    }

    return { moved: moving.length, targetClassId: target.id };
  }
}

export const classService = new ClassService();

import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import type { z } from "zod";
import type {
  classGroupSchema,
  enrollmentSchema,
  vacancyAlertSchema,
} from "./class.schema";

export class ClassService {
  async list(orgId: string) {
    const classes = unwrap(
      await getAdminClient()
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
        .order("name"),
    );

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

  async get(orgId: string, classId: string) {
    const classGroup = unwrap(
      await getAdminClient()
        .from("class_groups")
        .select(
          `
          *,
          sport:sports(id, name),
          teacher:teachers(id, full_name),
          class_level:class_levels(id, name, rank),
          enrollments(*, student:students(id, full_name, class_level_id)),
          class_schedules(*)
        `,
        )
        .eq("organization_id", orgId)
        .eq("id", classId)
        .maybeSingle(),
    );

    if (!classGroup) {
      throw Errors.notFound("Turma");
    }

    return classGroup;
  }

  async create(orgId: string, input: z.infer<typeof classGroupSchema>) {
    const classGroup = unwrap(
      await getAdminClient()
        .from("class_groups")
        .insert({
          organization_id: orgId,
          name: input.name,
          sport_id: input.sportId,
          teacher_id: input.teacherId ?? null,
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
    }

    return classGroup;
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
      throw Errors.conflict("Turma sem vagas. Coloque o aluno na lista de espera.");
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
      throw Errors.notFound("Aluno");
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
      return { notified: [], skipped: "Turma sem vagas no momento." };
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

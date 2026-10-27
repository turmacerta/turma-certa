import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import type { z } from "zod";
import type { attendanceSchema, generateSessionsSchema } from "./schedule.schema";

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
  async list(orgId: string, from: string, to: string) {
    return unwrap(
      await getAdminClient()
        .from("class_sessions")
        .select(
          `
          *,
          class_group:class_groups!inner(id, name, organization_id, format),
          teacher:teachers(id, full_name),
          space:spaces(id, name)
        `,
        )
        .eq("class_group.organization_id", orgId)
        .gte("starts_at", from)
        .lte("starts_at", to)
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
      throw Errors.notFound("Turma");
    }

    const schedules = (classGroup.class_schedules ?? []) as Array<{
      weekday: number;
      starts_at: string;
      ends_at: string;
    }>;

    if (schedules.length === 0) {
      throw Errors.validation({ schedules: "Turma sem horário recorrente." });
    }

    const rows: Array<{
      class_group_id: string;
      space_id: string | null;
      teacher_id: string | null;
      starts_at: string;
      ends_at: string;
    }> = [];

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    for (let week = 0; week < input.weeks; week += 1) {
      for (const schedule of schedules) {
        const day = nextDate(start, schedule.weekday);
        day.setDate(day.getDate() + week * 7);
        rows.push({
          class_group_id: classGroup.id as string,
          space_id: (classGroup.space_id as string | null) ?? null,
          teacher_id: (classGroup.teacher_id as string | null) ?? null,
          starts_at: atTime(day, schedule.starts_at).toISOString(),
          ends_at: atTime(day, schedule.ends_at).toISOString(),
        });
      }
    }

    return unwrap(
      await getAdminClient().from("class_sessions").insert(rows).select("*"),
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
      throw Errors.notFound("Aula");
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

import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { assertPlanCapacity } from "../../shared/plans";
import type { z } from "zod";
import type { teacherSchema, teacherSportsSchema } from "./teacher.schema";

export class TeacherService {
  async list(orgId: string) {
    return unwrap(
      await getAdminClient()
        .from("teachers")
        .select("*, teacher_sports(sport:sports(id, name))")
        .eq("organization_id", orgId)
        .order("full_name"),
    );
  }

  async create(orgId: string, input: z.infer<typeof teacherSchema>) {
    await assertPlanCapacity(orgId, "teachers");
    const teacher = unwrap(
      await getAdminClient()
        .from("teachers")
        .insert({
          organization_id: orgId,
          full_name: input.fullName,
          email: input.email ?? null,
          phone: input.phone ?? null,
          bio: input.bio ?? null,
        })
        .select("*")
        .single(),
    );

    if (input.sportIds.length > 0) {
      unwrap(
        await getAdminClient().from("teacher_sports").insert(
          input.sportIds.map((sportId) => ({
            teacher_id: teacher.id,
            sport_id: sportId,
          })),
        ),
      );
    }

    return teacher;
  }

  async get(orgId: string, teacherId: string) {
    const teacher = unwrap(
      await getAdminClient()
        .from("teachers")
        .select("*, teacher_sports(sport:sports(id, name))")
        .eq("organization_id", orgId)
        .eq("id", teacherId)
        .maybeSingle(),
    );

    if (!teacher) {
      throw Errors.notFound("Teacher");
    }

    return teacher;
  }

  async setSports(orgId: string, teacherId: string, input: z.infer<typeof teacherSportsSchema>) {
    await this.get(orgId, teacherId);

    unwrap(await getAdminClient().from("teacher_sports").delete().eq("teacher_id", teacherId));

    if (input.sportIds.length > 0) {
      unwrap(
        await getAdminClient().from("teacher_sports").insert(
          input.sportIds.map((sportId) => ({ teacher_id: teacherId, sport_id: sportId })),
        ),
      );
    }

    return this.get(orgId, teacherId);
  }
}

export const teacherService = new TeacherService();

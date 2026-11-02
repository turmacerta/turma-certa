import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { expiresIn, lessonRules } from "../../shared/rules";
import type { z } from "zod";
import type { creditSchema, guardianSchema, studentSchema } from "./student.schema";

const STUDENT_FIELDS = "*, class_level:class_levels(id, name, rank, sport:sports(id, name)), guardian:guardians(id, full_name, email, phone, profile_id)";

function assertContact(input: z.infer<typeof studentSchema>) {
  if (!input.guardian && (!input.email || !input.phone)) {
    throw Errors.validation({ contact: "CONTACT_REQUIRED" });
  }
}

async function resolveGuardian(orgId: string, input: z.infer<typeof guardianSchema> | undefined) {
  if (!input) {
    return null;
  }

  const email = input.email.toLowerCase();
  const profile = unwrap(await getAdminClient().from("profiles").select("id").ilike("email", email).maybeSingle());
  const row = {
    organization_id: orgId,
    full_name: input.fullName,
    email,
    phone: input.phone,
    ...(profile ? { profile_id: profile.id as string } : {}),
  };

  const existing = unwrap(
    await getAdminClient().from("guardians").select("id").eq("organization_id", orgId).ilike("email", email).maybeSingle(),
  );

  const guardian = existing
    ? unwrap(await getAdminClient().from("guardians").update({ ...row, updated_at: new Date().toISOString() }).eq("id", existing.id).select("id").single())
    : unwrap(await getAdminClient().from("guardians").insert(row).select("id").single());

  return (guardian as { id: string }).id;
}

function toRow(orgId: string, input: z.infer<typeof studentSchema>, guardianId: string | null) {
  return {
    organization_id: orgId,
    full_name: input.fullName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    birth_date: input.birthDate ?? null,
    document: input.document ?? null,
    emergency_contact_name: input.emergencyContactName ?? null,
    emergency_contact_phone: input.emergencyContactPhone ?? null,
    notes: input.notes ?? null,
    class_level_id: input.classLevelId ?? null,
    guardian_id: guardianId,
  };
}

export class StudentService {
  async list(orgId: string, teacherId: string | null = null) {
    let query = getAdminClient()
      .from("students")
      .select(STUDENT_FIELDS)
      .eq("organization_id", orgId)
      .order("full_name");

    if (teacherId) {
      const enrollments = unwrap(
        await getAdminClient()
          .from("enrollments")
          .select("student_id, class_group:class_groups!inner(teacher_id)")
          .eq("class_group.teacher_id", teacherId)
          .eq("status", "active"),
      );
      const ids = [...new Set((enrollments ?? []).map((row) => row.student_id as string))];
      query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }

    return unwrap(await query);
  }

  async get(orgId: string, studentId: string) {
    const student = unwrap(
      await getAdminClient()
        .from("students")
        .select(STUDENT_FIELDS)
        .eq("organization_id", orgId)
        .eq("id", studentId)
        .maybeSingle(),
    );

    if (!student) {
      throw Errors.notFound("Student");
    }

    const balance = unwrap(
      await getAdminClient().rpc("student_credit_balance", {
        p_student_id: studentId,
      }),
    );

    return { ...student, credit_balance: balance ?? 0 };
  }

  async create(orgId: string, input: z.infer<typeof studentSchema>) {
    assertContact(input);
    const guardianId = await resolveGuardian(orgId, input.guardian);
    return unwrap(
      await getAdminClient()
        .from("students")
        .insert(toRow(orgId, input, guardianId))
        .select("*")
        .single(),
    );
  }

  async update(orgId: string, studentId: string, input: z.infer<typeof studentSchema>) {
    assertContact(input);
    const guardianId = await resolveGuardian(orgId, input.guardian);
    const student = unwrap(
      await getAdminClient()
        .from("students")
        .update(toRow(orgId, input, guardianId))
        .eq("organization_id", orgId)
        .eq("id", studentId)
        .select("*")
        .maybeSingle(),
    );

    if (!student) {
      throw Errors.notFound("Student");
    }

    return student;
  }

  async setPhoto(orgId: string, studentId: string, url: string) {
    const student = unwrap(
      await getAdminClient().from("students").update({ photo_url: url }).eq("organization_id", orgId).eq("id", studentId).select("id, photo_url").maybeSingle(),
    );
    if (!student) {
      throw Errors.notFound("Student");
    }
    return student;
  }

  async addCredit(
    orgId: string,
    studentId: string,
    input: z.infer<typeof creditSchema>,
  ) {
    await this.get(orgId, studentId);
    const expiresAt = input.expiresAt ?? (input.kind === "makeup" && input.quantity > 0 ? expiresIn((await lessonRules(orgId)).creditDays) : null);

    return unwrap(
      await getAdminClient()
        .from("lesson_credits")
        .insert({
          organization_id: orgId,
          student_id: studentId,
          kind: input.kind,
          quantity: input.quantity,
          reason: input.reason ?? null,
          expires_at: expiresAt,
        })
        .select("*")
        .single(),
    );
  }

  async listCredits(orgId: string, studentId: string) {
    await this.get(orgId, studentId);

    return unwrap(
      await getAdminClient()
        .from("lesson_credits")
        .select("*")
        .eq("organization_id", orgId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
    );
  }
}

export const studentService = new StudentService();

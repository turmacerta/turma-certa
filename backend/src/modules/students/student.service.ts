import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import type { z } from "zod";
import type { creditSchema, studentSchema } from "./student.schema";

function toRow(orgId: string, input: z.infer<typeof studentSchema>) {
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
  };
}

export class StudentService {
  async list(orgId: string) {
    return unwrap(
      await getAdminClient()
        .from("students")
        .select("*, class_level:class_levels(id, name, rank)")
        .eq("organization_id", orgId)
        .order("full_name"),
    );
  }

  async get(orgId: string, studentId: string) {
    const student = unwrap(
      await getAdminClient()
        .from("students")
        .select("*, class_level:class_levels(id, name, rank)")
        .eq("organization_id", orgId)
        .eq("id", studentId)
        .maybeSingle(),
    );

    if (!student) {
      throw Errors.notFound("Aluno");
    }

    const balance = unwrap(
      await getAdminClient().rpc("student_credit_balance", {
        p_student_id: studentId,
      }),
    );

    return { ...student, credit_balance: balance ?? 0 };
  }

  async create(orgId: string, input: z.infer<typeof studentSchema>) {
    return unwrap(
      await getAdminClient()
        .from("students")
        .insert(toRow(orgId, input))
        .select("*")
        .single(),
    );
  }

  async update(orgId: string, studentId: string, input: z.infer<typeof studentSchema>) {
    const student = unwrap(
      await getAdminClient()
        .from("students")
        .update(toRow(orgId, input))
        .eq("organization_id", orgId)
        .eq("id", studentId)
        .select("*")
        .maybeSingle(),
    );

    if (!student) {
      throw Errors.notFound("Aluno");
    }

    return student;
  }

  async addCredit(
    orgId: string,
    studentId: string,
    input: z.infer<typeof creditSchema>,
  ) {
    await this.get(orgId, studentId);

    return unwrap(
      await getAdminClient()
        .from("lesson_credits")
        .insert({
          organization_id: orgId,
          student_id: studentId,
          kind: input.kind,
          quantity: input.quantity,
          reason: input.reason ?? null,
          expires_at: input.expiresAt ?? null,
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

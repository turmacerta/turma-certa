import { env } from "../../config/env";
import { deliverEmail } from "../../infrastructure/notifications/channels";
import { getAdminClient } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  school: string;
  mode: "school" | "autonomous";
  students?: number;
  managers?: number;
  teachers?: number;
  message?: string;
};

function isMissingTable(message: string) {
  return message.includes("schema cache") || message.includes("does not exist");
}

function compose(input: LeadInput) {
  const mode = input.mode === "school" ? "Escola" : "Professor autônomo";
  const lines = [
    `Nome: ${input.name}`,
    `E-mail: ${input.email}`,
    `Celular: ${input.phone}`,
    `Escola: ${input.school}`,
    `Modo: ${mode}`,
    `Alunos: ${input.students ?? "não informado"}`,
    `Gestores: ${input.managers ?? "não informado"}`,
    `Professores: ${input.teachers ?? "não informado"}`,
    `Mensagem: ${input.message || "sem mensagem"}`,
  ];
  return { title: `Novo contato pela landing · ${input.school}`, body: lines.join("\n") };
}

export class LeadService {
  async create(input: LeadInput) {
    const { error } = await getAdminClient().from("leads").insert({
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      school: input.school,
      mode: input.mode,
      students: input.students ?? null,
      managers: input.managers ?? null,
      teachers: input.teachers ?? null,
      message: input.message || null,
    });
    if (error && !isMissingTable(error.message)) {
      throw Errors.database(error.message);
    }
    const delivery = await deliverEmail({ recipientName: "Turma Certa", email: env.leadsEmail, phone: null, profileId: null, ...compose(input) });
    if (error && delivery.status === "failed") {
      throw Errors.database("Lead could not be stored or delivered.");
    }
    return { received: true };
  }
}

export const leadService = new LeadService();

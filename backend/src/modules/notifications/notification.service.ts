import { deliver, type Channel, type ChannelStatus } from "../../infrastructure/notifications/channels";
import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";

export type SessionNotificationKind = "session_cancelled" | "session_restored";

type Contact = { id: string; full_name: string; email: string | null; phone: string | null; profile_id: string | null };
type StudentContact = Contact & { guardian: Contact | null };

type SessionInfo = {
  id: string;
  starts_at: string;
  cancel_reason: string | null;
  class_group: { id: string; name: string; organization: { name: string } | null } | null;
};

const TIME_ZONE = "America/Sao_Paulo";

function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function when(iso: string) {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, weekday: "long", day: "2-digit", month: "2-digit" }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(date);
  return `${day}, às ${time}`;
}

function names(list: string[]) {
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
}

function compose(kind: SessionNotificationKind, session: SessionInfo, studentNames: string[], isGuardian: boolean) {
  const className = session.class_group?.name ?? "Aula";
  const school = session.class_group?.organization?.name ?? "";
  const subject = isGuardian ? `A aula de ${names(studentNames)}` : "Sua aula";
  if (kind === "session_cancelled") {
    const reason = session.cancel_reason ? ` Motivo: ${session.cancel_reason}.` : "";
    return {
      title: `Aula cancelada · ${className}`,
      body: `${subject} de ${when(session.starts_at)} (${className}${school ? `, ${school}` : ""}) foi cancelada.${reason}`,
    };
  }
  return {
    title: `Aula confirmada de novo · ${className}`,
    body: `${subject} de ${when(session.starts_at)} (${className}${school ? `, ${school}` : ""}) vai acontecer normalmente.`,
  };
}

export type NotifySummary = { recipients: number; channels: Record<Channel, Record<ChannelStatus, number>> };

function emptySummary(): NotifySummary {
  const counts = () => ({ sent: 0, mock: 0, skipped: 0, failed: 0 });
  return { recipients: 0, channels: { push: counts(), email: counts(), whatsapp: counts() } };
}

export class NotificationService {
  async remindOverdue(orgId: string, studentIds?: string[]) {
    const today = new Date().toISOString().slice(0, 10);
    let query = getAdminClient()
      .from("invoices")
      .select("amount_cents, due_date, student:students(id, full_name, email, phone, profile_id, guardian:guardians(id, full_name, email, phone, profile_id))")
      .eq("organization_id", orgId)
      .in("status", ["pending", "overdue"])
      .lt("due_date", today);
    if (studentIds?.length) {
      query = query.in("student_id", studentIds);
    }
    const invoices = (unwrap(await query) ?? []) as unknown as DebtorRow[];
    const organization = unwrap(await getAdminClient().from("organizations").select("name").eq("id", orgId).maybeSingle());

    const byStudent = new Map<string, { student: StudentContact; total: number; oldest: string }>();
    for (const invoice of invoices) {
      const student = one(invoice.student);
      if (!student) continue;
      const entry = byStudent.get(student.id) ?? { student, total: 0, oldest: invoice.due_date };
      entry.total += invoice.amount_cents;
      if (invoice.due_date < entry.oldest) entry.oldest = invoice.due_date;
      byStudent.set(student.id, entry);
    }

    const summary = emptySummary();
    const rows = await Promise.all(
      [...byStudent.values()].map(async ({ student, total, oldest }) => {
        const guardian = one(student.guardian as unknown as Contact | Contact[]);
        const contact = guardian ?? student;
        const firstName = student.full_name.split(" ")[0] ?? student.full_name;
        const title = `Pagamento em aberto · ${organization?.name ?? ""}`;
        const body = `${guardian ? `A mensalidade de ${firstName}` : "Sua mensalidade"} está em aberto desde ${day(oldest)}: ${money(total)}. Se já pagou, desconsidere.`;
        const channels = await deliver({ recipientName: contact.full_name, email: contact.email, phone: contact.phone, profileId: contact.profile_id, title, body });
        for (const [channel, result] of Object.entries(channels) as Array<[Channel, { status: ChannelStatus }]>) {
          summary.channels[channel][result.status] += 1;
        }
        return {
          organization_id: orgId,
          student_id: student.id,
          guardian_id: guardian?.id ?? null,
          kind: "payment_reminder",
          recipient_name: contact.full_name,
          email: contact.email,
          phone: contact.phone,
          title,
          body,
          channels,
        };
      }),
    );

    summary.recipients = rows.length;
    if (rows.length) {
      unwrap(await getAdminClient().from("notifications").insert(rows));
    }
    return summary;
  }

  async notifyMerge(orgId: string, studentIds: string[], targetClassId: string) {
    const target = unwrap(
      await getAdminClient()
        .from("class_groups")
        .select("name, organization:organizations(name), teacher:teachers(full_name), schedules:class_schedules(weekday, starts_at)")
        .eq("id", targetClassId)
        .maybeSingle(),
    ) as unknown as { name: string; organization: { name: string } | null; teacher: { full_name: string } | null; schedules: Array<{ weekday: number; starts_at: string }> } | null;
    const students = (unwrap(
      await getAdminClient()
        .from("students")
        .select("id, full_name, email, phone, profile_id, guardian:guardians(id, full_name, email, phone, profile_id)")
        .eq("organization_id", orgId)
        .in("id", studentIds),
    ) ?? []) as unknown as StudentContact[];
    const days = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    const slots = (target?.schedules ?? []).map((item) => `${days[item.weekday]} às ${item.starts_at.slice(0, 5)}`).join(", ");
    const summary = emptySummary();
    const rows = await Promise.all(
      students.map(async (student) => {
        const guardian = one(student.guardian as unknown as Contact | Contact[]);
        const contact = guardian ?? student;
        const firstName = student.full_name.split(" ")[0] ?? student.full_name;
        const title = `Nova turma · ${target?.name ?? ""}`;
        const body = `${guardian ? `${firstName} passa` : "Você passa"} a fazer aula em ${target?.name ?? "outra turma"}${slots ? `, ${slots}` : ""}${target?.teacher ? `, com ${target.teacher.full_name}` : ""}.`;
        const channels = await deliver({ recipientName: contact.full_name, email: contact.email, phone: contact.phone, profileId: contact.profile_id, title, body });
        for (const [channel, result] of Object.entries(channels) as Array<[Channel, { status: ChannelStatus }]>) {
          summary.channels[channel][result.status] += 1;
        }
        return { organization_id: orgId, student_id: student.id, guardian_id: guardian?.id ?? null, kind: "class_merged", recipient_name: contact.full_name, email: contact.email, phone: contact.phone, title, body, channels };
      }),
    );
    summary.recipients = rows.length;
    if (rows.length) {
      unwrap(await getAdminClient().from("notifications").insert(rows));
    }
    return summary;
  }

  async notifySession(orgId: string, sessionId: string, kind: SessionNotificationKind): Promise<NotifySummary> {
    const session = unwrap(
      await getAdminClient()
        .from("class_sessions")
        .select("id, starts_at, cancel_reason, class_group:class_groups!inner(id, name, organization_id, organization:organizations(name))")
        .eq("id", sessionId)
        .eq("class_group.organization_id", orgId)
        .maybeSingle(),
    );

    const summary = emptySummary();
    if (!session) {
      return summary;
    }

    const info: SessionInfo = {
      id: session.id as string,
      starts_at: session.starts_at as string,
      cancel_reason: (session.cancel_reason as string | null) ?? null,
      class_group: (() => {
        const group = one(session.class_group as unknown as SessionInfo["class_group"] | SessionInfo["class_group"][]);
        return group ? { ...group, organization: one(group.organization as unknown as { name: string } | { name: string }[]) } : null;
      })(),
    };

    const enrollments = unwrap(
      await getAdminClient()
        .from("enrollments")
        .select("student:students(id, full_name, email, phone, profile_id, guardian:guardians(id, full_name, email, phone, profile_id))")
        .eq("class_group_id", info.class_group?.id ?? "")
        .eq("status", "active"),
    );

    const groups = new Map<string, { contact: Contact; guardianId: string | null; students: StudentContact[] }>();
    for (const row of enrollments ?? []) {
      const student = one(row.student as unknown as StudentContact | StudentContact[]);
      if (!student) {
        continue;
      }
      const guardian = one(student.guardian as unknown as Contact | Contact[]);
      const key = guardian ? `g:${guardian.id}` : `s:${student.id}`;
      const group = groups.get(key) ?? { contact: guardian ?? student, guardianId: guardian?.id ?? null, students: [] };
      group.students.push(student);
      groups.set(key, group);
    }

    const rows = await Promise.all(
      [...groups.values()].map(async (group) => {
        const isGuardian = Boolean(group.guardianId);
        const message = compose(kind, info, group.students.map((student) => student.full_name.split(" ")[0] ?? student.full_name), isGuardian);
        const channels = await deliver({
          recipientName: group.contact.full_name,
          email: group.contact.email,
          phone: group.contact.phone,
          profileId: group.contact.profile_id,
          ...message,
        });
        for (const [channel, result] of Object.entries(channels) as Array<[Channel, { status: ChannelStatus }]>) {
          summary.channels[channel][result.status] += 1;
        }
        return group.students.map((student) => ({
          organization_id: orgId,
          class_session_id: info.id,
          student_id: student.id,
          guardian_id: group.guardianId,
          kind,
          recipient_name: group.contact.full_name,
          email: group.contact.email,
          phone: group.contact.phone,
          title: message.title,
          body: message.body,
          channels,
        }));
      }),
    );

    summary.recipients = groups.size;
    const flat = rows.flat();
    if (flat.length) {
      unwrap(await getAdminClient().from("notifications").insert(flat));
    }
    return summary;
  }
}

type DebtorRow = {
  amount_cents: number;
  due_date: string;
  student: StudentContact | null;
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function day(iso: string) {
  const [year, month, date] = iso.split("-");
  return `${date}/${month}/${year}`;
}

export const notificationService = new NotificationService();

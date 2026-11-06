import { getAdminClient, unwrap } from "../infrastructure/supabase/client";

type Row = Record<string, unknown> & { id: string };

const NICKNAMES: Record<string, string> = {
  "Tênis Kids": "Kids",
  "Beach Tennis Duplas": "Duplas",
  "Funcional para Raquete": "Preparação para Raquete",
};

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const orgName = args.find((arg) => !arg.startsWith("--")) ?? "Escola de Teste";

let seed = 20261027;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}
function chance(probability: number) {
  return random() < probability;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function atTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const copy = new Date(date);
  copy.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return copy;
}

const db = getAdminClient();

async function insert(table: string, rows: Record<string, unknown>[]): Promise<Row[]> {
  if (rows.length === 0) {
    return [];
  }
  const result: Row[] = [];
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500);
    result.push(...(unwrap(await db.from(table).insert(chunk).select("*")) as Row[]));
  }
  return result;
}

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João",
  "Larissa", "Mateus", "Natália", "Otávio", "Paula", "Rafael", "Sofia", "Tiago", "Vitória", "Lucas",
  "Mariana", "Pedro", "Beatriz", "Gustavo", "Júlia", "Leonardo", "Camila", "Rodrigo", "Helena", "André",
  "Lívia", "Caio", "Manuela", "Fernando", "Alice", "Diego", "Clara", "Marcelo", "Yasmin", "Vinícius",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Costa", "Pereira", "Almeida", "Rocha", "Lima", "Ribeiro", "Carvalho",
  "Mendes", "Teixeira", "Barbosa", "Araújo", "Moreira", "Nogueira", "Fonseca", "Drummond", "Pimenta", "Vasconcelos",
];

function slugEmail(name: string) {
  return `${name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, ".")}@exemplo.com`;
}
function phone() {
  return `(31) 9${Math.floor(8000 + random() * 1999)}-${Math.floor(1000 + random() * 8999)}`;
}

async function findOrganization() {
  const organizations = unwrap(
    await db.from("organizations").select("id, name").eq("name", orgName),
  ) as Array<{ id: string; name: string }>;
  if (organizations.length !== 1) {
    throw new Error(`Expected 1 organization named "${orgName}", found ${organizations.length}.`);
  }
  return organizations[0]!;
}

async function wipe(orgId: string) {
  const classIds = (unwrap(await db.from("class_groups").select("id").eq("organization_id", orgId)) as Row[]).map((row) => row.id);
  const studentIds = (unwrap(await db.from("students").select("id").eq("organization_id", orgId)) as Row[]).map((row) => row.id);
  unwrap(await db.from("invoices").delete().eq("organization_id", orgId));
  if (studentIds.length) {
    unwrap(await db.from("student_subscriptions").delete().in("student_id", studentIds));
  }
  if (classIds.length) {
    unwrap(await db.from("class_groups").delete().in("id", classIds));
  }
  for (const table of ["notifications", "lesson_credits", "students", "guardians", "billing_plans", "teachers", "class_levels", "sports", "units"]) {
    unwrap(await db.from(table).delete().eq("organization_id", orgId));
  }
}

async function main() {
  const organization = await findOrganization();
  const orgId = organization.id;

  const existing = unwrap(await db.from("class_groups").select("id").eq("organization_id", orgId).limit(1)) as Row[];
  if (existing.length && !reset) {
    throw new Error(`"${orgName}" already has data. Run again with --reset to wipe and reseed.`);
  }
  if (reset) {
    await wipe(orgId);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pampulha, savassi] = await insert("units", [
    { organization_id: orgId, name: "Unidade Pampulha", address: "Av. Otacílio Negrão de Lima, 1500 - Pampulha" },
    { organization_id: orgId, name: "Unidade Savassi", address: "Rua Antônio de Albuquerque, 330 - Savassi" },
  ]);
  const spaces = await insert("spaces", [
    { unit_id: pampulha!.id, name: "Quadra 1 · Saibro" },
    { unit_id: pampulha!.id, name: "Quadra 2 · Saibro" },
    { unit_id: pampulha!.id, name: "Areia 1" },
    { unit_id: pampulha!.id, name: "Areia 2" },
    { unit_id: savassi!.id, name: "Quadra Rápida" },
    { unit_id: savassi!.id, name: "Sala de Funcional" },
  ]);
  const space = (name: string) => spaces.find((item) => item.name === name)!;
  const unitOf = (spaceRow: Row) => (spaceRow.unit_id === pampulha!.id ? pampulha! : savassi!);

  const sports = await insert(
    "sports",
    ["Tênis", "Beach Tennis", "Futevôlei", "Funcional"].map((name) => ({ organization_id: orgId, name })),
  );
  const sport = (name: string) => sports.find((item) => item.name === name)!;

  const levelNames: Record<string, string[]> = {
    "Tênis": ["Iniciante", "Intermediário", "Avançado"],
    "Beach Tennis": ["Iniciante", "Intermediário", "Avançado"],
    "Futevôlei": ["Iniciante", "Intermediário"],
    "Funcional": ["Iniciante", "Intermediário"],
  };
  const levels = await insert(
    "class_levels",
    sports.flatMap((sportRow) =>
      (levelNames[sportRow.name as string] ?? []).map((name, rank) => ({ organization_id: orgId, sport_id: sportRow.id, name, rank })),
    ),
  );
  const level = (sportName: string, name: string) => levels.find((item) => item.name === name && item.sport_id === sport(sportName).id)!;

  const teacherSpecs = [
    { name: "Marina Costa", sports: ["Tênis"], bio: "Ex-tenista universitária, 12 anos dando aula." },
    { name: "Thiago Andrade", sports: ["Tênis"], bio: "Especialista em iniciação e tênis infantil." },
    { name: "Lucas Ferreira", sports: ["Beach Tennis", "Futevôlei"], bio: "Atleta de beach tennis no circuito mineiro." },
    { name: "Bruna Lima", sports: ["Beach Tennis"], bio: "Foco em técnica e jogo de duplas." },
    { name: "Rafael Nunes", sports: ["Funcional"], bio: "Educador físico, preparação para esportes de raquete." },
    { name: "Camila Rocha", sports: ["Tênis", "Funcional"], bio: "Tênis adulto e condicionamento." },
  ];
  const teachers = await insert(
    "teachers",
    teacherSpecs.map((spec) => ({
      organization_id: orgId,
      full_name: spec.name,
      email: slugEmail(spec.name),
      phone: phone(),
      bio: spec.bio,
    })),
  );
  const teacher = (name: string) => teachers.find((item) => item.full_name === name)!;
  await insert(
    "teacher_sports",
    teacherSpecs.flatMap((spec) => spec.sports.map((name) => ({ teacher_id: teacher(spec.name).id, sport_id: sport(name).id }))),
  );

  const classSpecs = [
    { name: "Tênis Iniciante · Manhã", sport: "Tênis", level: "Iniciante", teacher: "Thiago Andrade", space: "Quadra 1 · Saibro", capacity: 6, fill: 6, slots: [[2, "07:00", "08:00"], [4, "07:00", "08:00"]] },
    { name: "Tênis Iniciante · Noite", sport: "Tênis", level: "Iniciante", teacher: "Thiago Andrade", space: "Quadra 2 · Saibro", capacity: 6, fill: 4, slots: [[1, "19:00", "20:00"], [3, "19:00", "20:00"]] },
    { name: "Tênis Intermediário", sport: "Tênis", level: "Intermediário", teacher: "Marina Costa", space: "Quadra 1 · Saibro", capacity: 4, fill: 4, slots: [[2, "18:00", "19:00"], [4, "18:00", "19:00"]] },
    { name: "Tênis Intermediário · Sábado", sport: "Tênis", level: "Intermediário", teacher: "Camila Rocha", space: "Quadra 2 · Saibro", capacity: 4, fill: 1, slots: [[6, "09:00", "10:30"]] },
    { name: "Tênis Avançado", sport: "Tênis", level: "Avançado", teacher: "Marina Costa", space: "Quadra Rápida", capacity: 4, fill: 3, slots: [[1, "20:00", "21:30"], [3, "20:00", "21:30"]] },
    { name: "Tênis Kids", sport: "Tênis", level: "Iniciante", teacher: "Thiago Andrade", space: "Quadra 2 · Saibro", capacity: 8, fill: 7, slots: [[3, "15:00", "16:00"], [5, "15:00", "16:00"]] },
    { name: "Beach Tennis Iniciante", sport: "Beach Tennis", level: "Iniciante", teacher: "Bruna Lima", space: "Areia 1", capacity: 8, fill: 8, slots: [[2, "19:00", "20:00"], [4, "19:00", "20:00"]] },
    { name: "Beach Tennis Iniciante · Manhã", sport: "Beach Tennis", level: "Iniciante", teacher: "Lucas Ferreira", space: "Areia 2", capacity: 8, fill: 2, slots: [[1, "08:00", "09:00"], [3, "08:00", "09:00"]] },
    { name: "Beach Tennis Intermediário", sport: "Beach Tennis", level: "Intermediário", teacher: "Lucas Ferreira", space: "Areia 1", capacity: 8, fill: 6, slots: [[1, "18:00", "19:00"], [3, "18:00", "19:00"]] },
    { name: "Beach Tennis Intermediário · Manhã", sport: "Beach Tennis", level: "Intermediário", teacher: "Bruna Lima", space: "Areia 2", capacity: 8, fill: 2, slots: [[2, "07:00", "08:00"], [4, "07:00", "08:00"]] },
    { name: "Beach Tennis Duplas", sport: "Beach Tennis", level: "Avançado", teacher: "Bruna Lima", space: "Areia 2", capacity: 8, fill: 0, slots: [[6, "08:00", "09:30"]] },
    { name: "Futevôlei Livre", sport: "Futevôlei", level: "Intermediário", teacher: "Lucas Ferreira", space: "Areia 2", capacity: 10, fill: 9, slots: [[2, "20:00", "21:00"], [4, "20:00", "21:00"]] },
    { name: "Futevôlei Iniciante", sport: "Futevôlei", level: "Iniciante", teacher: "Lucas Ferreira", space: "Areia 1", capacity: 10, fill: 3, slots: [[6, "10:00", "11:00"]] },
    { name: "Funcional para Raquete", sport: "Funcional", level: "Intermediário", teacher: "Rafael Nunes", space: "Sala de Funcional", capacity: 12, fill: 10, slots: [[1, "07:00", "08:00"], [3, "07:00", "08:00"], [5, "07:00", "08:00"]] },
    { name: "Funcional Noite", sport: "Funcional", level: "Iniciante", teacher: "Camila Rocha", space: "Sala de Funcional", capacity: 12, fill: 5, slots: [[2, "19:30", "20:30"], [4, "19:30", "20:30"]] },
    { name: "Particular · Marina", sport: "Tênis", level: "Avançado", teacher: "Marina Costa", space: "Quadra Rápida", capacity: 1, fill: 1, format: "private", slots: [[5, "18:00", "19:00"]] },
    { name: "Particular · Thiago", sport: "Tênis", level: "Iniciante", teacher: "Thiago Andrade", space: "Quadra 1 · Saibro", capacity: 1, fill: 0, format: "private", slots: [[6, "11:00", "12:00"]] },
  ] as const;

  const classes = await insert(
    "class_groups",
    classSpecs.map((spec) => {
      const spaceRow = space(spec.space);
      return {
        organization_id: orgId,
        unit_id: unitOf(spaceRow).id,
        space_id: spaceRow.id,
        sport_id: sport(spec.sport).id,
        teacher_id: teacher(spec.teacher).id,
        class_level_id: level(spec.sport, spec.level).id,
        name: NICKNAMES[spec.name] ?? ("format" in spec ? `${spec.sport} · Particular` : `${spec.sport} · ${spec.level}`),
        format: "format" in spec ? spec.format : "group",
        max_capacity: spec.capacity,
      };
    }),
  );
  const classByName = (key: string) => classes[classSpecs.findIndex((spec) => spec.name === key)]!;
  await insert(
    "class_schedules",
    classSpecs.flatMap((spec) =>
      spec.slots.map(([weekday, startsAt, endsAt]) => ({
        class_group_id: classByName(spec.name).id,
        weekday,
        starts_at: startsAt,
        ends_at: endsAt,
      })),
    ),
  );

  const usedNames = new Set<string>();
  function uniqueName() {
    for (;;) {
      const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
  }

  const totalSeats = classSpecs.reduce((sum, spec) => sum + spec.fill, 0);
  const studentSpecs = Array.from({ length: totalSeats + 6 }, () => {
    const name = uniqueName();
    const age = 9 + Math.floor(random() * 50);
    const birth = new Date(today.getFullYear() - age, Math.floor(random() * 12), 1 + Math.floor(random() * 27));
    const guardian = age < 18 ? `${pick(FIRST_NAMES)} ${name.split(" ")[1]}` : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    return {
      organization_id: orgId,
      full_name: name,
      email: slugEmail(name),
      phone: phone(),
      birth_date: isoDate(birth),
      emergency_contact_name: guardian,
      emergency_contact_phone: phone(),
      notes: chance(0.12) ? pick(["Joelho operado em 2024, evitar impacto.", "Prefere aulas pela manhã.", "Asma leve, traz bombinha.", "Quer evoluir para o intermediário."]) : null,
    };
  });
  const students = await insert("students", studentSpecs);

  const adultAt = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const minors = students.filter((student) => new Date(student.birth_date as string) > adultAt);
  const guardianNames = [...new Set(minors.map((student) => student.emergency_contact_name as string))];
  const guardians = await insert(
    "guardians",
    guardianNames.map((name) => ({
      organization_id: orgId,
      full_name: name,
      email: slugEmail(name),
      phone: minors.find((student) => student.emergency_contact_name === name)?.emergency_contact_phone ?? phone(),
    })),
  );
  for (const student of minors) {
    const guardian = guardians.find((item) => item.full_name === student.emergency_contact_name);
    if (guardian) unwrap(await db.from("students").update({ guardian_id: guardian.id }).eq("id", student.id));
  }

  const enrollments: Record<string, unknown>[] = [];
  const studentClasses = new Map<string, Row[]>();
  let cursor = 0;
  for (const spec of classSpecs) {
    const classRow = classByName(spec.name);
    for (let seat = 0; seat < spec.fill; seat += 1) {
      const student = students[cursor % students.length]!;
      cursor += 1;
      enrollments.push({
        class_group_id: classRow.id,
        student_id: student.id,
        status: "active",
        started_at: isoDate(addDays(today, -Math.floor(20 + random() * 200))),
      });
      studentClasses.set(student.id, [...(studentClasses.get(student.id) ?? []), classRow]);
    }
  }
  const waitlisted = students.slice(totalSeats, totalSeats + 3);
  for (const [index, student] of waitlisted.entries()) {
    const target = classByName(index === 0 ? "Tênis Intermediário" : index === 1 ? "Beach Tennis Iniciante" : "Tênis Iniciante · Manhã");
    enrollments.push({ class_group_id: target.id, student_id: student.id, status: "waitlist", started_at: isoDate(today) });
  }
  await insert("enrollments", enrollments);

  for (const student of students) {
    const classesOfStudent = studentClasses.get(student.id);
    const classRow = classesOfStudent?.[0];
    if (classRow) {
      unwrap(await db.from("students").update({ class_level_id: classRow.class_level_id }).eq("id", student.id));
    }
  }

  const plans = await insert("billing_plans", [
    { organization_id: orgId, name: "Tênis 1x por Semana", format: "group", sport_id: sport("Tênis").id, weekly_classes: 1, lessons_per_cycle: 4, cycle_days: 30, price_cents: 28000 },
    { organization_id: orgId, name: "Tênis 2x por Semana", format: "group", sport_id: sport("Tênis").id, weekly_classes: 2, lessons_per_cycle: 8, cycle_days: 30, price_cents: 48000 },
    { organization_id: orgId, name: "Beach Tennis 2x por Semana", format: "group", sport_id: sport("Beach Tennis").id, weekly_classes: 2, lessons_per_cycle: 8, cycle_days: 30, price_cents: 26000 },
    { organization_id: orgId, name: "Futevôlei Livre", format: "group", sport_id: sport("Futevôlei").id, lessons_per_cycle: 8, cycle_days: 30, price_cents: 22000 },
    { organization_id: orgId, name: "Funcional 3x por Semana", format: "group", sport_id: sport("Funcional").id, weekly_classes: 3, lessons_per_cycle: 12, cycle_days: 30, price_cents: 19900 },
    { organization_id: orgId, name: "Particular · Pacote 4 Aulas", format: "private", lessons_per_cycle: 4, cycle_days: 30, price_cents: 60000 },
  ]);
  const plan = (name: string) => plans.find((item) => item.name === name)!;
  function planFor(classRow: Row, weekly: number) {
    const sportName = sports.find((item) => item.id === classRow.sport_id)?.name;
    if (classRow.format === "private") return plan("Particular · Pacote 4 Aulas");
    if (sportName === "Tênis") return weekly > 1 ? plan("Tênis 2x por Semana") : plan("Tênis 1x por Semana");
    if (sportName === "Beach Tennis") return plan("Beach Tennis 2x por Semana");
    if (sportName === "Futevôlei") return plan("Futevôlei Livre");
    return plan("Funcional 3x por Semana");
  }

  const subscriptionRows: Record<string, unknown>[] = [];
  const subscriptionMeta: Array<{ studentId: string; planRow: Row; end: Date; state: "paid" | "pending" | "overdue" }> = [];
  for (const [index, student] of students.entries()) {
    const classRow = studentClasses.get(student.id)?.[0];
    if (!classRow) {
      continue;
    }
    const weekly = classSpecs[classes.indexOf(classRow)]?.slots.length ?? 1;
    const planRow = planFor(classRow, weekly);
    const roll = index % 10;
    const endOffset = roll < 2 ? 1 + (index % 6) : roll === 2 ? -(3 + (index % 5)) : 8 + Math.floor(random() * 20);
    const end = addDays(today, endOffset);
    const start = addDays(end, -30);
    const state = roll === 2 ? "overdue" : roll === 3 ? "pending" : "paid";
    subscriptionRows.push({
      student_id: student.id,
      billing_plan_id: planRow.id,
      status: state === "overdue" ? "past_due" : "active",
      current_period_start: isoDate(start),
      current_period_end: isoDate(end),
      auto_renew: true,
    });
    subscriptionMeta.push({ studentId: student.id, planRow, end, state });
  }
  const subscriptions = await insert("student_subscriptions", subscriptionRows);

  const invoices: Record<string, unknown>[] = [];
  const credits: Record<string, unknown>[] = [];
  for (const [index, subscription] of subscriptions.entries()) {
    const meta = subscriptionMeta[index]!;
    const start = addDays(meta.end, -30);
    invoices.push({
      organization_id: orgId,
      student_id: meta.studentId,
      student_subscription_id: subscription.id,
      amount_cents: meta.planRow.price_cents,
      status: "paid",
      due_date: isoDate(addDays(start, -25)),
      paid_at: addDays(start, -26).toISOString(),
    });
    invoices.push({
      organization_id: orgId,
      student_id: meta.studentId,
      student_subscription_id: subscription.id,
      amount_cents: meta.planRow.price_cents,
      status: meta.state,
      due_date: isoDate(meta.state === "overdue" ? addDays(today, -(4 + (index % 6))) : start),
      paid_at: meta.state === "paid" ? start.toISOString() : null,
    });
    credits.push({
      organization_id: orgId,
      student_id: meta.studentId,
      kind: "regular",
      quantity: meta.planRow.lessons_per_cycle,
      reason: "cycle_credits",
      expires_at: isoDate(meta.end),
      created_at: start.toISOString(),
    });
  }

  const sessionRows: Record<string, unknown>[] = [];
  for (const spec of classSpecs) {
    const classRow = classByName(spec.name);
    for (let offset = -14; offset <= 21; offset += 1) {
      const day = addDays(today, offset);
      for (const [weekday, startsAt, endsAt] of spec.slots) {
        if (day.getDay() === weekday) {
          sessionRows.push({
            class_group_id: classRow.id,
            space_id: classRow.space_id,
            teacher_id: classRow.teacher_id,
            starts_at: atTime(day, startsAt).toISOString(),
            ends_at: atTime(day, endsAt).toISOString(),
            cancelled_at: offset === -6 && spec.sport === "Beach Tennis" ? addDays(day, -1).toISOString() : null,
            notes: offset === -6 && spec.sport === "Beach Tennis" ? "Chuva forte, areia alagada." : null,
          });
        }
      }
    }
  }
  const sessions = await insert("class_sessions", sessionRows);

  const enrolledByClass = new Map<string, string[]>();
  for (const enrollment of enrollments) {
    if (enrollment.status === "active") {
      const key = enrollment.class_group_id as string;
      enrolledByClass.set(key, [...(enrolledByClass.get(key) ?? []), enrollment.student_id as string]);
    }
  }

  const attendance: Record<string, unknown>[] = [];
  const now = new Date();
  for (const session of sessions) {
    if (new Date(session.ends_at as string) > now || session.cancelled_at) {
      continue;
    }
    for (const studentId of enrolledByClass.get(session.class_group_id as string) ?? []) {
      const roll = random();
      const status = roll < 0.82 ? "present" : roll < 0.93 ? "absent" : "cancelled";
      attendance.push({ class_session_id: session.id, student_id: studentId, status });
      if (status === "present") {
        credits.push({
          organization_id: orgId,
          student_id: studentId,
          kind: "regular",
          quantity: -1,
          reason: "lesson_attended",
          created_at: session.starts_at,
        });
      }
      if (status === "cancelled") {
        credits.push({
          organization_id: orgId,
          student_id: studentId,
          kind: "makeup",
          quantity: 1,
          reason: "notice_cancellation",
          expires_at: isoDate(addDays(new Date(session.starts_at as string), 30)),
          created_at: session.starts_at,
        });
      }
    }
  }
  await insert("attendance", attendance);
  await insert("lesson_credits", credits);
  await insert("invoices", invoices);

  const fullClasses = ["Tênis Intermediário", "Beach Tennis Iniciante", "Tênis Iniciante · Manhã"].map(classByName);
  const alertStudents = students.slice(0, 40).filter((student) => !studentClasses.get(student.id)?.some((row) => fullClasses.includes(row)));
  await insert(
    "vacancy_alerts",
    fullClasses.flatMap((classRow, index) =>
      alertStudents.slice(index * 2, index * 2 + 2).map((student) => ({ class_group_id: classRow.id, student_id: student.id })),
    ),
  );

  console.log(
    [
      `Done: ${organization.name}`,
      `${guardians.length} guardians for ${minors.length} minors`,
      `${spaces.length} spaces in 2 units`,
      `${sports.length} sports, ${levels.length} levels`,
      `${teachers.length} teachers, ${classes.length} classes`,
      `${students.length} students, ${enrollments.length} enrollments`,
      `${plans.length} plans, ${subscriptions.length} subscriptions, ${invoices.length} invoices`,
      `${sessions.length} sessions, ${attendance.length} attendance records, ${credits.length} credit entries`,
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

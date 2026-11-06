export type MemberRole = "owner" | "admin" | "teacher" | "student";
export type Persona = "manager" | "teacher" | "student";
export type SaasPlan = "autonomous" | "school";
export type ClassFormat = "group" | "private";
export type MemberTag = "student" | "teacher" | "manager";

export type Named = { id: string; name: string };

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export type Membership = {
  role: MemberRole;
  teacher_id: string | null;
  role_permissions?: Record<MemberRole, string[]> | null;
  permissions?: string[];
  org_role?: { id: string; name: string; tag: MemberTag } | null;
  status?: "invited" | "active";
  organization: {
    id: string;
    name: string;
    slug: string;
    saas_plan: SaasPlan;
    logo_sport?: string | null;
    lesson_rules?: { creditDays?: number } | null;
  };
};

export type MeResponse = {
  profile: Profile | null;
  memberships: Membership[];
  isPlatformAdmin: boolean;
  supportOrganization?: (Membership["organization"] & {
    role_permissions?: Membership["role_permissions"];
  }) | null;
};

export type Occupancy = {
  enrolled_count: number;
  vacancies: number;
  max_capacity: number;
};

export type ClassSchedule = { weekday: number; starts_at: string; ends_at: string };

export type ClassRow = {
  id: string;
  name: string;
  format: ClassFormat;
  max_capacity?: number;
  occupancy: Occupancy;
  sport?: Named | null;
  teacher?: { id: string; full_name: string } | null;
  class_level?: Named | null;
  unit?: Named | null;
  space?: Named | null;
  class_schedules: ClassSchedule[];
};

export type ClassDetail = ClassRow & {
  enrollments?: Array<{
    id: string;
    status: string;
    student?: { id: string; full_name: string; photo_url?: string | null } | null;
  }>;
};

export type SessionRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  class_group?: {
    id: string;
    name: string;
    format?: ClassFormat;
    organization_id: string;
    organization?: Named | null;
  } | null;
  teacher?: { id: string; full_name: string } | null;
  space?: Named | null;
};

export type Student = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  class_level_id?: string | null;
  guardian?: { id: string; full_name: string; email?: string | null; phone?: string | null } | null;
};

export type Teacher = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
};

export type BillingPlan = {
  id: string;
  name: string;
  price_cents: number;
  format: ClassFormat;
  sport_id?: string | null;
  weekly_classes?: number | null;
  is_active?: boolean;
};

export type Invoice = {
  id: string;
  amount_cents: number;
  status: string;
  due_date: string;
  student_id?: string;
  student?: { id: string; full_name: string } | null;
  subscription_id?: string | null;
};

export type BillingSummary = {
  plans?: BillingPlan[];
  invoices?: Invoice[];
  subscriptions?: Array<{
    id: string;
    status: string;
    student?: { id: string; full_name: string } | null;
    billing_plan?: BillingPlan | null;
  }>;
};

export type PortalLesson = {
  id: string;
  startsAt: string;
  endsAt: string;
  teacher: string;
  space: string;
  sport: string | null;
  title: string;
  kind: "regular" | "makeup";
  status: string;
  vacancies?: number;
};

export type LinkedStudent = {
  id: string;
  full_name: string;
  organization?: Named | null;
};

export type PortalOverview = {
  student: Student & { organization?: Named | null };
  lessons: PortalLesson[];
  slots: PortalLesson[];
  credits: { balance: number; nextExpiry: string | null };
  subscription: {
    status: string;
    current_period_end: string;
    billing_plan: { name: string; price_cents: number; lessons_per_cycle: number | null } | null;
  } | null;
};

export function personaOf(membership: Membership | null | undefined): Persona {
  const tag = membership?.org_role?.tag;
  if (tag === "manager" || tag === "teacher" || tag === "student") return tag;
  if (membership?.role === "teacher") return "teacher";
  if (membership?.role === "student") return "student";
  return "manager";
}

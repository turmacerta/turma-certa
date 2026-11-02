import type { LogoSport } from "@/components/brand";
export type MemberRole = "owner" | "admin" | "teacher" | "student";
export type Persona = "manager" | "teacher" | "student";
export type SaasPlan = "autonomous" | "school";
export type ClassFormat = "group" | "private";

export type Named = { id: string; name: string };

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export type MemberTag = "student" | "teacher" | "manager";

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
    logo_sport?: LogoSport | null;
    lesson_rules?: { creditDays?: number } | null;
  };
};

export type Occupancy = {
  enrolled_count: number;
  vacancies: number;
  max_capacity: number;
};

export type ClassSchedule = { weekday: number; starts_at: string; ends_at: string };

export type Level = Named & { rank?: number; sport_id?: string | null; sport?: Named | null };

export type ClassRow = {
  id: string;
  name: string;
  format: ClassFormat;
  is_active?: boolean;
  occupancy: Occupancy;
  sport?: Named | null;
  teacher?: { id: string; full_name: string } | null;
  class_level?: Level | null;
  unit?: Named | null;
  space?: Named | null;
  class_schedules: ClassSchedule[];
};

export type ClassDetail = ClassRow & {
  enrollments?: Array<{
    id: string;
    status: string;
    student?: { id: string; full_name: string; class_level_id: string | null; photo_url?: string | null } | null;
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
    format: ClassFormat;
    organization_id: string;
    organization?: Named | null;
  } | null;
  teacher?: { id: string; full_name: string } | null;
  space?: Named | null;
};

export type Student = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date?: string | null;
  document?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  notes?: string | null;
  class_level?: Level | null;
  guardian?: Guardian | null;
  photo_url?: string | null;
  profile_id?: string | null;
  created_at?: string;
};

export type Guardian = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  profile_id?: string | null;
};

export type NotifySummary = { recipients: number };

export type Credit = {
  id: string;
  kind: "regular" | "makeup";
  quantity: number;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  bio?: string | null;
  profile_id?: string | null;
  photo_url?: string | null;
  teacher_sports?: Array<{ sport: Named | null }>;
};

export type BillingPlan = {
  id: string;
  name: string;
  format: ClassFormat;
  price_cents: number;
  cycle_days: number;
  lessons_per_cycle: number | null;
  is_active?: boolean;
};

export type Invoice = {
  id: string;
  amount_cents: number;
  status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  due_date: string;
  student?: { id?: string; full_name: string } | null;
};

export type Renewal = {
  id: string;
  current_period_end: string;
  student?: { full_name: string } | null;
  billing_plan?: { name: string } | null;
};

export type BillingSummary = {
  openAmountCents: number;
  invoices: Invoice[];
  renewalsDue: Renewal[];
  subscriptions: unknown[];
  lastReminders?: Record<string, string>;
};

export type Unit = { id: string; name: string; address: string | null; spaces: Named[] };

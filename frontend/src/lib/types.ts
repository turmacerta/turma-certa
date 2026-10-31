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

export type Membership = {
  role: MemberRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    saas_plan: SaasPlan;
  };
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
  is_active?: boolean;
  occupancy: Occupancy;
  sport?: Named | null;
  teacher?: { id: string; full_name: string } | null;
  class_level?: (Named & { rank?: number }) | null;
  unit?: Named | null;
  class_schedules: ClassSchedule[];
};

export type ClassDetail = ClassRow & {
  enrollments?: Array<{
    id: string;
    status: string;
    student?: { id: string; full_name: string; class_level_id: string | null } | null;
  }>;
};

export type SessionRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  cancelled_at?: string | null;
  class_group?: { id: string; name: string; format: ClassFormat } | null;
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
  class_level?: (Named & { rank?: number }) | null;
  created_at?: string;
};

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
};

export type Unit = { id: string; name: string; address: string | null; spaces: Named[] };

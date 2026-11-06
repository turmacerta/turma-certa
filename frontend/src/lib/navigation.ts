import {
  BookOpenCheck,
  CalendarDays,
  CalendarSync,
  CircleDollarSign,
  GraduationCap,
  House,
  LayoutDashboard,
  Settings,
  Network,
  UserCog,
  Users,
  Volleyball,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "./messages/pt-br";
import type { Permission } from "./permissions";
import type { Persona, SaasPlan } from "./types";

export const ROUTES = {
  home: "/app",
  schedule: "/app/schedule",
  classes: "/app/classes",
  students: "/app/students",
  teachers: "/app/teachers",
  billing: "/app/billing",
  packages: "/app/packages",
  settings: "/app/settings",
  team: "/app/team",
  network: "/app/network",
  account: "/app/account",
  studentHome: "/app/student",
  studentLessons: "/app/student/lessons",
  studentMakeup: "/app/student/makeup",
  studentPlan: "/app/student/plan",
  admin: "/admin",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  twoFactor: "/login/two-factor",
} as const;

export type NavLabel = keyof Messages["nav"];

export type NavItem = {
  href: string;
  label: NavLabel;
  icon: LucideIcon;
  exact?: boolean;
  schoolOnly?: boolean;
  permissions?: Permission[];
  scopedBy?: Permission;
  scopedLabel?: NavLabel;
  networkOnly?: boolean;
};

export type NavOptions = { network?: boolean };

type Can = (...permissions: Permission[]) => boolean;

const STAFF_NAVIGATION: NavItem[] = [
  { href: ROUTES.network, label: "network", icon: Network, networkOnly: true },
  { href: ROUTES.home, label: "home", icon: LayoutDashboard, exact: true, permissions: ["classes.view_all"] },
  { href: ROUTES.schedule, label: "schedule", icon: CalendarDays, scopedBy: "schedule.view_all", scopedLabel: "mySchedule" },
  { href: ROUTES.classes, label: "classes", icon: Volleyball, scopedBy: "classes.view_all", scopedLabel: "myClasses" },
  { href: ROUTES.students, label: "students", icon: Users },
  { href: ROUTES.teachers, label: "teachers", icon: GraduationCap, schoolOnly: true, permissions: ["teachers.view", "teachers.manage"] },
  { href: ROUTES.billing, label: "billing", icon: CircleDollarSign, permissions: ["billing.view", "billing.manage"] },
  { href: ROUTES.packages, label: "packages", icon: Package, permissions: ["billing.view", "billing.manage"] },
  { href: ROUTES.team, label: "team", icon: UserCog, permissions: ["team.manage"] },
  { href: ROUTES.settings, label: "settings", icon: Settings, permissions: ["settings.manage"] },
];

const STUDENT_NAVIGATION: NavItem[] = [
  { href: ROUTES.studentHome, label: "studentHome", icon: House, exact: true },
  { href: ROUTES.studentLessons, label: "lessons", icon: BookOpenCheck },
  { href: ROUTES.studentMakeup, label: "makeup", icon: CalendarSync },
  { href: ROUTES.studentPlan, label: "plan", icon: Package },
];

export const HOME_BY_PERSONA: Record<Persona, string> = {
  manager: ROUTES.home,
  teacher: ROUTES.schedule,
  student: ROUTES.studentHome,
};

export function personasFor(plan: SaasPlan): Persona[] {
  return plan === "autonomous" ? ["manager", "student"] : ["manager", "teacher", "student"];
}

export function navigationFor(persona: Persona, plan: SaasPlan, can: Can, options: NavOptions = {}): NavItem[] {
  if (persona === "student") {
    return STUDENT_NAVIGATION;
  }
  return STAFF_NAVIGATION.filter(
    (item) =>
      !(item.schoolOnly && plan === "autonomous") &&
      (!item.permissions || can(...item.permissions)) &&
      (!item.networkOnly || options.network),
  ).map((item) => (item.scopedBy && item.scopedLabel && !can(item.scopedBy) ? { ...item, label: item.scopedLabel } : item));
}

export function homeFor(persona: Persona, can: Can) {
  if (persona === "student") return ROUTES.studentHome;
  return can("classes.view_all") ? ROUTES.home : ROUTES.schedule;
}

export function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function canAccess(persona: Persona, plan: SaasPlan, can: Can, pathname: string, options: NavOptions = {}) {
  return pathname === ROUTES.home || pathname === ROUTES.account || navigationFor(persona, plan, can, options).some((item) => isActive(item, pathname));
}

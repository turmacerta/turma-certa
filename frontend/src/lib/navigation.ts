import {
  BookOpenCheck,
  CalendarDays,
  CalendarSync,
  CircleDollarSign,
  GraduationCap,
  House,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  Volleyball,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "./messages/pt-br";
import type { Persona, SaasPlan } from "./types";

export const ROUTES = {
  home: "/app",
  schedule: "/app/schedule",
  classes: "/app/classes",
  students: "/app/students",
  teachers: "/app/teachers",
  billing: "/app/billing",
  settings: "/app/settings",
  account: "/app/account",
  today: "/app/today",
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
};

export const NAVIGATION: Record<Persona, NavItem[]> = {
  manager: [
    { href: ROUTES.home, label: "home", icon: LayoutDashboard, exact: true },
    { href: ROUTES.schedule, label: "schedule", icon: CalendarDays },
    { href: ROUTES.classes, label: "classes", icon: Volleyball },
    { href: ROUTES.students, label: "students", icon: Users },
    { href: ROUTES.teachers, label: "teachers", icon: GraduationCap, schoolOnly: true },
    { href: ROUTES.billing, label: "billing", icon: CircleDollarSign },
    { href: ROUTES.settings, label: "settings", icon: Settings },
  ],
  teacher: [
    { href: ROUTES.today, label: "today", icon: ListChecks },
    { href: ROUTES.schedule, label: "schedule", icon: CalendarDays },
    { href: ROUTES.classes, label: "myClasses", icon: Volleyball },
    { href: ROUTES.students, label: "students", icon: Users },
  ],
  student: [
    { href: ROUTES.studentHome, label: "studentHome", icon: House, exact: true },
    { href: ROUTES.studentLessons, label: "lessons", icon: BookOpenCheck },
    { href: ROUTES.studentMakeup, label: "makeup", icon: CalendarSync },
    { href: ROUTES.studentPlan, label: "plan", icon: WalletCards },
  ],
};

export const HOME_BY_PERSONA: Record<Persona, string> = {
  manager: ROUTES.home,
  teacher: ROUTES.today,
  student: ROUTES.studentHome,
};

export function navigationFor(persona: Persona, plan: SaasPlan) {
  return NAVIGATION[persona].filter((item) => !(item.schoolOnly && plan === "autonomous"));
}

export function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

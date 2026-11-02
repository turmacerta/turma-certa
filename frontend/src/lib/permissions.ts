import type { MemberRole, MemberTag, Persona } from "./types";

export const PERMISSION_GROUPS = [
  { key: "schedule", permissions: ["schedule.view_all", "schedule.manage", "schedule.cancel_own", "attendance.take"] },
  { key: "classes", permissions: ["classes.view_all", "classes.manage", "classes.create_own"] },
  { key: "students", permissions: ["students.view_all", "students.manage"] },
  { key: "teachers", permissions: ["teachers.view", "teachers.manage"] },
  { key: "billing", permissions: ["billing.view", "billing.manage"] },
  { key: "settings", permissions: ["settings.manage", "team.manage"] },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number];

export const PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((group) => [...group.permissions]);

export type RolePermissions = Record<MemberRole, Permission[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  owner: PERMISSIONS,
  admin: PERMISSIONS.filter((permission) => permission !== "team.manage"),
  teacher: ["schedule.cancel_own", "attendance.take"],
  student: [],
};

export function roleForPersona(persona: Persona, realRole: MemberRole): MemberRole {
  if (persona === "teacher" || persona === "student") return persona;
  return realRole === "owner" || realRole === "admin" ? realRole : "owner";
}

export const TAGS: MemberTag[] = ["manager", "teacher", "student"];

export type Area = {
  key: "schedule" | "classes" | "students" | "teachers" | "billing" | "settings" | "team";
  levels: Array<{ key: string; permissions: Permission[] }>;
  extra?: Permission;
};

export const AREAS: Area[] = [
  {
    key: "schedule",
    levels: [
      { key: "none", permissions: [] },
      { key: "own", permissions: ["attendance.take", "schedule.cancel_own"] },
      { key: "all", permissions: ["attendance.take", "schedule.cancel_own", "schedule.view_all"] },
      { key: "manage", permissions: ["attendance.take", "schedule.cancel_own", "schedule.view_all", "schedule.manage"] },
    ],
  },
  {
    key: "classes",
    levels: [
      { key: "own", permissions: [] },
      { key: "all", permissions: ["classes.view_all"] },
      { key: "manage", permissions: ["classes.view_all", "classes.manage"] },
    ],
    extra: "classes.create_own",
  },
  {
    key: "students",
    levels: [
      { key: "own", permissions: [] },
      { key: "all", permissions: ["students.view_all"] },
      { key: "manage", permissions: ["students.view_all", "students.manage"] },
    ],
  },
  {
    key: "teachers",
    levels: [
      { key: "none", permissions: [] },
      { key: "view", permissions: ["teachers.view"] },
      { key: "manage", permissions: ["teachers.view", "teachers.manage"] },
    ],
  },
  {
    key: "billing",
    levels: [
      { key: "none", permissions: [] },
      { key: "view", permissions: ["billing.view"] },
      { key: "manage", permissions: ["billing.view", "billing.manage"] },
    ],
  },
  { key: "settings", levels: [{ key: "none", permissions: [] }, { key: "manage", permissions: ["settings.manage"] }] },
  { key: "team", levels: [{ key: "none", permissions: [] }, { key: "manage", permissions: ["team.manage"] }] },
];

const AREA_PERMISSIONS = (area: Area) => [...new Set([...area.levels.flatMap((level) => level.permissions), ...(area.extra ? [area.extra] : [])])];

export function levelOf(area: Area, permissions: string[]) {
  const owned = area.levels.filter((level) => level.permissions.every((permission) => permissions.includes(permission)));
  return owned[owned.length - 1]?.key ?? area.levels[0].key;
}

export function withLevel(area: Area, permissions: string[], levelKey: string) {
  const level = area.levels.find((item) => item.key === levelKey) ?? area.levels[0];
  const kept = permissions.filter((permission) => !(AREA_PERMISSIONS(area) as string[]).includes(permission) || permission === area.extra);
  return [...kept, ...level.permissions] as Permission[];
}

export function allowedLevel(area: Area, levelKey: string, ceiling: string[]) {
  const level = area.levels.find((item) => item.key === levelKey);
  return Boolean(level && level.permissions.every((permission) => ceiling.includes(permission)));
}

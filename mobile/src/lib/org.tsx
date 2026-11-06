import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { personaOf, type Membership, type MemberRole, type Persona, type SaasPlan } from "@turma-certa/types";
import { useAuth } from "./auth";

const MANAGER_PERMS = [
  "schedule.view_all",
  "schedule.manage",
  "schedule.cancel_own",
  "attendance.take",
  "classes.view_all",
  "classes.manage",
  "classes.create_own",
  "students.view",
  "students.manage",
  "teachers.view",
  "teachers.manage",
  "billing.view",
  "billing.manage",
  "settings.manage",
  "team.manage",
];

const DEFAULT_ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  owner: MANAGER_PERMS,
  admin: MANAGER_PERMS.filter((p) => p !== "team.manage"),
  teacher: ["schedule.cancel_own", "attendance.take"],
  student: [],
};

const ORG_KEY = "tc-mobile-org";
const SUPPORT_KEY = "tc-mobile-support-org";

type OrgContextValue = {
  orgId: string | null;
  orgName: string;
  saasPlan: SaasPlan;
  membership: Membership | null;
  memberships: Membership[];
  persona: Persona;
  setOrgId: (orgId: string) => void;
  isManager: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isStaff: boolean;
  isPlatformAdmin: boolean;
  support: boolean;
  needsOnboarding: boolean;
  needsSchoolPick: boolean;
  enterSupport: (orgId: string) => Promise<void>;
  exitSupport: () => Promise<void>;
  can: (...permissions: string[]) => boolean;
  teacherId: string | null;
};

const OrgContext = createContext<OrgContextValue | null>(null);

function pickMembership(list: Membership[], preferred: string | null): Membership | null {
  if (!list.length) return null;
  if (preferred) {
    const found = list.find((m) => m.organization.id === preferred);
    if (found) return found;
  }
  return list[0] ?? null;
}

function grantedFor(membership: Membership | null, persona: Persona): Set<string> {
  if (!membership) return new Set();
  if (membership.permissions?.length) return new Set(membership.permissions);
  const role: MemberRole =
    persona === "teacher" || persona === "student"
      ? persona
      : membership.role === "owner" || membership.role === "admin"
        ? membership.role
        : "owner";
  const fromMap = membership.role_permissions?.[role];
  return new Set(fromMap?.length ? fromMap : DEFAULT_ROLE_PERMISSIONS[role]);
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { me, refreshMe } = useAuth();
  const [orgId, setOrgIdState] = useState<string | null>(null);
  const [supportOrgId, setSupportOrgId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void Promise.all([AsyncStorage.getItem(ORG_KEY), AsyncStorage.getItem(SUPPORT_KEY)]).then(([org, support]) => {
      if (org) setOrgIdState(org);
      if (support) setSupportOrgId(support);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (supportOrgId) void refreshMe(supportOrgId);
    // Re-apply support after cold start; enterSupport already refreshes on pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const isPlatformAdmin = Boolean(me?.isPlatformAdmin);
  const memberships = useMemo(() => {
    return (me?.memberships ?? [])
      .map((item) => {
        const organization = Array.isArray(item.organization)
          ? (item.organization[0] as Membership["organization"] | undefined)
          : item.organization;
        if (!organization?.id) return null;
        return { ...item, organization };
      })
      .filter((item): item is Membership => Boolean(item));
  }, [me]);

  const supportMembership = useMemo<Membership | null>(() => {
    const support = me?.supportOrganization;
    if (!isPlatformAdmin || !support || !supportOrgId || support.id !== supportOrgId) return null;
    const owns = memberships.some((item) => item.organization.id === supportOrgId);
    if (owns) return null;
    return {
      role: "owner",
      teacher_id: null,
      role_permissions: support.role_permissions ?? null,
      organization: {
        id: support.id,
        name: support.name,
        slug: support.slug,
        saas_plan: support.saas_plan,
        logo_sport: support.logo_sport,
        lesson_rules: support.lesson_rules,
      },
    };
  }, [isPlatformAdmin, me?.supportOrganization, supportOrgId, memberships]);

  const membership =
    supportMembership ??
    pickMembership(memberships, supportOrgId && memberships.some((m) => m.organization.id === supportOrgId) ? supportOrgId : orgId);

  useEffect(() => {
    if (membership && membership.organization.id !== orgId) {
      setOrgIdState(membership.organization.id);
      void AsyncStorage.setItem(ORG_KEY, membership.organization.id);
    }
  }, [membership, orgId]);

  const persona = membership ? personaOf(membership) : isPlatformAdmin ? "manager" : "manager";
  const granted = useMemo(() => {
    if (supportMembership) return new Set(MANAGER_PERMS);
    return grantedFor(membership, persona);
  }, [membership, persona, supportMembership]);
  const can = useCallback((...needed: string[]) => needed.some((p) => granted.has(p)), [granted]);

  const enterSupport = useCallback(
    async (nextOrgId: string) => {
      setSupportOrgId(nextOrgId);
      setOrgIdState(nextOrgId);
      await AsyncStorage.setItem(SUPPORT_KEY, nextOrgId);
      await AsyncStorage.setItem(ORG_KEY, nextOrgId);
      await refreshMe(nextOrgId);
    },
    [refreshMe],
  );

  const exitSupport = useCallback(async () => {
    setSupportOrgId(null);
    await AsyncStorage.removeItem(SUPPORT_KEY);
    await refreshMe(null);
  }, [refreshMe]);

  const needsOnboarding = Boolean(me && memberships.length === 0 && !isPlatformAdmin);
  const needsSchoolPick = Boolean(me && !membership && (isPlatformAdmin || memberships.length > 1));

  const value = useMemo<OrgContextValue>(
    () => ({
      orgId: membership?.organization.id ?? null,
      orgName: membership?.organization.name ?? "",
      saasPlan: membership?.organization.saas_plan ?? "school",
      membership,
      memberships,
      persona,
      setOrgId: (next) => {
        setOrgIdState(next);
        void AsyncStorage.setItem(ORG_KEY, next);
      },
      isManager: persona === "manager",
      isTeacher: persona === "teacher",
      isStudent: persona === "student",
      isStaff: persona === "manager" || persona === "teacher" || isPlatformAdmin,
      isPlatformAdmin,
      support: Boolean(supportMembership),
      needsOnboarding,
      needsSchoolPick,
      enterSupport,
      exitSupport,
      can,
      teacherId: membership?.teacher_id ?? null,
    }),
    [
      membership,
      memberships,
      persona,
      isPlatformAdmin,
      supportMembership,
      needsOnboarding,
      needsSchoolPick,
      enterSupport,
      exitSupport,
      can,
    ],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("OrgProvider missing");
  return ctx;
}

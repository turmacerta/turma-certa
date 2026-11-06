"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RefreshCw, ServerCrash } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useStoredValue, writeStorage } from "@/lib/client-store";
import { personasFor } from "@/lib/navigation";
import { DEFAULT_ROLE_PERMISSIONS, roleForPersona, type Permission, type RolePermissions } from "@/lib/permissions";
import { CUSTOMER_MODE_KEY, SUPPORT_ORG_KEY, VIEW_AS_KEY, VIEW_TEACHER_KEY } from "@/lib/staff";
import type { Membership, MemberRole, Persona, Profile, SaasPlan, Teacher } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { LoadingMark, LOGO_SPORTS, type LogoSport } from "./brand";
import { Onboarding } from "./onboarding";
import { Button, Card } from "./ui";

const ORG_KEY = "tc-org";

function personaOf(membership: Membership): Persona {
  const tag = membership.org_role?.tag;
  if (tag) {
    return tag === "manager" ? "manager" : tag;
  }
  return personaFromRole(membership.role);
}

function personaFromRole(role: MemberRole): Persona {
  if (role === "teacher") {
    return "teacher";
  }
  if (role === "student") {
    return "student";
  }
  return "manager";
}

type OrgContextValue = {
  orgId: string;
  orgName: string;
  saasPlan: SaasPlan;
  role: MemberRole;
  effectiveRole: MemberRole;
  can: (...permissions: Permission[]) => boolean;
  orgRole: Membership["org_role"];
  logoSport: LogoSport;
  creditDays: number;
  hasNetwork: boolean;
  rolePermissions: RolePermissions;
  persona: Persona;
  realPersona: Persona;
  canPreview: boolean;
  personas: Persona[];
  support: boolean;
  exitSupport: () => void;
  customerMode: boolean;
  setCustomerMode: (on: boolean) => void;
  setViewAs: (persona: Persona) => void;
  teacherId: string | null;
  previewTeachers: Teacher[];
  setViewTeacher: (teacherId: string) => void;
  profile: Profile | null;
  memberships: Membership[];
  switchOrg: (orgId: string) => void;
  isPlatformAdmin: boolean;
  isStaff: boolean;
  refresh: () => Promise<void>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg() {
  const value = useContext(OrgContext);
  if (!value) {
    throw new Error("useOrg must be used inside OrgProvider");
  }
  return value;
}

type MeResponse = {
  profile: Profile | null;
  memberships: Membership[];
  isPlatformAdmin: boolean;
  supportOrganization: (Membership["organization"] & { role_permissions?: Membership["role_permissions"] }) | null;
};

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [supportOrganization, setSupportOrganization] = useState<MeResponse["supportOrganization"]>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const [error, setError] = useState<unknown>(null);
  const selectedOrg = useStoredValue(ORG_KEY);
  const storedViewAs = useStoredValue(VIEW_AS_KEY);
  const storedViewTeacher = useStoredValue(VIEW_TEACHER_KEY);
  const supportOrgId = useStoredValue(SUPPORT_ORG_KEY);
  const customerMode = useStoredValue(CUSTOMER_MODE_KEY) === "on";
  const mePath = supportOrgId ? `/api/v1/me?supportOrgId=${supportOrgId}` : "/api/v1/me";

  const apply = useCallback((me: MeResponse) => {
    setProfile(me.profile);
    setIsPlatformAdmin(Boolean(me.isPlatformAdmin));
    setSupportOrganization(me.supportOrganization ?? null);
    setMemberships((me.memberships ?? []).filter((item) => item.organization));
    setError(null);
    setLoading(false);
  }, []);

  const fail = useCallback((err: unknown) => {
    setError(err ?? new Error("load failed"));
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await api<MeResponse>(mePath));
    } catch (err) {
      fail(err);
    }
  }, [apply, fail, mePath]);

  useEffect(() => {
    api<MeResponse>(mePath).then(apply, fail);
  }, [apply, fail, mePath]);

  const exitSupport = useCallback(() => {
    writeStorage(CUSTOMER_MODE_KEY, "");
    writeStorage(SUPPORT_ORG_KEY, "");
  }, []);
  const setCustomerMode = useCallback((on: boolean) => {
    writeStorage(CUSTOMER_MODE_KEY, on ? "on" : "");
    writeStorage(VIEW_AS_KEY, "");
    writeStorage(VIEW_TEACHER_KEY, "");
    if (on) writeStorage(SUPPORT_ORG_KEY, "");
    window.location.reload();
  }, []);
  const switchOrg = useCallback((orgId: string) => {
    writeStorage(SUPPORT_ORG_KEY, "");
    writeStorage(ORG_KEY, orgId);
  }, []);
  const setViewAs = useCallback((persona: Persona) => writeStorage(VIEW_AS_KEY, persona), []);
  const setViewTeacher = useCallback((teacherId: string) => writeStorage(VIEW_TEACHER_KEY, teacherId), []);

  const staffMode = isPlatformAdmin && !customerMode;
  const ownSupportOrg = memberships.some((item) => item.organization.id === supportOrgId);
  const supportMembership = useMemo<Membership | null>(
    () =>
      staffMode && supportOrganization && !ownSupportOrg && supportOrganization.id === supportOrgId
        ? {
            role: "owner",
            teacher_id: null,
            role_permissions: supportOrganization.role_permissions,
            organization: {
              id: supportOrganization.id,
              name: supportOrganization.name,
              slug: supportOrganization.slug,
              saas_plan: supportOrganization.saas_plan,
              logo_sport: supportOrganization.logo_sport,
            },
          }
        : null,
    [staffMode, supportOrganization, ownSupportOrg, supportOrgId],
  );
  const current =
    supportMembership ??
    memberships.find((item) => item.organization.id === (ownSupportOrg ? supportOrgId : selectedOrg)) ??
    memberships[0];
  const plan = current?.organization.saas_plan ?? "school";
  const realPersona = current ? personaOf(current) : "manager";
  const canPreview = staffMode;
  const personas = useMemo(() => (canPreview ? personasFor(plan) : [realPersona]), [canPreview, plan, realPersona]);
  const viewAs = personas.find((persona) => persona === storedViewAs) ?? null;
  const previewingTeacher = canPreview && viewAs === "teacher";
  const teachers = useApi<Teacher[]>(current && previewingTeacher ? `/api/v1/organizations/${current.organization.id}/teachers` : null, { asStaff: true });

  const value = useMemo<OrgContextValue | null>(() => {
    if (!current) {
      return null;
    }
    const previewTeachers = teachers.data ?? [];
    const teacherId = previewingTeacher
      ? (previewTeachers.find((teacher) => teacher.id === storedViewTeacher)?.id ?? current.teacher_id ?? previewTeachers[0]?.id ?? null)
      : current.teacher_id;
    const persona = canPreview && viewAs ? viewAs : realPersona;
    const effectiveRole = roleForPersona(persona, current.role);
    const rolePermissions = { ...DEFAULT_ROLE_PERMISSIONS, ...(current.role_permissions as RolePermissions | null | undefined) };
    const granted = new Set<string>(persona === realPersona && current.permissions ? current.permissions : rolePermissions[effectiveRole]);
    return {
      orgId: current.organization.id,
      orgName: current.organization.name,
      saasPlan: current.organization.saas_plan,
      role: current.role,
      effectiveRole,
      can: (...permissions: Permission[]) => permissions.some((permission) => granted.has(permission)),
      orgRole: current.org_role ?? null,
      logoSport: LOGO_SPORTS.find((sport) => sport === current.organization.logo_sport) ?? "tennis",
      creditDays: current.organization.lesson_rules?.creditDays ?? 30,
      hasNetwork: memberships.filter((item) => (item.permissions ?? []).includes("classes.view_all")).length > 1,
      rolePermissions,
      persona,
      realPersona,
      canPreview,
      personas,
      support: Boolean(supportMembership),
      exitSupport,
      customerMode: isPlatformAdmin && customerMode,
      isStaff: staffMode,
      setCustomerMode,
      setViewAs,
      teacherId,
      previewTeachers,
      setViewTeacher,
      profile,
      memberships,
      switchOrg,
      isPlatformAdmin,
      refresh: load,
    };
  }, [current, supportMembership, exitSupport, customerMode, setCustomerMode, viewAs, setViewAs, profile, memberships, switchOrg, isPlatformAdmin, staffMode, load, realPersona, canPreview, personas, previewingTeacher, teachers.data, storedViewTeacher, setViewTeacher]);

  const teacherHeaderPending = Boolean(value && staffMode && previewingTeacher && value.teacherId && storedViewTeacher !== value.teacherId);

  useEffect(() => {
    if (teacherHeaderPending && value?.teacherId) {
      writeStorage(VIEW_TEACHER_KEY, value.teacherId);
    }
  }, [teacherHeaderPending, value?.teacherId]);

  if (loading || teacherHeaderPending) {
    return (
      <div className="grid min-h-screen place-items-center p-8">
        <LoadingMark label={t.shell.loadingAccount} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <Card className="grid w-full max-w-lg gap-4 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger-soft text-danger">
            <ServerCrash className="h-7 w-7" />
          </div>
          <p className="display text-2xl font-semibold">{t.shell.loadFailedTitle}</p>
          <p className="text-sm text-muted">{errorMessage(error, t)}</p>
          <p className="text-xs text-muted">{t.shell.loadFailedHint}</p>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="justify-self-center"
          >
            <RefreshCw className="h-4 w-4" />
            {t.common.retry}
          </Button>
        </Card>
      </div>
    );
  }

  if (!value) {
    // Pass raw platform-admin flag (not staffMode) so customer mode cannot hide the backoffice escape hatch.
    return <Onboarding profile={profile} isPlatformAdmin={isPlatformAdmin} onCreated={load} />;
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RefreshCw, ServerCrash } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useStoredValue, writeStorage } from "@/lib/client-store";
import type { Membership, MemberRole, Persona, Profile, SaasPlan } from "@/lib/types";
import { BrandMark } from "./brand";
import { Onboarding } from "./onboarding";
import { Button, Card, Skeleton } from "./ui";

const ORG_KEY = "tc-org";
const VIEW_AS_KEY = "tc-view-as";

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
  persona: Persona;
  realPersona: Persona;
  canPreview: boolean;
  setViewAs: (persona: Persona) => void;
  profile: Profile | null;
  memberships: Membership[];
  switchOrg: (orgId: string) => void;
  isPlatformAdmin: boolean;
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
};

const PERSONAS: Persona[] = ["manager", "teacher", "student"];

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const [error, setError] = useState<unknown>(null);
  const selectedOrg = useStoredValue(ORG_KEY);
  const storedViewAs = useStoredValue(VIEW_AS_KEY);
  const viewAs = PERSONAS.find((persona) => persona === storedViewAs) ?? null;

  const apply = useCallback((me: MeResponse) => {
    setProfile(me.profile);
    setIsPlatformAdmin(Boolean(me.isPlatformAdmin));
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
      apply(await api<MeResponse>("/api/v1/me"));
    } catch (err) {
      fail(err);
    }
  }, [apply, fail]);

  useEffect(() => {
    api<MeResponse>("/api/v1/me").then(apply, fail);
  }, [apply, fail]);

  const switchOrg = useCallback((orgId: string) => writeStorage(ORG_KEY, orgId), []);
  const setViewAs = useCallback((persona: Persona) => writeStorage(VIEW_AS_KEY, persona), []);

  const current =
    memberships.find((item) => item.organization.id === selectedOrg) ?? memberships[0];

  const value = useMemo<OrgContextValue | null>(() => {
    if (!current) {
      return null;
    }
    const realPersona = personaFromRole(current.role);
    const canPreview = realPersona === "manager";
    return {
      orgId: current.organization.id,
      orgName: current.organization.name,
      saasPlan: current.organization.saas_plan,
      role: current.role,
      persona: canPreview && viewAs ? viewAs : realPersona,
      realPersona,
      canPreview,
      setViewAs,
      profile,
      memberships,
      switchOrg,
      isPlatformAdmin,
      refresh: load,
    };
  }, [current, viewAs, setViewAs, profile, memberships, switchOrg, isPlatformAdmin, load]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center p-8">
        <div className="grid w-full max-w-sm justify-items-center gap-6" aria-busy aria-label={t.shell.loadingAccount}>
          <BrandMark />
          <Skeleton className="h-2 w-40" />
        </div>
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
    return <Onboarding profile={profile} isPlatformAdmin={isPlatformAdmin} onCreated={load} />;
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { MeResponse } from "@turma-certa/types";
import { getSupabase } from "./supabase";
import { api, claimSession, setSessionReplacedHandler } from "./api";

type AuthStatus = "loading" | "signedOut" | "needsVerify" | "needs2fa" | "ready" | "kicked";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  me: MeResponse | null;
  error: string | null;
  pendingEmail: string | null;
  refreshMe: (supportOrgId?: string | null) => Promise<MeResponse | null>;
  setMe: (me: MeResponse | null) => void;
  signIn: (email: string, password: string) => Promise<{ needs2fa?: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsVerify?: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  verifyTotp: (code: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  clearKick: () => void;
  setPendingEmail: (email: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const refreshMe = useCallback(async (supportOrgId?: string | null) => {
    try {
      const path =
        supportOrgId && supportOrgId.length > 0
          ? `/api/v1/me?supportOrgId=${encodeURIComponent(supportOrgId)}`
          : "/api/v1/me";
      const data = await api<MeResponse>(path);
      setMe(data);
      setError(null);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load profile";
      setError(message);
      return null;
    }
  }, []);

  const bootstrapSession = useCallback(
    async (next: Session | null) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (!next) {
        setMe(null);
        setStatus("signedOut");
        return;
      }
      if (!next.user.email_confirmed_at) {
        setPendingEmail(next.user.email ?? null);
        setStatus("needsVerify");
        return;
      }
      try {
        await claimSession();
        const data = await refreshMe();
        setStatus(data ? "ready" : "signedOut");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Session claim failed";
        if (message.toLowerCase().includes("session") && message.toLowerCase().includes("replac")) {
          setStatus("kicked");
          return;
        }
        setError(message);
        setStatus("ready");
      }
    },
    [refreshMe],
  );

  useEffect(() => {
    setSessionReplacedHandler(() => {
      setStatus("kicked");
      setMe(null);
    });
    const supabase = getSupabase();
    if (!supabase) {
      setStatus("signedOut");
      setError("Supabase não configurado");
      return;
    }
    void supabase.auth.getSession().then(({ data }) => bootstrapSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void bootstrapSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [bootstrapSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase não configurado" };
    setPendingEmail(email);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      return { error: authError.message };
    }
    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data && aal.data.currentLevel === "aal1" && aal.data.nextLevel === "aal2") {
      const factors = await supabase.auth.mfa.listFactors();
      const totp = factors.data?.totp?.[0];
      if (totp) {
        setFactorId(totp.id);
        setUser(data.user);
        setSession(data.session);
        setStatus("needs2fa");
        return { needs2fa: true };
      }
    }
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase não configurado" };
    setPendingEmail(email);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: "turmacerta://auth/callback",
      },
    });
    if (authError) return { error: authError.message };
    if (data.user && !data.session) {
      setStatus("needsVerify");
      return { needsVerify: true };
    }
    return {};
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase não configurado" };
    const { error: authError } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (authError) return { error: authError.message };
    return {};
  }, []);

  const verifyTotp = useCallback(
    async (code: string) => {
      const supabase = getSupabase();
      if (!supabase || !factorId) return { error: "2FA indisponível" };
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) return { error: challenge.error.message };
      const verified = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verified.error) return { error: verified.error.message };
      const { data: sessionData } = await supabase.auth.getSession();
      await bootstrapSession(sessionData.session);
      return {};
    },
    [bootstrapSession, factorId],
  );

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase não configurado" };
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "turmacerta://auth/reset",
    });
    if (authError) return { error: authError.message };
    return {};
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase não configurado" };
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) return { error: authError.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    setMe(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user,
      me,
      error,
      pendingEmail,
      refreshMe,
      setMe,
      signIn,
      signUp,
      verifyOtp,
      verifyTotp,
      resetPassword,
      updatePassword,
      signOut,
      clearKick: () => setStatus("signedOut"),
      setPendingEmail,
    }),
    [
      status,
      session,
      user,
      me,
      error,
      pendingEmail,
      refreshMe,
      signIn,
      signUp,
      verifyOtp,
      verifyTotp,
      resetPassword,
      updatePassword,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}

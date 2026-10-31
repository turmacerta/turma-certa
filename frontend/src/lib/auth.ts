import type { SupabaseClient } from "@supabase/supabase-js";
import type { Messages } from "./messages/pt-br";

export const OTP_LENGTH = Number(process.env.NEXT_PUBLIC_OTP_LENGTH ?? 6);
export const RESEND_COOLDOWN_SECONDS = 60;
export const TOTP_LENGTH = 6;

type SupabaseErrorKey = keyof Messages["auth"]["supabaseErrors"];

const SUPABASE_ERRORS: Array<[RegExp, SupabaseErrorKey]> = [
  [/invalid login credentials/i, "invalidCredentials"],
  [/email not confirmed/i, "emailNotConfirmed"],
  [/user already registered/i, "alreadyRegistered"],
  [/password should be at least/i, "shortPassword"],
  [/new password should be different/i, "samePassword"],
  [/token has expired or is invalid/i, "invalidCode"],
  [/otp_expired|expired/i, "expiredCode"],
  [/invalid totp code|invalid mfa/i, "invalidTotp"],
  [/rate limit|too many|security purposes/i, "rateLimit"],
  [/unable to validate email|invalid email/i, "invalidEmail"],
  [/weak password|pwned/i, "weakPassword"],
];

export function authErrorMessage(error: unknown, t: Messages) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/network|fetch/i.test(message)) {
    return t.errors.network;
  }
  const match = SUPABASE_ERRORS.find(([pattern]) => pattern.test(message));
  return match ? t.auth.supabaseErrors[match[1]] : t.errors.generic;
}

export function isEmailNotConfirmed(error: unknown) {
  return error instanceof Error && /email not confirmed/i.test(error.message);
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export type PasswordRuleKey = keyof Messages["auth"]["rules"];

export const PASSWORD_RULES: Array<{ id: PasswordRuleKey; test: (value: string) => boolean }> = [
  { id: "length", test: (value) => value.length >= 8 },
  { id: "case", test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { id: "number", test: (value) => /\d/.test(value) },
  { id: "symbol", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export function passwordScore(value: string) {
  return PASSWORD_RULES.filter((rule) => rule.test(value)).length;
}

export function isStrongPassword(value: string) {
  return passwordScore(value) === PASSWORD_RULES.length;
}

export async function needsSecondFactor(supabase: SupabaseClient) {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return Boolean(data && data.nextLevel === "aal2" && data.currentLevel !== "aal2");
}

export function safeNext(value: string | null | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

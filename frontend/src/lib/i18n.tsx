"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useStoredValue, writeStorage } from "./client-store";
import {
  formatCurrency,
  formatDate,
  formatLongDate,
  formatRange,
  formatTime,
  relativeDay,
  weekdayLong,
  weekdayShort,
  type Locale,
} from "./format";
import { en } from "./messages/en";
import { ptBR, type Messages } from "./messages/pt-br";

export type { Locale };

const LOCALE_KEY = "tc-locale";
const MESSAGES: Record<Locale, Messages> = { "pt-BR": ptBR, en };

export const LOCALE_OPTIONS: Array<{ value: Locale; label: string; name: string }> = [
  { value: "pt-BR", label: "PT", name: "Português" },
  { value: "en", label: "EN", name: "English" },
];

function bindFormat(locale: Locale) {
  return {
    currency: (cents: number) => formatCurrency(cents, locale),
    date: (value: Date | string) => formatDate(value, locale),
    longDate: (value: Date | string) => formatLongDate(value, locale),
    time: (value: Date | string) => formatTime(value, locale),
    range: (start: Date, end: Date) => formatRange(start, end, locale),
    relativeDay: (value: string) => relativeDay(value, locale),
    weekdayShort: (weekday: number) => weekdayShort(weekday, locale),
    weekdayLong: (weekday: number) => weekdayLong(weekday, locale),
    number: (value: number) => new Intl.NumberFormat(locale).format(value),
  };
}

export type Formatters = ReturnType<typeof bindFormat>;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  format: Formatters;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const stored = useStoredValue(LOCALE_KEY);
  const locale: Locale = stored === "en" ? "en" : "pt-BR";

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => writeStorage(LOCALE_KEY, next), []);
  const value = useMemo(
    () => ({ locale, setLocale, t: MESSAGES[locale], format: bindFormat(locale) }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside LocaleProvider");
  }
  return value;
}

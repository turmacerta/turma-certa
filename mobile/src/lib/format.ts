export function formatMoney(cents: number, locale = "pt-BR") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatDateTime(iso: string, locale = "pt-BR") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string, locale = "pt-BR") {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

export function horizonRange(days = 14) {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + days + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

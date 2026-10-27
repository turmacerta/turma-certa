export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function weekdayLabel(weekday: number) {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][weekday] ?? "";
}

"use client";

import { Bell, CalendarX, CircleDollarSign, RefreshCcw } from "lucide-react";
import { useStoredValue, writeStorage } from "@/lib/client-store";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { Menu } from "./menu";
import { useOrg } from "./org-provider";

type Notice = { id: string; kind: string; title: string; body: string; recipient_name: string; created_at: string };

const ICONS: Record<string, typeof Bell> = {
  session_cancelled: CalendarX,
  session_restored: CalendarX,
  payment_reminder: CircleDollarSign,
  renewal_request: RefreshCcw,
};

export function NotificationsMenu() {
  const { t, format } = useI18n();
  const org = useOrg();
  const allowed = org.persona !== "student" && org.can("students.view_all", "schedule.view_all");
  const notices = useApi<Notice[]>(allowed ? `/api/v1/organizations/${org.orgId}/notifications` : null);
  const seenKey = `tc-notices-seen-${org.orgId}`;
  const seen = useStoredValue(seenKey);
  const latest = notices.data?.[0]?.created_at ?? null;
  const unread = Boolean(latest && (!seen || latest > seen));

  if (!allowed) return null;

  return (
    <Menu
      label={t.notifications.title}
      width="w-80"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={() => {
            toggle();
            if (latest) writeStorage(seenKey, latest);
          }}
          aria-label={t.notifications.open}
          className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-surface-2"
        >
          <Bell className="h-5 w-5" />
          {unread ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-bg bg-danger" /> : null}
        </button>
      )}
    >
      {() => (
        <div>
          <p className="px-3 py-2 font-semibold">{t.notifications.title}</p>
          {(notices.data ?? []).length === 0 ? <p className="px-3 pb-3 text-sm text-muted">{t.notifications.empty}</p> : null}
          <ul className="grid max-h-96 gap-1 overflow-y-auto">
            {(notices.data ?? []).map((item) => {
              const Icon = ICONS[item.kind] ?? Bell;
              return (
                <li key={item.id} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.kind === "renewal_request" ? item.body : item.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {item.kind === "renewal_request" ? "" : `${item.recipient_name} · `}
                      {format.relativeDay(item.created_at.slice(0, 10))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Menu>
  );
}

"use client";

import { useState } from "react";
import { Bell, CalendarClock, CircleDollarSign, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Menu } from "./menu";
import { MockBadge } from "./ui";

const ICONS = [UserPlus, CircleDollarSign, CalendarClock];

export function NotificationsMenu() {
  const { t } = useI18n();
  const [read, setRead] = useState(false);

  return (
    <Menu
      label={t.notifications.title}
      width="w-80"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={() => {
            toggle();
            setRead(true);
          }}
          aria-label={t.notifications.open}
          className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-surface-2"
        >
          <Bell className="h-5 w-5" />
          {read ? null : <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-bg bg-danger" />}
        </button>
      )}
    >
      {() => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-semibold">{t.notifications.title}</p>
            <MockBadge />
          </div>
          <ul className="grid gap-1">
            {t.notifications.samples.map((item, index) => {
              const Icon = ICONS[index] ?? Bell;
              return (
                <li key={item.title} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted">{item.time}</span>
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

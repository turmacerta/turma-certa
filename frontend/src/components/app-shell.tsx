"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Eye,
  Languages,
  LogOut,
  Menu as MenuIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Shield,
  Sun,
  UserPlus,
  UserRound,
  Volleyball,
  WalletCards,
  Receipt,
} from "lucide-react";
import { LOCALE_OPTIONS, useI18n } from "@/lib/i18n";
import { HOME_BY_PERSONA, isActive, navigationFor, ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useTheme } from "@/lib/theme";
import type { Persona } from "@/lib/types";
import { usePersistentState } from "@/lib/use-api";
import { BrandMark, LogoMark } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { Menu, MenuDivider, MenuItem, MenuLabel } from "./menu";
import { NotificationsMenu } from "./notifications-menu";
import { useOrg } from "./org-provider";
import { Drawer, useConfirm } from "./overlay";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, Badge, Button, cn, Tooltip } from "./ui";

const SIDEBAR_STATES = ["expanded", "collapsed"] as const;
const PERSONAS: Persona[] = ["manager", "teacher", "student"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const confirm = useConfirm();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const org = useOrg();
  const [sidebar, setSidebar] = usePersistentState("tc-sidebar", "expanded", SIDEBAR_STATES);
  const [moreOpen, setMoreOpen] = useState(false);
  const collapsed = sidebar === "collapsed";
  const nav = navigationFor(org.persona, org.saasPlan);
  const name = org.profile?.full_name ?? "";

  async function signOut() {
    const ok = await confirm({ title: t.shell.signOutTitle, description: t.shell.signOutText, confirmLabel: t.common.signOut });
    if (!ok) {
      return;
    }
    await createBrowserSupabase()?.auth.signOut();
    router.replace(`${ROUTES.login}?notice=signed-out`);
  }

  function changePersona(persona: Persona) {
    org.setViewAs(persona);
    router.push(HOME_BY_PERSONA[persona]);
  }

  const mobilePrimary = nav.slice(0, 4);
  const mobileMore = nav.slice(4);
  const createActions = [
    { href: `${ROUTES.students}?new=1`, label: t.shell.newStudent, icon: UserPlus },
    { href: `${ROUTES.classes}?new=1`, label: t.shell.newClass, icon: Volleyball },
    { href: `${ROUTES.billing}?new=subscription`, label: t.shell.subscribePlan, icon: Receipt },
    { href: `${ROUTES.billing}?tab=plans&new=plan`, label: t.shell.newPlan, icon: WalletCards },
  ];

  return (
    <div className={cn("min-h-screen lg:grid", collapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[264px_1fr]")}>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface/80 px-3 py-5 backdrop-blur lg:flex">
        <Link href={ROUTES.home} aria-label="Turma Certa" className={cn("flex px-2", collapsed && "justify-center")}>
          {collapsed ? <LogoMark /> : <BrandMark />}
        </Link>

        <div className="mt-6 px-1">
          <OrgSwitcher collapsed={collapsed} />
        </div>

        <nav className="mt-6 grid gap-1" aria-label={t.nav.main}>
          {nav.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            const label = t.nav[item.label];
            return (
              <Tooltip key={item.href} label={label} side="right" disabled={!collapsed}>
                <Link
                  href={item.href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                    collapsed && "justify-center",
                    active ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {collapsed ? null : label}
                </Link>
              </Tooltip>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-1">
          {org.isPlatformAdmin ? (
            <Tooltip label={t.nav.backoffice} side="right" disabled={!collapsed}>
              <Link
                href={ROUTES.admin}
                aria-label={t.nav.backoffice}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink",
                  collapsed && "justify-center",
                )}
              >
                <Shield className="h-[18px] w-[18px]" />
                {collapsed ? null : t.nav.backoffice}
              </Link>
            </Tooltip>
          ) : null}
          <button
            type="button"
            onClick={() => setSidebar(collapsed ? "expanded" : "collapsed")}
            aria-label={collapsed ? t.nav.expand : t.nav.collapse}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink",
              collapsed && "justify-center",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {collapsed ? null : t.nav.collapse}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur lg:px-8">
          <Link href={ROUTES.home} aria-label="Turma Certa" className="lg:hidden">
            <LogoMark />
          </Link>
          <div className="min-w-0 flex-1 lg:hidden">
            <p className="truncate text-sm font-bold">{org.orgName}</p>
            <p className="text-xs text-muted">{t.personas[org.persona]}</p>
          </div>
          <div className="hidden flex-1 lg:block">
            {org.canPreview ? <PersonaSwitch value={org.persona} onChange={changePersona} /> : null}
          </div>
          {org.persona === "manager" ? (
            <Menu
              label={t.shell.createMenu}
              width="w-60"
              trigger={({ toggle: open }) => (
                <Button size="sm" onClick={open} className="h-9">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.shell.create}</span>
                </Button>
              )}
            >
              {(close) => (
                <>
                  {createActions.map((action) => (
                    <MenuItem
                      key={action.href}
                      icon={<action.icon className="h-4 w-4" />}
                      onClick={() => {
                        close();
                        router.push(action.href);
                      }}
                    >
                      {action.label}
                    </MenuItem>
                  ))}
                </>
              )}
            </Menu>
          ) : null}
          <LanguageSwitch className="hidden md:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <NotificationsMenu />
          <Menu
            label={t.shell.accountMenu}
            trigger={({ toggle: open }) => (
              <button
                type="button"
                onClick={open}
                className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-surface-2"
                aria-label={t.shell.accountMenu}
              >
                <Avatar name={name || "?"} />
                <span className="hidden text-left text-sm leading-tight md:block">
                  <span className="block max-w-36 truncate font-semibold">{name}</span>
                  <span className="block text-xs text-muted">{t.roles[org.role]}</span>
                </span>
              </button>
            )}
          >
            {(close) => (
              <>
                <div className="px-3 py-2">
                  <p className="truncate font-semibold">{name}</p>
                  <p className="truncate text-xs text-muted">{org.profile?.email}</p>
                </div>
                <MenuDivider />
                <MenuItem
                  icon={<UserRound className="h-4 w-4" />}
                  onClick={() => {
                    close();
                    router.push(ROUTES.account);
                  }}
                >
                  {t.nav.account}
                </MenuItem>
                <MenuItem icon={theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} onClick={toggle}>
                  {theme === "dark" ? t.common.themeLight : t.common.themeDark}
                </MenuItem>
                <MenuItem
                  icon={<Languages className="h-4 w-4" />}
                  hint={LOCALE_OPTIONS.find((option) => option.value !== locale)?.label}
                  onClick={() => setLocale(locale === "en" ? "pt-BR" : "en")}
                >
                  {LOCALE_OPTIONS.find((option) => option.value !== locale)?.name}
                </MenuItem>
                {org.canPreview ? (
                  <div className="lg:hidden">
                    <MenuDivider />
                    <MenuLabel>{t.shell.viewAs}</MenuLabel>
                    {PERSONAS.map((persona) => (
                      <MenuItem
                        key={persona}
                        icon={<Eye className="h-4 w-4" />}
                        active={org.persona === persona}
                        onClick={() => {
                          close();
                          changePersona(persona);
                        }}
                      >
                        {t.personas[persona]}
                      </MenuItem>
                    ))}
                  </div>
                ) : null}
                <MenuDivider />
                <MenuItem
                  icon={<LogOut className="h-4 w-4" />}
                  tone="danger"
                  onClick={() => {
                    close();
                    void signOut();
                  }}
                >
                  {t.common.signOut}
                </MenuItem>
              </>
            )}
          </Menu>
        </header>

        {org.persona !== org.realPersona ? (
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-line bg-accent-soft px-4 py-2 text-center text-xs font-semibold text-ink">
            <Eye className="h-3.5 w-3.5" />
            {t.shell.previewing(t.personas[org.persona])}
            <button type="button" onClick={() => changePersona(org.realPersona)} className="underline">
              {t.shell.backToManagement}
            </button>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <nav
        aria-label={t.nav.main}
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${mobilePrimary.length + 1}, minmax(0, 1fr))` }}
      >
        {mobilePrimary.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold", active ? "text-primary" : "text-muted")}
            >
              <span className={cn("grid h-8 w-12 place-items-center rounded-full transition", active && "bg-primary-soft")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="max-w-full truncate px-1">{t.nav[item.label]}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1 py-1.5 text-[11px] font-semibold",
            mobileMore.some((item) => isActive(item, pathname)) ? "text-primary" : "text-muted",
          )}
        >
          <span className="grid h-8 w-12 place-items-center rounded-full">
            <MenuIcon className="h-5 w-5" />
          </span>
          {t.nav.more}
        </button>
      </nav>

      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} title={t.nav.more}>
        <div className="grid gap-2">
          {[...mobileMore, { href: ROUTES.account, label: "account" as const, icon: UserRound }].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 font-semibold"
              >
                <Icon className="h-5 w-5 text-primary" />
                {t.nav[item.label]}
              </Link>
            );
          })}
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-line px-4 py-3">
            <span className="font-semibold">{t.nav.theme}</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
            <span className="font-semibold">{t.common.language}</span>
            <LanguageSwitch />
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function PersonaSwitch({ value, onChange }: { value: Persona; onChange: (persona: Persona) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{t.shell.viewAs}</span>
      <div role="radiogroup" aria-label={t.shell.viewAs} className="inline-flex rounded-full border border-line bg-surface p-1">
        {PERSONAS.map((persona) => (
          <button
            key={persona}
            type="button"
            role="radio"
            aria-checked={value === persona}
            onClick={() => onChange(persona)}
            className={cn("h-7 rounded-full px-3 text-xs font-semibold transition", value === persona ? "bg-primary text-on-primary" : "text-muted hover:text-ink")}
          >
            {t.personas[persona]}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();

  return (
    <Menu
      label={t.shell.switchSchool}
      align="left"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={`${t.shell.switchSchool}: ${org.orgName}`}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 p-2 text-left transition hover:border-primary/40",
            collapsed && "justify-center",
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Building2 className="h-4 w-4" />
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{org.orgName}</span>
                <span className="block text-xs text-muted">{org.saasPlan === "school" ? t.shell.planSchool : t.shell.planAutonomous}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 text-muted" />
            </>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>{t.shell.yourSchools}</MenuLabel>
          {org.memberships.map((membership) => (
            <MenuItem
              key={membership.organization.id}
              icon={membership.organization.id === org.orgId ? <Check className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4" />}
              hint={<Badge tone="neutral">{t.roles[membership.role]}</Badge>}
              onClick={() => {
                close();
                org.switchOrg(membership.organization.id);
                router.push(ROUTES.home);
              }}
            >
              {membership.organization.name}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Eye,
  FlaskConical,
  Languages,
  Lock,
  LogOut,
  Menu as MenuIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Plus,
  Receipt,
  Shield,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
  Volleyball,
} from "lucide-react";
import { LOCALE_OPTIONS, useI18n } from "@/lib/i18n";
import { canAccess, homeFor, isActive, navigationFor, ROUTES } from "@/lib/navigation";
import type { Permission } from "@/lib/permissions";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useTheme } from "@/lib/theme";
import { usePersistentState } from "@/lib/use-api";
import { BrandMark, LogoMark } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { Menu, MenuDivider, MenuItem, MenuLabel } from "./menu";
import { NotificationsMenu } from "./notifications-menu";
import { useOrg } from "./org-provider";
import { Drawer, useConfirm } from "./overlay";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, Badge, Button, cn, EmptyState, Tooltip } from "./ui";
import { useViewModeNavigation } from "./view-mode";

const SIDEBAR_STATES = ["expanded", "collapsed"] as const;

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
  const nav = navigationFor(org.persona, org.saasPlan, org.can, { network: org.hasNetwork });
  const name = org.profile?.full_name ?? "";
  const navigateTo = useViewModeNavigation();
  const previewing = org.persona !== org.realPersona;

  async function signOut() {
    const ok = await confirm({ title: t.shell.signOutTitle, description: t.shell.signOutText, confirmLabel: t.common.signOut });
    if (!ok) {
      return;
    }
    await createBrowserSupabase()?.auth.signOut();
    router.replace(`${ROUTES.login}?notice=signed-out`);
  }

  const mobilePrimary = nav.slice(0, 4);
  const mobileMore = nav.slice(4);
  const createActions: CreateAction[] = [
    { href: `${ROUTES.classes}?new=1`, label: t.shell.newClass, icon: Volleyball, permissions: ["classes.manage", "classes.create_own"] },
    { href: `${ROUTES.students}?new=1`, label: t.shell.newStudent, icon: Users, permissions: ["students.manage"] },
    { href: `${ROUTES.packages}?new=1`, label: t.shell.newPlan, icon: Package, permissions: ["billing.manage"] },
    { href: `${ROUTES.billing}?new=subscription`, label: t.shell.subscribePlan, icon: Receipt, permissions: ["billing.manage"] },
  ];
  const allowedActions = org.persona === "student" ? [] : createActions.filter((action) => org.can(...action.permissions));

  return (
    <div className={cn("min-h-screen lg:grid", collapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[264px_1fr]")}>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface/80 px-3 py-5 backdrop-blur lg:flex">
        <Link href={ROUTES.home} aria-label="Turma Certa" className={cn("flex px-2", collapsed && "justify-center")}>
          {collapsed ? <LogoMark sport={org.logoSport} /> : <BrandMark sport={org.logoSport} />}
        </Link>

        <div className="mt-6 px-1">
          <ContextSwitcher collapsed={collapsed} />
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
          <div className="min-w-0 flex-1 lg:hidden">
            <ContextSwitcher compact />
          </div>
          <div className="hidden flex-1 lg:block" />
          {allowedActions.length ? <CreateMenu actions={allowedActions} /> : null}
          <NotificationsMenu />
          <div className="flex items-center gap-1">
            <Menu
              label={t.shell.accountMenu}
              trigger={({ toggle: open }) => (
                <button
                  type="button"
                  onClick={open}
                  className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-surface-2"
                  aria-label={t.shell.accountMenu}
                >
                  <Avatar name={name || "?"} src={org.profile?.avatar_url} />
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
            {org.isPlatformAdmin ? <StaffChip /> : null}
          </div>
        </header>

        {previewing || org.customerMode ? (
          <div
            className={cn(
              "flex flex-wrap items-center justify-center gap-2 border-b border-line px-4 py-2 text-center text-xs font-semibold text-ink",
              org.customerMode ? "bg-warning-soft" : "bg-accent-soft",
            )}
          >
            {org.customerMode ? <FlaskConical className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {org.customerMode ? t.shell.customerBanner(t.roles[org.effectiveRole]) : t.shell.previewing(t.personas[org.persona])}
            {org.persona === "teacher" && org.previewTeachers.length > 0 ? <PreviewTeacherPicker /> : null}
            {previewing ? (
              <button type="button" onClick={() => navigateTo(org.realPersona)} className="underline">
                {t.shell.backToManagement}
              </button>
            ) : null}
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-12 lg:pt-8">
          {canAccess(org.persona, org.saasPlan, org.can, pathname, { network: org.hasNetwork }) ? (
            children
          ) : (
            <EmptyState
              icon={<Lock />}
              title={t.shell.noAccessTitle}
              description={t.shell.noAccessText}
              action={<Button onClick={() => router.push(homeFor(org.persona, org.can))}>{t.shell.goHome}</Button>}
            />
          )}
        </main>
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

type CreateAction = { href: string; label: string; icon: typeof Users; permissions: Permission[] };

function CreateMenu({ actions, wide, collapsed }: { actions: CreateAction[]; wide?: boolean; collapsed?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Menu
      label={t.shell.createMenu}
      width="w-60"
      align={wide ? "left" : "right"}
      trigger={({ toggle }) => (
        <Button size="sm" onClick={toggle} aria-label={t.shell.create} className={cn("h-10", wide && "w-full", collapsed && "px-0")}>
          <Plus className="h-4 w-4" />
          {collapsed ? null : <span className={wide ? undefined : "hidden sm:inline"}>{t.shell.create}</span>}
        </Button>
      )}
    >
      {(close) => (
        <>
          {actions.map((action) => (
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
  );
}

function StaffChip() {
  const { t } = useI18n();
  const org = useOrg();
  const customer = org.customerMode;
  return (
    <Tooltip label={customer ? t.shell.backToStaffHint : t.shell.customerModeHint} side="bottom-end">
      <button
        type="button"
        role="switch"
        aria-checked={customer}
        aria-label={customer ? t.shell.backToStaffHint : t.shell.customerModeHint}
        onClick={() => org.setCustomerMode(!customer)}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wider transition",
          customer ? "bg-warning text-black hover:brightness-95" : "bg-primary-soft text-primary hover:bg-primary hover:text-on-primary",
        )}
      >
        {customer ? <FlaskConical className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        {customer ? t.shell.customerChip : t.shell.staff}
      </button>
    </Tooltip>
  );
}

function ContextSwitcher({ collapsed, compact }: { collapsed?: boolean; compact?: boolean }) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const navigateTo = useViewModeNavigation();
  const planLabel = org.saasPlan === "school" ? t.shell.planSchool : t.shell.planAutonomous;
  const showPersonas = org.canPreview && org.personas.length > 1;

  return (
    <Menu
      label={t.shell.switchContext}
      align="left"
      width="w-72"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={`${t.shell.switchContext}: ${org.orgName}`}
          className={cn(
            "flex w-full items-center gap-3 text-left transition",
            compact ? "rounded-xl p-1 hover:bg-surface-2" : "rounded-2xl border border-line bg-surface-2 p-2 hover:border-primary/40",
            collapsed && "justify-center",
          )}
        >
          <span className={cn("grid shrink-0 place-items-center rounded-xl bg-primary-soft text-primary", compact ? "h-8 w-8" : "h-9 w-9")}>
            {compact ? <LogoMark sport={org.logoSport} /> : <Building2 className="h-4 w-4" />}
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{org.orgName}</span>
                <span className="block truncate text-xs text-muted">
                  {org.persona === org.realPersona ? planLabel : t.shell.viewingAs(t.personas[org.persona])}
                </span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
            </>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>{t.shell.yourSchools}</MenuLabel>
          {org.support ? (
            <MenuItem icon={<Check className="h-4 w-4 text-primary" />} hint={<Badge tone="danger">{t.shell.supportMode}</Badge>} onClick={close}>
              {org.orgName}
            </MenuItem>
          ) : null}
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
          {showPersonas ? (
            <>
              <MenuDivider />
              <MenuLabel>{t.shell.viewAs}</MenuLabel>
              {org.personas.map((persona) => (
                <MenuItem
                  key={persona}
                  icon={persona === org.persona ? <Check className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4" />}
                  active={persona === org.persona}
                  hint={persona === org.realPersona ? <span className="text-xs text-muted">{t.shell.yourView}</span> : undefined}
                  onClick={() => {
                    close();
                    navigateTo(persona);
                  }}
                >
                  {t.personas[persona]}
                </MenuItem>
              ))}
            </>
          ) : null}
          {org.isPlatformAdmin ? (
            <>
              <MenuDivider />
              <MenuItem
                icon={<Shield className="h-4 w-4" />}
                onClick={() => {
                  close();
                  if (org.support) org.exitSupport();
                  router.push(ROUTES.admin);
                }}
              >
                {org.support ? t.shell.exitSupport : t.nav.backoffice}
              </MenuItem>
            </>
          ) : null}
        </>
      )}
    </Menu>
  );
}

function PreviewTeacherPicker() {
  const { t } = useI18n();
  const org = useOrg();
  const current = org.previewTeachers.find((teacher) => teacher.id === org.teacherId);
  return (
    <Menu
      label={t.shell.previewTeacher}
      width="w-60"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5">
          {t.shell.previewTeacher} {current?.full_name.split(" ")[0]}
          <ChevronsUpDown className="h-3 w-3 text-muted" />
        </button>
      )}
    >
      {(close) => (
        <>
          {org.previewTeachers.map((teacher) => (
            <MenuItem
              key={teacher.id}
              active={teacher.id === org.teacherId}
              icon={<UserRound className="h-4 w-4" />}
              onClick={() => {
                close();
                org.setViewTeacher(teacher.id);
              }}
            >
              {teacher.full_name}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}


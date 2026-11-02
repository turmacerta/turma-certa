"use client";

import { useMemo, useState } from "react";
import { Lock, Plus, RotateCw, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import { isValidEmail } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { allowedLevel, AREAS, levelOf, TAGS, withLevel, type Permission } from "@/lib/permissions";
import type { MemberTag } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { FilterChips, Pagination, usePaged } from "./data-view";
import { useOrg } from "./org-provider";
import { Dialog, Drawer, useConfirm, useToast } from "./overlay";
import { Avatar, Badge, Button, Card, Checkbox, cn, EmptyState, ErrorState, Field, IconButton, LoadingList, PageHeader, Select, Tabs } from "./ui";

type Role = { id: string; name: string; tag: MemberTag; template: string | null; permissions: Permission[]; members: number };
type RolesResponse = { roles: Role[]; ceilings: Record<MemberTag, Permission[]>; prices: Partial<Record<MemberTag, number>> };
type Member = {
  id: string;
  owner: boolean;
  status: "invited" | "active";
  profile: { id: string; full_name: string; email: string | null } | null;
  role: { id: string; name: string; tag: MemberTag } | null;
};

const TAG_TONES: Record<MemberTag, "primary" | "accent" | "neutral" | "success"> = { manager: "primary", teacher: "success", student: "neutral" };

export function TeamPage() {
  const { t, format } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const org = useOrg();
  const base = `/api/v1/organizations/${org.orgId}/team`;
  const roles = useApi<RolesResponse>(`${base}/roles`);
  const members = useApi<Member[]>(`${base}/members`);
  const [tab, setTab] = useState<"people" | "roles">("people");
  const [tagFilter, setTagFilter] = useState<"all" | MemberTag>("all");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const team = t.settings.team;

  const roleList = useMemo(() => roles.data?.roles ?? [], [roles.data]);
  const pickedRole = roleList.find((role) => role.id === roleId) ?? roleList.find((role) => role.template === "teacher") ?? roleList[0];
  const price = (tag: MemberTag) => roles.data?.prices[tag] ?? 0;
  const priceLabel = (tag: MemberTag) => (tag === "student" || !price(tag) ? team.free : team.perPerson(format.currency(price(tag))));
  const roleOptions = roleList.map((role) => ({ value: role.id, label: role.name === t.tags[role.tag] ? role.name : `${role.name} · ${t.tags[role.tag]}` }));

  const visibleMembers = (members.data ?? []).filter((member) => tagFilter === "all" || member.role?.tag === tagFilter);
  const paged = usePaged(visibleMembers, tagFilter);

  async function reload() {
    await Promise.all([roles.reload(), members.reload()]);
  }

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email.trim()) || !pickedRole || adding) return;
    setAdding(true);
    try {
      await api(`${base}/members`, { method: "POST", body: JSON.stringify({ email: email.trim(), roleId: pickedRole.id }) });
      toast({ message: team.added(email.trim()) });
      setEmail("");
      await reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setAdding(false);
    }
  }

  async function changeRole(member: Member, nextId: string) {
    const role = roleList.find((item) => item.id === nextId);
    try {
      await api(`${base}/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ roleId: nextId }) });
      toast({ message: team.roleChanged(member.profile?.full_name ?? "", role?.name ?? "") });
      await reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  async function resend(member: Member) {
    try {
      await api(`${base}/members/${member.id}/resend`, { method: "POST" });
      toast({ message: team.resent });
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  async function removeMember(member: Member) {
    const name = member.profile?.full_name ?? "";
    const ok = await confirm({ title: team.removeTitle, description: team.removeText(name), confirmLabel: team.remove, tone: "danger" });
    if (!ok) return;
    try {
      await api(`${base}/members/${member.id}`, { method: "DELETE" });
      toast({ message: team.removed(name) });
      await reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  const error = roles.error ?? members.error;

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader title={t.nav.team} description={team.description} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "people", label: team.people, count: members.data?.length },
          { value: "roles", label: team.roles, count: roleList.length || undefined },
        ]}
      />
      {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {!roles.data && !error ? <LoadingList rows={4} /> : null}

      {roles.data && tab === "people" ? (
        <div className="grid grid-cols-1 gap-4">
          <Card className="grid gap-3">
            <form onSubmit={addMember} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end">
              <Field label={team.addEmail} type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={team.emailPlaceholder} />
              <Select label={team.role} value={pickedRole?.id ?? ""} onChange={setRoleId} options={roleOptions} />
              <Button type="submit" disabled={!isValidEmail(email.trim()) || !pickedRole} loading={adding}>
                <UserPlus className="h-4 w-4" />
                {team.add}
              </Button>
            </form>
            <p className="text-xs text-muted">
              {pickedRole ? `${priceLabel(pickedRole.tag)}. ` : ""}
              {team.addHint}
            </p>
          </Card>

          <FilterChips
            value={tagFilter}
            onChange={setTagFilter}
            options={[
              { value: "all", label: t.common.all, count: members.data?.length },
              ...TAGS.map((tag) => ({ value: tag, label: t.tags[tag], count: (members.data ?? []).filter((member) => member.role?.tag === tag).length })),
            ]}
          />

          <ul className="grid grid-cols-1 gap-2">
            {paged.items.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft">
                <Avatar name={member.profile?.full_name ?? "?"} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{member.profile?.full_name}</span>
                    {member.status === "invited" ? <Badge tone="warning">{team.invited}</Badge> : null}
                  </span>
                  <span className="block truncate text-xs text-muted">{member.profile?.email}</span>
                </span>
                {member.owner ? (
                  <Badge tone="primary">{t.roles.owner}</Badge>
                ) : (
                  <span className="flex items-center gap-1">
                    {member.role ? <Badge tone={TAG_TONES[member.role.tag]}>{t.tags[member.role.tag]}</Badge> : null}
                    <span className="w-48">
                      <Select label={team.role} hideLabel value={member.role?.id ?? ""} onChange={(next) => void changeRole(member, next)} options={roleOptions} />
                    </span>
                    {member.status === "invited" ? (
                      <IconButton label={team.resend} onClick={() => void resend(member)}>
                        <RotateCw className="h-4 w-4" />
                      </IconButton>
                    ) : null}
                    <IconButton label={team.remove} onClick={() => void removeMember(member)}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {members.data && visibleMembers.length === 0 ? <EmptyState title={team.emptyTitle} description={team.emptyText} /> : null}
          <Pagination {...paged} />
        </div>
      ) : null}

      {roles.data && tab === "roles" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {roleList.map((role) => (
            <Card key={role.id} onClick={() => setEditing(role)} className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold">{role.name}</p>
                <Badge tone={TAG_TONES[role.tag]}>{t.tags[role.tag]}</Badge>
              </div>
              <p className="text-sm text-muted">{team.peopleCount(role.members)}</p>
              <p className="text-xs text-muted">{priceLabel(role.tag)}</p>
            </Card>
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="grid min-h-28 place-items-center rounded-3xl border-2 border-dashed border-line text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-ink"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {team.newRole}
            </span>
          </button>
          <p className="text-xs text-muted sm:col-span-2 xl:col-span-3">{team.ownerNote}</p>
        </div>
      ) : null}

      {roles.data ? (
        <RoleEditor
          key={editing?.id ?? "closed"}
          role={editing}
          ceilings={roles.data.ceilings}
          base={base}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
            await org.refresh();
          }}
        />
      ) : null}
      {creating && roles.data ? (
        <RoleCreateDialog
          base={base}
          roles={roleList}
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

function RoleEditor({ role, ceilings, base, onClose, onSaved }: { role: Role | null; ceilings: Record<MemberTag, Permission[]>; base: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const team = t.settings.team;
  const [name, setName] = useState(role?.name ?? "");
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? []);
  const [tag, setTag] = useState<MemberTag>(role?.tag ?? "teacher");
  const ceiling = ceilings[tag] ?? [];

  function changeTag(next: MemberTag) {
    setTag(next);
    setPermissions((items) => items.filter((item) => (ceilings[next] ?? []).includes(item)));
  }
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!role) return;
    setSaving(true);
    try {
      await api(`${base}/roles/${role.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim(), permissions, ...(role.template ? {} : { tag }) }) });
      toast({ message: team.saved });
      await onSaved();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!role) return;
    const ok = await confirm({ title: team.deleteTitle, description: team.deleteText(role.name), confirmLabel: team.deleteRole, tone: "danger" });
    if (!ok) return;
    try {
      await api(`${base}/roles/${role.id}`, { method: "DELETE" });
      toast({ message: team.deleted });
      await onSaved();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  return (
    <Drawer
      open={Boolean(role)}
      onClose={onClose}
      title={role?.name ?? ""}
      subtitle={role ? `${t.tags[tag]} · ${team.affects(role.members)}` : null}
      footer={
        <>
          {role && !role.template && role.members === 0 ? (
            <Button variant="quiet-danger" onClick={() => void remove()} className="mr-auto">
              {team.deleteRole}
            </Button>
          ) : null}
          <Button onClick={() => void save()} loading={saving} disabled={name.trim().length < 2}>
            {team.save}
          </Button>
        </>
      }
    >
      {role ? (
        <div className="grid gap-5">
          <Field label={team.roleName} value={name} onChange={(event) => setName(event.target.value)} />
          {role.template ? null : (
            <Select label={team.tag} hint={team.tagHint} value={tag} onChange={(value) => changeTag(value as MemberTag)} options={TAGS.map((value) => ({ value, label: t.tags[value] }))} />
          )}
          {AREAS.map((area) => {
            const current = levelOf(area, permissions);
            return (
              <div key={area.key} className="grid gap-2">
                <p className="text-sm font-semibold">{team.areas[area.key]}</p>
                <div role="radiogroup" aria-label={team.areas[area.key]} className="flex flex-wrap gap-1.5">
                  {area.levels.map((level) => {
                    const allowed = allowedLevel(area, level.key, ceiling);
                    const active = current === level.key;
                    return (
                      <button
                        key={level.key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={!allowed}
                        title={allowed ? undefined : team.aboveCeiling}
                        onClick={() => setPermissions(withLevel(area, permissions, level.key))}
                        className={cn(
                          "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition",
                          active ? "border-primary bg-primary text-on-primary" : "border-line text-muted hover:text-ink",
                          !allowed && "cursor-not-allowed opacity-40 hover:text-muted",
                        )}
                      >
                        {allowed ? null : <Lock className="h-3 w-3" />}
                        {team.levels[area.key]?.[level.key] ?? team.levels.default[level.key]}
                      </button>
                    );
                  })}
                </div>
                {area.extra && ceiling.includes(area.extra) ? (
                  <Checkbox
                    label={team.createOwn}
                    checked={permissions.includes(area.extra)}
                    onChange={(on) => setPermissions(on ? [...permissions, area.extra!] : permissions.filter((item) => item !== area.extra))}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </Drawer>
  );
}

function RoleCreateDialog({ base, roles, onClose, onCreated }: { base: string; roles: Role[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const { t } = useI18n();
  const toast = useToast();
  const team = t.settings.team;
  const [name, setName] = useState("");
  const [tag, setTag] = useState<MemberTag>("teacher");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      const template = roles.find((role) => role.template === tag) ?? roles.find((role) => role.tag === tag);
      await api(`${base}/roles`, { method: "POST", body: JSON.stringify({ name: name.trim(), tag, permissions: template?.permissions ?? [] }) });
      toast({ message: team.created(name.trim()) });
      await onCreated();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={team.newRole}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="role-form" disabled={name.trim().length < 2} loading={saving}>
            {team.create}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={submit} className="grid gap-4">
        <Field label={team.roleName} value={name} onChange={(event) => setName(event.target.value)} placeholder={team.roleNamePlaceholder} autoFocus />
        <Select label={team.tag} hint={team.tagHint} value={tag} onChange={(value) => setTag(value as MemberTag)} options={TAGS.map((value) => ({ value, label: t.tags[value] }))} />
      </form>
    </Dialog>
  );
}

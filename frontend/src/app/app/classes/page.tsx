"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Merge, Plus, Volleyball } from "lucide-react";
import { ClassDetailDrawer, ClassFormDialog } from "@/components/class-drawers";
import { FilterChips, SearchInput, Toolbar, Pagination, usePaged } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { Drawer, useConfirm, useToast } from "@/components/overlay";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingList, OccupancyBar, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { classNickname, classTitle, OCCUPANCY_TONES, occupancyStatus, scheduleSummary } from "@/lib/classes";
import { readQueryParam } from "@/lib/client-store";
import { errorMessage } from "@/lib/errors";
import { normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { SportBadge } from "@/lib/sports";
import { suggestMerges, type MergeSuggestion } from "@/lib/optimizer";
import type { ClassRow } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function ClassesPage() {
  const { t, locale } = useI18n();
  const { orgId, realPersona, teacherId, can } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const isTeacher = !can("classes.view_all");
  const canManage = can("classes.manage");
  const canCreate = can("classes.manage", "classes.create_own");
  const preview = isTeacher && realPersona !== "teacher";
  const classes = useApi<ClassRow[]>(preview ? (teacherId ? `${base}/classes?teacherId=${teacherId}` : null) : `${base}/classes`);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("all");
  const [creating, setCreating] = useState(() => Boolean(readQueryParam("new")));
  const [selected, setSelected] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const noSchedule = t.common.noSchedule;
  const scoped = useMemo(() => classes.data ?? [], [classes.data]);
  const suggestions = useMemo(() => (canManage ? suggestMerges(scoped) : []), [canManage, scoped]);

  const sports = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const item of scoped) {
      if (item.sport) {
        const current = map.get(item.sport.id) ?? { ...item.sport, count: 0 };
        current.count += 1;
        map.set(item.sport.id, current);
      }
    }
    return [...map.values()];
  }, [scoped]);

  const visible = useMemo(
    () =>
      scoped
        .filter((item) => sport === "all" || item.sport?.id === sport)
        .filter(
          (item) =>
            !query ||
            normalize(`${item.name} ${classTitle(item, t)} ${item.teacher?.full_name ?? ""} ${scheduleSummary(item.class_schedules, locale, noSchedule)}`).includes(normalize(query)),
        )
        .sort((a, b) => classTitle(a, t).localeCompare(classTitle(b, t))),
    [scoped, sport, query, t, locale, noSchedule],
  );
  const paged = usePaged(visible, String(visible.length));

  const filtered = Boolean(query) || sport !== "all";

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader
        title={isTeacher ? t.classes.teacherTitle : t.classes.title}
        description={t.classes.description(scoped.length)}
        actions={
          canCreate ? (
            <>
              {suggestions.length > 0 ? (
                <Button variant="outline" onClick={() => setOptimizing(true)}>
                  <Merge className="h-4 w-4" />
                  {t.classes.optimize}
                  <Badge tone="primary">{suggestions.length}</Badge>
                </Button>
              ) : null}
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t.classes.newClass}
              </Button>
            </>
          ) : null
        }
      />

      <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder={t.classes.searchPlaceholder} className="min-w-56 flex-1 sm:max-w-xs" />
        <FilterChips
          value={sport}
          onChange={setSport}
          options={[{ value: "all", label: t.common.all, count: scoped.length }, ...sports.map((item) => ({ value: item.id, label: item.name, count: item.count }))]}
        />
      </Toolbar>

      {!classes.data && !classes.error ? <LoadingList rows={4} /> : null}
      {classes.error ? <ErrorState message={classes.error} onRetry={() => void classes.reload()} /> : null}

      {classes.data && visible.length === 0 ? (
        <EmptyState
          icon={<Volleyball />}
          title={filtered ? t.classes.emptyFiltered : t.classes.emptyTitle}
          description={filtered ? t.classes.emptyFilteredText : t.classes.emptyText}
          action={
            !canCreate || filtered ? null : (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t.classes.createFirst}
              </Button>
            )
          }
        />
      ) : null}

      {visible.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {paged.items.map((item) => {
            const nickname = classNickname(item, t);
            const status = occupancyStatus(item.occupancy.enrolled_count, item.occupancy.max_capacity);
            return (
              <Card key={item.id} onClick={() => setSelected(item.id)} className="grid gap-4">
                <div className="flex items-start gap-3">
                  <SportBadge name={item.sport?.name} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold leading-snug">{classTitle(item, t)}</p>
                    <p className="truncate text-sm text-muted">{scheduleSummary(item.class_schedules, locale, noSchedule)}</p>
                  </div>
                  <span className="tabular text-sm font-semibold">
                    {item.occupancy.enrolled_count}
                    <span className="text-muted">/{item.occupancy.max_capacity}</span>
                  </span>
                </div>
                <OccupancyBar enrolled={item.occupancy.enrolled_count} capacity={item.occupancy.max_capacity} compact />
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted">
                    {item.teacher?.full_name ?? t.common.noTeacher}
                    {nickname ? ` · ${nickname}` : ""}
                  </p>
                  {status === "empty" || status === "full" ? <Badge tone={OCCUPANCY_TONES[status]}>{t.classes.occupancy[status].short}</Badge> : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Pagination {...paged} />

      <ClassFormDialog open={creating} orgId={orgId} onClose={() => setCreating(false)} onCreated={() => void classes.reload()} />
      <ClassDetailDrawer orgId={orgId} classId={selected} onClose={() => setSelected(null)} onChanged={() => void classes.reload()} readOnly={!canManage} />
      <OptimizerDrawer open={optimizing} orgId={orgId} suggestions={suggestions} onClose={() => setOptimizing(false)} onMerged={() => void classes.reload()} />
    </div>
  );
}

function OptimizerDrawer({
  open,
  orgId,
  suggestions,
  onClose,
  onMerged,
}: {
  open: boolean;
  orgId: string;
  suggestions: MergeSuggestion[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const copy = t.classes.optimizer;
  const noSchedule = t.common.noSchedule;

  async function merge(suggestion: MergeSuggestion) {
    const source = `${classTitle(suggestion.source, t)} (${scheduleSummary(suggestion.source.class_schedules, locale, noSchedule)})`;
    const target = `${classTitle(suggestion.target, t)} (${scheduleSummary(suggestion.target.class_schedules, locale, noSchedule)})`;
    const ok = await confirm({ title: copy.confirmTitle, description: copy.confirmText(source, target), confirmLabel: copy.apply });
    if (!ok) return;
    setBusy(suggestion.source.id);
    try {
      await api(`/api/v1/organizations/${orgId}/classes/${suggestion.source.id}/merge`, {
        method: "POST",
        body: JSON.stringify({ targetClassId: suggestion.target.id }),
      });
      toast({ message: copy.applied });
      onMerged();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={copy.title} subtitle={copy.description}>
      {suggestions.length === 0 ? (
        <EmptyState icon={<Merge />} title={copy.emptyTitle} description={copy.emptyText} />
      ) : (
        <ul className="grid gap-3">
          {suggestions.map((suggestion) => (
            <li key={suggestion.source.id} className="grid gap-3 rounded-3xl border border-line p-4">
              <div className="flex items-center gap-3">
                <SportBadge name={suggestion.source.sport?.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{classTitle(suggestion.source, t)}</p>
                  <p className="truncate text-xs text-muted">
                    {scheduleSummary(suggestion.source.class_schedules, locale, noSchedule)} · {suggestion.source.occupancy.enrolled_count}/{suggestion.source.occupancy.max_capacity}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{copy.into}</p>
                  <p className="truncate text-sm font-semibold">{classTitle(suggestion.target, t)}</p>
                  <p className="truncate text-xs text-muted">
                    {scheduleSummary(suggestion.target.class_schedules, locale, noSchedule)} · {suggestion.target.teacher?.full_name ?? t.common.toBeDefined}
                  </p>
                </div>
              </div>
              <ul className="grid gap-1 text-sm text-muted">
                <li>{copy.moving(suggestion.moving)}</li>
                <li>{copy.result(suggestion.enrolledAfter, suggestion.target.occupancy.max_capacity)}</li>
                <li>{copy.frees(copy.hours(Math.round(suggestion.freedHours * 10) / 10))}</li>
              </ul>
              <div className="flex items-center justify-between gap-2">
                {suggestion.samePeriod ? <Badge tone="success">{copy.samePeriod}</Badge> : <span />}
                <Button size="sm" loading={busy === suggestion.source.id} disabled={Boolean(busy)} onClick={() => void merge(suggestion)}>
                  {copy.apply}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

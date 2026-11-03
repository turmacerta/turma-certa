"use client";

import { useMemo, useState } from "react";
import { Plus, Volleyball } from "lucide-react";
import { ClassDetailDrawer, ClassFormDialog } from "@/components/class-drawers";
import { FilterChips, SearchInput, Toolbar, Pagination, usePaged } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingList, OccupancyBar, PageHeader } from "@/components/ui";
import { classNickname, classTitle, OCCUPANCY_TONES, occupancyStatus, scheduleSummary } from "@/lib/classes";
import { useClearQuery, useQueryParam } from "@/lib/client-store";
import { normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { SportBadge } from "@/lib/sports";
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
  const newParam = useQueryParam("new");
  const clearQuery = useClearQuery();
  const [creating, setCreating] = useState(() => Boolean(newParam));
  const [selected, setSelected] = useState<string | null>(null);
  const noSchedule = t.common.noSchedule;
  const scoped = useMemo(() => classes.data ?? [], [classes.data]);

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
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t.classes.newClass}
            </Button>
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

      <ClassFormDialog open={creating} orgId={orgId} onClose={() => (newParam ? clearQuery() : setCreating(false))} onCreated={() => void classes.reload()} />
      <ClassDetailDrawer orgId={orgId} classId={selected} onClose={() => setSelected(null)} onChanged={() => void classes.reload()} readOnly={!canManage} />
    </div>
  );
}


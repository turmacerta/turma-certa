"use client";

import { useMemo, useState } from "react";
import { Plus, Volleyball } from "lucide-react";
import { ClassDetailDrawer, ClassFormDialog, ClassTile } from "@/components/class-drawers";
import { BoardColumn, DataTable, FilterChips, SearchInput, Toolbar, ViewSwitcher } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { Badge, Button, Card, EmptyState, ErrorState, InlineAlert, LoadingList, OccupancyBar, PageHeader, Select } from "@/components/ui";
import { classNickname, classTitle, OCCUPANCY_TONES, occupancyStatus, periodOf, scheduleSummary, type OccupancyStatus, type Period } from "@/lib/classes";
import { readQueryParam } from "@/lib/client-store";
import { normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { SportBadge } from "@/lib/sports";
import type { ClassRow, Teacher } from "@/lib/types";
import { useApi, usePersistentState } from "@/lib/use-api";

const MODES = ["cards", "table", "board"] as const;
const STATUSES: OccupancyStatus[] = ["empty", "low", "open", "full"];

export default function ClassesPage() {
  const { t, locale } = useI18n();
  const { orgId, persona, realPersona, profile } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const classes = useApi<ClassRow[]>(`${base}/classes`);
  const teachers = useApi<Teacher[]>(persona === "teacher" ? `${base}/teachers` : null);
  const [mode, setMode] = usePersistentState("tc-view-classes", "cards", MODES);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("all");
  const [level, setLevel] = useState("all");
  const [period, setPeriod] = useState<"all" | Period>("all");
  const [creating, setCreating] = useState(() => Boolean(readQueryParam("new")));
  const [selected, setSelected] = useState<string | null>(null);
  const isTeacher = persona === "teacher";
  const noSchedule = t.common.noSchedule;

  const myTeacherId = teachers.data?.find((teacher) => teacher.profile_id && teacher.profile_id === profile?.id)?.id ?? null;

  const scoped = useMemo(
    () => (classes.data ?? []).filter((item) => !isTeacher || realPersona !== "teacher" || item.teacher?.id === myTeacherId),
    [classes.data, isTeacher, realPersona, myTeacherId],
  );

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

  const levels = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rank: number }>();
    for (const item of scoped) {
      if (item.class_level && (sport === "all" || item.sport?.id === sport)) {
        map.set(item.class_level.id, { id: item.class_level.id, name: item.class_level.name, rank: item.class_level.rank ?? 0 });
      }
    }
    return [...map.values()].sort((a, b) => a.rank - b.rank);
  }, [scoped, sport]);

  const visible = useMemo(
    () =>
      scoped
        .filter((item) => sport === "all" || item.sport?.id === sport)
        .filter((item) => level === "all" || item.class_level?.id === level)
        .filter((item) => period === "all" || periodOf(item.class_schedules) === period)
        .filter(
          (item) =>
            !query ||
            normalize(`${item.name} ${classTitle(item, t)} ${item.teacher?.full_name ?? ""} ${scheduleSummary(item.class_schedules, locale, noSchedule)}`).includes(normalize(query)),
        )
        .sort((a, b) => classTitle(a, t).localeCompare(classTitle(b, t))),
    [scoped, sport, level, period, query, t, locale, noSchedule],
  );

  const grouped = useMemo(() => {
    const groups: Record<OccupancyStatus, ClassRow[]> = { empty: [], low: [], open: [], full: [] };
    for (const item of visible) {
      groups[occupancyStatus(item.occupancy.enrolled_count, item.occupancy.max_capacity)].push(item);
    }
    return groups;
  }, [visible]);

  const filtered = Boolean(query) || sport !== "all" || level !== "all" || period !== "all";

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader
        eyebrow={isTeacher ? t.classes.eyebrowTeacher : t.classes.eyebrowManager}
        title={isTeacher ? t.classes.teacherTitle : t.classes.title}
        description={t.classes.description(scoped.length)}
        actions={
          isTeacher ? null : (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t.classes.newClass}
            </Button>
          )
        }
      />

      {isTeacher && realPersona !== "teacher" ? (
        <InlineAlert tone="info" title={t.classes.teacherPreviewTitle}>
          {t.classes.teacherPreviewText}
        </InlineAlert>
      ) : null}

      <div className="grid gap-3">
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder={t.classes.searchPlaceholder} className="min-w-56 flex-1 sm:max-w-xs" />
          <div className="w-44">
            <Select
              label={t.classes.level}
              value={level}
              onChange={setLevel}
              options={[{ value: "all", label: t.common.allLevels }, ...levels.map((item) => ({ value: item.id, label: item.name }))]}
            />
          </div>
          <div className="w-36">
            <Select
              label={t.classes.period}
              value={period}
              onChange={(value) => setPeriod(value as "all" | Period)}
              options={[
                { value: "all", label: t.classes.anyPeriod },
                { value: "morning", label: t.classes.periods.morning },
                { value: "afternoon", label: t.classes.periods.afternoon },
                { value: "evening", label: t.classes.periods.evening },
              ]}
            />
          </div>
          <div className="ml-auto self-end">
            <ViewSwitcher value={mode} onChange={setMode} modes={MODES} />
          </div>
        </Toolbar>
        <FilterChips
          value={sport}
          onChange={(value) => {
            setSport(value);
            setLevel("all");
          }}
          options={[{ value: "all", label: t.common.all, count: scoped.length }, ...sports.map((item) => ({ value: item.id, label: item.name, count: item.count }))]}
        />
      </div>

      {classes.loading ? <LoadingList rows={4} /> : null}
      {classes.error ? <ErrorState message={classes.error} onRetry={() => void classes.reload()} /> : null}

      {!classes.loading && !classes.error && visible.length === 0 ? (
        <EmptyState
          icon={<Volleyball />}
          title={filtered ? t.classes.emptyFiltered : t.classes.emptyTitle}
          description={filtered ? t.classes.emptyFilteredText : t.classes.emptyText}
          action={
            isTeacher || filtered ? null : (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t.classes.createFirst}
              </Button>
            )
          }
        />
      ) : null}

      {visible.length > 0 && mode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const nickname = classNickname(item, t);
            const status = occupancyStatus(item.occupancy.enrolled_count, item.occupancy.max_capacity);
            return (
              <Card key={item.id} onClick={() => setSelected(item.id)} className="grid gap-4">
                <div className="flex items-start gap-3">
                  <SportBadge name={item.sport?.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{classTitle(item, t)}</p>
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

      {visible.length > 0 && mode === "table" ? (
        <DataTable
          columns={[
            { label: t.classes.columns.sport },
            { label: t.classes.columns.level },
            { label: t.classes.columns.schedule },
            { label: t.classes.columns.teacher },
            { label: t.classes.columns.occupancy, className: "w-48" },
          ]}
        >
          {visible.map((item) => {
            const nickname = classNickname(item, t);
            return (
              <tr key={item.id} onClick={() => setSelected(item.id)} className="cursor-pointer transition hover:bg-surface-2">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <SportBadge name={item.sport?.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{item.format === "private" ? `${item.sport?.name} · ${t.common.private}` : item.sport?.name}</span>
                      {nickname ? <span className="block truncate text-xs text-muted">{nickname}</span> : null}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">{item.class_level?.name ?? t.common.empty}</td>
                <td className="px-4 py-3 text-muted">{scheduleSummary(item.class_schedules, locale, noSchedule)}</td>
                <td className="px-4 py-3 text-muted">{item.teacher?.full_name ?? t.common.toBeDefined}</td>
                <td className="px-4 py-3">
                  <OccupancyBar enrolled={item.occupancy.enrolled_count} capacity={item.occupancy.max_capacity} />
                </td>
              </tr>
            );
          })}
        </DataTable>
      ) : null}

      {visible.length > 0 && mode === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STATUSES.map((key) => (
            <BoardColumn key={key} title={t.classes.occupancy[key].label} count={grouped[key].length} tone={OCCUPANCY_TONES[key]}>
              {grouped[key].map((item) => (
                <ClassTile
                  key={item.id}
                  name={classTitle(item, t)}
                  subtitle={scheduleSummary(item.class_schedules, locale, noSchedule)}
                  enrolled={item.occupancy.enrolled_count}
                  capacity={item.occupancy.max_capacity}
                  onClick={() => setSelected(item.id)}
                />
              ))}
            </BoardColumn>
          ))}
        </div>
      ) : null}

      <ClassFormDialog open={creating} orgId={orgId} onClose={() => setCreating(false)} onCreated={() => void classes.reload()} />
      <ClassDetailDrawer orgId={orgId} classId={selected} onClose={() => setSelected(null)} onChanged={() => void classes.reload()} readOnly={isTeacher} />
    </div>
  );
}

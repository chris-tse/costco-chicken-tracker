import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock3,
  Drumstick,
  Info,
  Layers3,
  ListFilter,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";

// Three variants of historical frequency and doneness views, switchable via
// `?variant=`, on the throwaway `/prototype/history` route.

const VARIANTS = [
  { key: "a", name: "Coordinated views" },
  { key: "b", name: "Switchable layer" },
  { key: "c", name: "Evidence-ranked list" },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const TIMES = [
  "11:00",
  "12:00",
  "1:00",
  "2:00",
  "3:00",
  "4:00",
  "5:00",
  "6:00",
  "7:00",
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];
type Day = (typeof DAYS)[number];
type Time = (typeof TIMES)[number];
type Doneness = "light" | "medium" | "dark" | "unknown";
type Layer = "frequency" | "doneness";

type HistorySearch = Readonly<{
  variant?: VariantKey;
}>;

type HistoryBucket = Readonly<{
  count: number;
  dark: number;
  day: Day;
  light: number;
  medium: number;
  time: Time;
  unknown: number;
  weeksObserved: number;
}>;

type SelectedBucket = Readonly<{
  day: Day;
  time: Time;
}>;

const COUNT_MATRIX: readonly (readonly number[])[] = [
  [2, 1, 0, 2, 3, 6, 8],
  [7, 6, 4, 8, 7, 11, 13],
  [3, 2, 1, 4, 3, 8, 9],
  [1, 0, 1, 2, 2, 4, 5],
  [2, 2, 1, 3, 4, 5, 6],
  [5, 6, 5, 7, 8, 10, 12],
  [10, 12, 9, 11, 13, 14, 15],
  [6, 8, 6, 7, 10, 12, 11],
  [1, 3, 2, 3, 4, 6, 5],
];

const MIN_RELIABLE_SAMPLE = 4;
const MAX_BUCKET_COUNT = Math.max(...COUNT_MATRIX.flat());

const isVariantKey = (value: unknown): value is VariantKey =>
  VARIANTS.some((variant) => variant.key === value);

const getDarkBias = (timeIndex: number): number => {
  if (timeIndex >= 6) {
    return 0.45;
  }

  if (timeIndex <= 2) {
    return 0.2;
  }

  return 0.32;
};

const parseSearch = (search: Record<string, unknown>): HistorySearch => ({
  variant: isVariantKey(search.variant) ? search.variant : undefined,
});

const buildHistoryBuckets = (): readonly HistoryBucket[] =>
  TIMES.flatMap((time, timeIndex) =>
    DAYS.map((day, dayIndex) => {
      const count = COUNT_MATRIX[timeIndex]?.[dayIndex] ?? 0;
      const unknown = count === 0 ? 0 : Math.max(1, Math.floor(count * 0.22));
      const ratedCount = Math.max(0, count - unknown);
      const darkBias = getDarkBias(timeIndex);
      const dark = Math.min(ratedCount, Math.round(ratedCount * darkBias));
      const light = Math.min(
        ratedCount - dark,
        Math.round(ratedCount * (dayIndex % 3 === 0 ? 0.32 : 0.22))
      );
      const medium = Math.max(0, ratedCount - dark - light);

      return {
        count,
        dark,
        day,
        light,
        medium,
        time,
        unknown,
        weeksObserved: count < MIN_RELIABLE_SAMPLE ? Math.max(1, count) : 8,
      };
    })
  );

const HISTORY_BUCKETS = buildHistoryBuckets();

const getBucket = ({ day, time }: SelectedBucket): HistoryBucket => {
  const bucket = HISTORY_BUCKETS.find(
    (bucket) => bucket.day === day && bucket.time === time
  );

  if (!bucket) {
    throw new Error(`Missing prototype history bucket for ${day} at ${time}`);
  }

  return bucket;
};

const getFrequencyClass = (count: number): string => {
  if (count === 0) {
    return "bg-muted/35";
  }
  if (count <= 2) {
    return "bg-heatmap-1";
  }
  if (count <= 4) {
    return "bg-heatmap-2";
  }
  if (count <= 7) {
    return "bg-heatmap-3";
  }
  if (count <= 10) {
    return "bg-heatmap-4";
  }
  if (count <= 13) {
    return "bg-heatmap-5";
  }
  return "bg-heatmap-6 text-primary-foreground";
};

const getDominantDoneness = (bucket: HistoryBucket): Doneness => {
  const ratedCounts = [
    ["light", bucket.light],
    ["medium", bucket.medium],
    ["dark", bucket.dark],
  ] as const;
  const dominant = ratedCounts.reduce((current, candidate) =>
    candidate[1] > current[1] ? candidate : current
  );

  return dominant[1] === 0 ? "unknown" : dominant[0];
};

const getDonenessClass = (doneness: Doneness): string => {
  const classes: Record<Doneness, string> = {
    dark: "bg-chart-3 text-white",
    light: "bg-chart-4 text-foreground",
    medium: "bg-chart-1 text-white",
    unknown: "bg-muted text-muted-foreground",
  };

  return classes[doneness];
};

const formatDoneness = (doneness: Doneness): string =>
  `${doneness.slice(0, 1).toUpperCase()}${doneness.slice(1)}`;

export const Route = createFileRoute("/prototype/history")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: "/" });
    }
  },
  validateSearch: parseSearch,
  component: HistoryPrototype,
});

function HistoryPrototype() {
  const { variant: searchVariant } = Route.useSearch();
  const navigate = Route.useNavigate();
  const variant = searchVariant ?? VARIANTS[0].key;

  const setVariant = useCallback(
    (nextVariant: VariantKey) => {
      navigate({
        replace: true,
        search: { variant: nextVariant },
      });
    },
    [navigate]
  );

  const cycleVariant = useCallback(
    (direction: -1 | 1) => {
      const currentIndex = VARIANTS.findIndex(
        (candidate) => candidate.key === variant
      );
      const nextIndex =
        (currentIndex + direction + VARIANTS.length) % VARIANTS.length;
      const nextVariant = VARIANTS[nextIndex];

      if (nextVariant) {
        setVariant(nextVariant.key);
      }
    },
    [setVariant, variant]
  );

  const currentVariant = VARIANTS.find(
    (candidate) => candidate.key === variant
  );

  return (
    <>
      {variant === "a" && <CoordinatedViewsVariant />}
      {variant === "b" && <SwitchableLayerVariant />}
      {variant === "c" && <EvidenceRankedListVariant />}

      <PrototypeSwitcher
        currentLabel={`${currentVariant?.key.toUpperCase()} — ${currentVariant?.name}`}
        onNext={() => cycleVariant(1)}
        onPrevious={() => cycleVariant(-1)}
      />
    </>
  );
}

function PrototypeHeader({
  description,
  eyebrow,
  icon,
  title,
}: Readonly<{
  description: string;
  eyebrow: string;
  icon: ReactNode;
  title: string;
}>) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-4xl items-start gap-4 px-4 py-5 sm:px-6">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-semibold text-2xl tracking-tight">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
            {description}
          </p>
        </div>
      </div>
    </header>
  );
}

function CoordinatedViewsVariant() {
  const [selected, setSelected] = useState<SelectedBucket>({
    day: "Sat",
    time: "5:00",
  });
  const selectedBucket = getBucket(selected);

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <PrototypeHeader
        description="Frequency stays primary. Tap any 60-minute bucket to inspect its separate doneness story."
        eyebrow="Variant A · 8 weeks"
        icon={<BarChart3 aria-hidden="true" className="size-5" />}
        title="When chickens appear"
      />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5 sm:px-6">
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-lg">Sightings by label time</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Darker cells mean more sightings. Each row is one hour.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-3 py-1 font-medium text-xs">
              60 min
            </span>
          </div>

          <div className="mt-5 grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] gap-1.5">
            <span aria-hidden="true" />
            {DAYS.map((day) => (
              <span
                className="text-center font-medium text-muted-foreground text-xs"
                key={day}
              >
                {day.slice(0, 1)}
                <span className="sr-only">{day.slice(1)}</span>
              </span>
            ))}

            {TIMES.map((time) => (
              <HistoryGridRow
                key={time}
                onSelect={setSelected}
                selected={selected}
                time={time}
              />
            ))}
          </div>

          <FrequencyLegend className="mt-5" />
          <p className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
            <span className="size-3 rounded-sm border border-muted-foreground/50 border-dashed" />
            Dashed cells have fewer than {MIN_RELIABLE_SAMPLE} sightings.
          </p>
        </section>

        <DonenessInspector bucket={selectedBucket} />

        <PrototypeState>
          State: 60-minute buckets · frequency is always primary · selected{" "}
          {selected.day} at {selected.time} · sparse cells remain visible but
          marked low-confidence.
        </PrototypeState>
      </main>
    </div>
  );
}

function HistoryGridRow({
  onSelect,
  selected,
  time,
}: Readonly<{
  onSelect: (selected: SelectedBucket) => void;
  selected: SelectedBucket;
  time: Time;
}>) {
  return (
    <>
      <span className="self-center text-right text-muted-foreground text-xs tabular-nums">
        {time}
      </span>
      {DAYS.map((day) => {
        const bucket = getBucket({ day, time });
        const isSelected = selected.day === day && selected.time === time;
        const isSparse = bucket.count > 0 && bucket.count < MIN_RELIABLE_SAMPLE;

        return (
          <button
            aria-label={`${day} at ${time}: ${bucket.count} sightings${
              isSparse ? ", limited data" : ""
            }`}
            aria-pressed={isSelected}
            className={`relative aspect-square min-h-8 rounded-md text-xs tabular-nums transition-transform hover:scale-105 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring ${
              isSelected ? "ring-2 ring-foreground ring-offset-2" : ""
            } ${isSparse ? "border border-foreground/40 border-dashed" : ""} ${getFrequencyClass(
              bucket.count
            )}`}
            key={day}
            onClick={() => onSelect({ day, time })}
            type="button"
          >
            {bucket.count === 0 ? (
              <span className="sr-only">None</span>
            ) : (
              bucket.count
            )}
          </button>
        );
      })}
    </>
  );
}

function DonenessInspector({ bucket }: Readonly<{ bucket: HistoryBucket }>) {
  const ratedCount = bucket.light + bucket.medium + bucket.dark;

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-primary text-xs uppercase tracking-[0.14em]">
            Selected bucket
          </p>
          <h2 className="mt-1 font-semibold text-xl">
            {bucket.day} · {bucket.time}–{getNextHour(bucket.time)}
          </h2>
        </div>
        <div className="text-right">
          <p className="font-bold text-2xl tabular-nums">{bucket.count}</p>
          <p className="text-muted-foreground text-xs">sightings</p>
        </div>
      </div>

      {bucket.count < MIN_RELIABLE_SAMPLE ? (
        <SparseNotice count={bucket.count} />
      ) : (
        <>
          <div className="mt-5 flex h-6 overflow-hidden rounded-full bg-muted">
            <DonenessSegment
              className="bg-chart-4"
              count={bucket.light}
              label="Light"
              total={bucket.count}
            />
            <DonenessSegment
              className="bg-chart-1"
              count={bucket.medium}
              label="Medium"
              total={bucket.count}
            />
            <DonenessSegment
              className="bg-chart-3"
              count={bucket.dark}
              label="Dark"
              total={bucket.count}
            />
            <DonenessSegment
              className="bg-muted"
              count={bucket.unknown}
              label="Not rated"
              total={bucket.count}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DonenessStat
              className="bg-chart-4"
              count={bucket.light}
              label="Light"
            />
            <DonenessStat
              className="bg-chart-1"
              count={bucket.medium}
              label="Medium"
            />
            <DonenessStat
              className="bg-chart-3"
              count={bucket.dark}
              label="Dark"
            />
            <DonenessStat
              className="bg-muted-foreground"
              count={bucket.unknown}
              label="Not rated"
            />
          </div>
          <p className="mt-4 text-muted-foreground text-xs">
            Doneness was recorded for {ratedCount} of {bucket.count} sightings.
          </p>
        </>
      )}
    </section>
  );
}

function SwitchableLayerVariant() {
  const [layer, setLayer] = useState<Layer>("frequency");
  const [selected, setSelected] = useState<SelectedBucket>({
    day: "Sat",
    time: "5:00",
  });
  const selectedBucket = getBucket(selected);

  return (
    <div className="min-h-screen bg-background pb-28">
      <PrototypeHeader
        description="One compact grid can show either occurrence strength or the dominant rated doneness."
        eyebrow="Variant B · 8 weeks"
        icon={<Layers3 aria-hidden="true" className="size-5" />}
        title="Patterns by time"
      />

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
          <LayerButton
            active={layer === "frequency"}
            icon={<BarChart3 aria-hidden="true" className="size-4" />}
            label="Frequency"
            onClick={() => setLayer("frequency")}
          />
          <LayerButton
            active={layer === "doneness"}
            icon={<Drumstick aria-hidden="true" className="size-4" />}
            label="Doneness"
            onClick={() => setLayer("doneness")}
          />
        </div>

        <section className="mt-4 rounded-2xl border p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-lg">
                {layer === "frequency"
                  ? "How often labels appear"
                  : "Typical rated doneness"}
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {layer === "frequency"
                  ? "Color intensity represents the sighting count."
                  : "Color represents the most common rating, never the count."}
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs">
              60 min
            </span>
          </div>

          <div className="mt-5 grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] gap-1.5">
            <span aria-hidden="true" />
            {DAYS.map((day) => (
              <span
                className="text-center font-medium text-muted-foreground text-xs"
                key={day}
              >
                {day.slice(0, 1)}
                <span className="sr-only">{day.slice(1)}</span>
              </span>
            ))}

            {TIMES.map((time) => (
              <LayerGridRow
                key={time}
                layer={layer}
                onSelect={setSelected}
                selected={selected}
                time={time}
              />
            ))}
          </div>

          {layer === "frequency" ? (
            <FrequencyLegend className="mt-5" />
          ) : (
            <DonenessLegend className="mt-5" />
          )}
        </section>

        <section
          aria-live="polite"
          className="mt-4 rounded-2xl bg-foreground p-4 text-background sm:p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-background/65 text-xs uppercase tracking-[0.14em]">
                {selected.day} · {selected.time}–{getNextHour(selected.time)}
              </p>
              <p className="mt-1 font-semibold text-lg">
                {selectedBucket.count} sightings
              </p>
            </div>
            <span className="rounded-full bg-background/15 px-3 py-1.5 text-sm">
              {selectedBucket.count < MIN_RELIABLE_SAMPLE
                ? "Limited data"
                : `${formatDoneness(
                    getDominantDoneness(selectedBucket)
                  )} most common`}
            </span>
          </div>
          <p className="mt-3 text-background/70 text-sm">
            Tap the other layer above to change the question while keeping this
            time selected.
          </p>
        </section>

        <PrototypeState>
          State: 60-minute buckets · {layer} layer active · selected{" "}
          {selected.day} at {selected.time} · doneness cells with fewer than{" "}
          {MIN_RELIABLE_SAMPLE} sightings show “?” instead of a conclusion.
        </PrototypeState>
      </main>
    </div>
  );
}

function LayerButton({
  active,
  icon,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      aria-pressed={active}
      className={`flex h-11 items-center justify-center gap-2 rounded-lg font-medium text-sm transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function LayerGridRow({
  layer,
  onSelect,
  selected,
  time,
}: Readonly<{
  layer: Layer;
  onSelect: (selected: SelectedBucket) => void;
  selected: SelectedBucket;
  time: Time;
}>) {
  return (
    <>
      <span className="self-center text-right text-muted-foreground text-xs tabular-nums">
        {time}
      </span>
      {DAYS.map((day) => {
        const bucket = getBucket({ day, time });
        const isSelected = selected.day === day && selected.time === time;
        const cell = getLayerCellPresentation(bucket, layer);

        return (
          <button
            aria-label={`${day} at ${time}: ${cell.label}`}
            aria-pressed={isSelected}
            className={`aspect-square min-h-8 rounded-md font-medium text-xs transition-transform hover:scale-105 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring ${
              isSelected ? "ring-2 ring-foreground ring-offset-2" : ""
            } ${cell.className}`}
            key={day}
            onClick={() => onSelect({ day, time })}
            type="button"
          >
            {cell.content}
          </button>
        );
      })}
    </>
  );
}

const getLayerCellPresentation = (
  bucket: HistoryBucket,
  layer: Layer
): Readonly<{ className: string; content: number | string; label: string }> => {
  if (layer === "frequency") {
    return {
      className: getFrequencyClass(bucket.count),
      content: bucket.count || "–",
      label: `${bucket.count} sightings`,
    };
  }

  if (bucket.count < MIN_RELIABLE_SAMPLE) {
    return {
      className: "border border-dashed bg-muted text-muted-foreground",
      content: "?",
      label: `${bucket.count} sightings, not enough to summarize doneness`,
    };
  }

  const dominantDoneness = getDominantDoneness(bucket);

  return {
    className: getDonenessClass(dominantDoneness),
    content: "●",
    label: `${formatDoneness(dominantDoneness)} is most common`,
  };
};

function EvidenceRankedListVariant() {
  const [selectedDay, setSelectedDay] = useState<Day>("Sat");
  const [expandedTime, setExpandedTime] = useState<Time | null>("5:00");
  const rankedBuckets = useMemo(
    () =>
      HISTORY_BUCKETS.filter((bucket) => bucket.day === selectedDay).sort(
        (first, second) => second.count - first.count
      ),
    [selectedDay]
  );
  const reliableBuckets = rankedBuckets.filter(
    (bucket) => bucket.count >= MIN_RELIABLE_SAMPLE
  );
  const sparseBuckets = rankedBuckets.filter(
    (bucket) => bucket.count < MIN_RELIABLE_SAMPLE
  );

  return (
    <div className="min-h-screen bg-muted/35 pb-28">
      <PrototypeHeader
        description="Skip the grid: rank useful windows, combine frequency and doneness in each row, and disclose the evidence on demand."
        eyebrow="Variant C · 8 weeks"
        icon={<ListFilter aria-hidden="true" className="size-5" />}
        title="Best times by evidence"
      />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
        <section aria-labelledby="day-heading">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg" id="day-heading">
                Choose a day
              </h2>
              <p className="text-muted-foreground text-sm">
                Windows are ranked within one weekday.
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs">
              60 min
            </span>
          </div>
          <fieldset>
            <legend className="sr-only">Day of week</legend>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {DAYS.map((day) => (
                <button
                  aria-pressed={day === selectedDay}
                  className={`min-w-14 rounded-full px-4 py-2 font-medium text-sm ${
                    day === selectedDay
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card hover:bg-muted"
                  }`}
                  key={day}
                  onClick={() => {
                    setSelectedDay(day);
                    setExpandedTime(
                      HISTORY_BUCKETS.filter(
                        (bucket) => bucket.day === day
                      ).sort((first, second) => second.count - first.count)[0]
                        ?.time ?? "5:00"
                    );
                  }}
                  type="button"
                >
                  {day}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section
          aria-label={`${selectedDay} windows`}
          className="mt-4 space-y-3"
        >
          {reliableBuckets.map((bucket, index) => (
            <RankedWindow
              bucket={bucket}
              expanded={bucket.time === expandedTime}
              key={bucket.time}
              onToggle={() =>
                setExpandedTime((current) =>
                  current === bucket.time ? null : bucket.time
                )
              }
              rank={index + 1}
            />
          ))}
        </section>

        <details className="mt-4 rounded-xl border border-dashed bg-card p-4">
          <summary className="cursor-pointer font-medium text-sm">
            {sparseBuckets.length} other windows have limited data
          </summary>
          <p className="mt-2 text-muted-foreground text-sm">
            They are kept out of the ranking until at least{" "}
            {MIN_RELIABLE_SAMPLE} sightings exist. Current samples:{" "}
            {sparseBuckets
              .map((bucket) => `${bucket.time} (${bucket.count})`)
              .join(", ")}
            .
          </p>
        </details>

        <PrototypeState>
          State: {selectedDay} selected · reliable 60-minute windows ranked by
          count · frequency and doneness share each row · sparse windows are
          collapsed below the ranking.
        </PrototypeState>
      </main>
    </div>
  );
}

function RankedWindow({
  bucket,
  expanded,
  onToggle,
  rank,
}: Readonly<{
  bucket: HistoryBucket;
  expanded: boolean;
  onToggle: () => void;
  rank: number;
}>) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <button
        aria-expanded={expanded}
        className="w-full p-4 text-left focus-visible:outline-2 focus-visible:outline-ring"
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
            {rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-lg">
                {bucket.time}–{getNextHour(bucket.time)}
              </h3>
              <span className="font-medium text-sm tabular-nums">
                {bucket.count} sightings
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(bucket.count / MAX_BUCKET_COUNT) * 100}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <DonenessMiniBar bucket={bucket} />
              {expanded ? (
                <ChevronUp
                  aria-label="Collapse details"
                  className="size-4 text-muted-foreground"
                />
              ) : (
                <ChevronDown
                  aria-label="Expand details"
                  className="size-4 text-muted-foreground"
                />
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t bg-muted/35 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <EvidenceStat
              label="Weeks observed"
              value={`${bucket.weeksObserved} of 8`}
            />
            <EvidenceStat
              label="Most common"
              value={formatDoneness(getDominantDoneness(bucket))}
            />
            <EvidenceStat
              label="First half-hour"
              value={splitCount(bucket, 0)}
            />
            <EvidenceStat
              label="Second half-hour"
              value={splitCount(bucket, 1)}
            />
          </div>
          <p className="mt-3 flex items-start gap-2 text-muted-foreground text-xs leading-5">
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            The row is ranked as one hour. Half-hour counts appear only after
            expanding so the overview does not imply precision unsupported by
            the sample.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function DonenessMiniBar({ bucket }: Readonly<{ bucket: HistoryBucket }>) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div
        aria-label={`${bucket.light} light, ${bucket.medium} medium, ${bucket.dark} dark, ${bucket.unknown} not rated`}
        className="flex h-3 min-w-24 flex-1 overflow-hidden rounded-full bg-muted"
        role="img"
      >
        <DonenessSegment
          className="bg-chart-4"
          count={bucket.light}
          label="Light"
          total={bucket.count}
        />
        <DonenessSegment
          className="bg-chart-1"
          count={bucket.medium}
          label="Medium"
          total={bucket.count}
        />
        <DonenessSegment
          className="bg-chart-3"
          count={bucket.dark}
          label="Dark"
          total={bucket.count}
        />
        <DonenessSegment
          className="bg-muted-foreground/40"
          count={bucket.unknown}
          label="Not rated"
          total={bucket.count}
        />
      </div>
      <span className="shrink-0 text-muted-foreground text-xs">
        {formatDoneness(getDominantDoneness(bucket))}
      </span>
    </div>
  );
}

function EvidenceStat({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium text-sm">{value}</p>
    </div>
  );
}

function DonenessSegment({
  className,
  count,
  label,
  total,
}: Readonly<{
  className: string;
  count: number;
  label: string;
  total: number;
}>) {
  if (count === 0 || total === 0) {
    return null;
  }

  return (
    <span
      className={className}
      style={{ width: `${(count / total) * 100}%` }}
      title={`${label}: ${count}`}
    />
  );
}

function DonenessStat({
  className,
  count,
  label,
}: Readonly<{ className: string; count: number; label: string }>) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3">
      <span className={`size-3 rounded-full ${className}`} />
      <div>
        <p className="font-semibold text-sm tabular-nums">{count}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    </div>
  );
}

function FrequencyLegend({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-muted-foreground text-xs">Fewer</span>
      {[
        "bg-heatmap-1",
        "bg-heatmap-2",
        "bg-heatmap-3",
        "bg-heatmap-4",
        "bg-heatmap-5",
        "bg-heatmap-6",
      ].map((className) => (
        <span
          className={`h-3 flex-1 rounded-sm ${className}`}
          key={className}
        />
      ))}
      <span className="text-muted-foreground text-xs">More</span>
    </div>
  );
}

function DonenessLegend({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-2 ${className}`}>
      {[
        ["bg-chart-4", "Light"],
        ["bg-chart-1", "Medium"],
        ["bg-chart-3", "Dark"],
        ["border border-dashed bg-muted", "Limited data"],
      ].map(([className, label]) => (
        <span className="flex items-center gap-1.5 text-xs" key={label}>
          <span className={`size-3 rounded-sm ${className}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function SparseNotice({ count }: Readonly<{ count: number }>) {
  return (
    <div className="mt-5 rounded-xl border border-dashed bg-muted/50 p-4">
      <p className="flex items-center gap-2 font-medium text-sm">
        <Info aria-hidden="true" className="size-4" />
        Not enough history to summarize doneness
      </p>
      <p className="mt-1 text-muted-foreground text-sm">
        {count === 0
          ? "No sightings are recorded in this bucket yet."
          : `Only ${count} sighting${count === 1 ? " is" : "s are"} recorded; ${MIN_RELIABLE_SAMPLE} are required.`}
      </p>
    </div>
  );
}

function PrototypeState({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <aside className="mt-5 rounded-xl border border-dashed p-3 text-muted-foreground text-xs leading-5">
      <p className="flex items-start gap-2">
        <Clock3 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>{children}</span>
      </p>
    </aside>
  );
}

const getNextHour = (time: Time): string => {
  const index = TIMES.indexOf(time);
  const nextTime = TIMES[index + 1];

  if (nextTime) {
    return nextTime;
  }

  return "8:00";
};

const splitCount = (bucket: HistoryBucket, half: 0 | 1): string => {
  const firstHalf = Math.ceil(bucket.count * 0.58);
  const count = half === 0 ? firstHalf : bucket.count - firstHalf;

  return `${count} sighting${count === 1 ? "" : "s"}`;
};

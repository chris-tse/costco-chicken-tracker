import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Drumstick,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";

import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import { Button } from "@/components/ui/button";

// Three variants of the warming-shelf capture flow, switchable via `?variant=`,
// on the throwaway `/prototype/capture` route.

const VARIANTS = [
  { key: "a", name: "One-tap default" },
  { key: "b", name: "Check then save" },
  { key: "c", name: "Save then enrich" },
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];
type Doneness = "light" | "medium" | "dark";

type SightingDraft = Readonly<{
  date: string;
  time: string;
  doneness: Doneness | null;
}>;

type Sighting = SightingDraft & {
  id: string;
  savedAt: string;
};

type CaptureVariantProps = Readonly<{
  draft: SightingDraft;
  feedback: string | null;
  onDraftChange: (draft: SightingDraft) => void;
  onEdit: (sighting: Sighting) => void;
  onSave: (draft: SightingDraft) => Sighting;
  onUpdateDoneness: (id: string, doneness: Doneness | null) => void;
  sightings: readonly Sighting[];
}>;

type CaptureSearch = Readonly<{
  variant?: VariantKey;
}>;

const isVariantKey = (value: unknown): value is VariantKey =>
  VARIANTS.some((variant) => variant.key === value);

const parseSearch = (search: Record<string, unknown>): CaptureSearch => ({
  variant: isVariantKey(search.variant) ? search.variant : undefined,
});

const padNumber = (value: number): string => String(value).padStart(2, "0");

const getCurrentDraft = (): SightingDraft => {
  const now = new Date();

  return {
    date: `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}-${padNumber(now.getDate())}`,
    time: `${padNumber(now.getHours())}:${padNumber(now.getMinutes())}`,
    doneness: null,
  };
};

const SEEDED_SIGHTINGS: readonly Sighting[] = [
  {
    id: "seed-1",
    date: "2026-07-26",
    time: "17:12",
    doneness: "dark",
    savedAt: "2026-07-26T17:14:00",
  },
  {
    id: "seed-2",
    date: "2026-07-24",
    time: "16:47",
    doneness: null,
    savedAt: "2026-07-24T16:49:00",
  },
];

export const Route = createFileRoute("/prototype/capture")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: "/" });
    }
  },
  validateSearch: parseSearch,
  component: CapturePrototype,
});

function CapturePrototype() {
  const { variant: searchVariant } = Route.useSearch();
  const navigate = Route.useNavigate();
  const variant = searchVariant ?? VARIANTS[0].key;
  const [draft, setDraft] = useState<SightingDraft>(getCurrentDraft);
  const [sightings, setSightings] =
    useState<readonly Sighting[]>(SEEDED_SIGHTINGS);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingSighting, setEditingSighting] = useState<Sighting | null>(null);

  const setVariant = useCallback(
    (nextVariant: VariantKey) => {
      setFeedback(null);
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

  const saveSighting = (sightingDraft: SightingDraft): Sighting => {
    const sighting: Sighting = {
      ...sightingDraft,
      id: `prototype-${Date.now()}`,
      savedAt: new Date().toISOString(),
    };

    setSightings((currentSightings) => [sighting, ...currentSightings]);
    setDraft(getCurrentDraft());
    setFeedback(
      `Saved ${formatLabelDateTime(sighting)}${
        sighting.doneness ? ` · ${capitalize(sighting.doneness)}` : ""
      }`
    );

    return sighting;
  };

  const updateDoneness = (id: string, doneness: Doneness | null): void => {
    setSightings((currentSightings) =>
      currentSightings.map((sighting) =>
        sighting.id === id ? { ...sighting, doneness } : sighting
      )
    );
  };

  const updateSighting = (updatedSighting: Sighting): void => {
    setSightings((currentSightings) =>
      currentSightings.map((sighting) =>
        sighting.id === updatedSighting.id ? updatedSighting : sighting
      )
    );
    setEditingSighting(null);
    setFeedback(`Updated ${formatLabelDateTime(updatedSighting)}`);
  };

  const deleteSighting = (id: string): void => {
    setSightings((currentSightings) =>
      currentSightings.filter((sighting) => sighting.id !== id)
    );
    setEditingSighting(null);
    setFeedback("Sighting deleted");
  };

  const variantProps: CaptureVariantProps = {
    draft,
    feedback,
    onDraftChange: setDraft,
    onEdit: setEditingSighting,
    onSave: saveSighting,
    onUpdateDoneness: updateDoneness,
    sightings,
  };
  const currentVariant = VARIANTS.find(
    (candidate) => candidate.key === variant
  );

  return (
    <>
      {variant === "a" && <OneTapDefaultVariant {...variantProps} />}
      {variant === "b" && <CheckThenSaveVariant {...variantProps} />}
      {variant === "c" && <SaveThenEnrichVariant {...variantProps} />}

      <PrototypeState draft={draft} sightings={sightings} variant={variant} />

      {editingSighting ? (
        <EditSightingSheet
          onClose={() => setEditingSighting(null)}
          onDelete={deleteSighting}
          onSave={updateSighting}
          sighting={editingSighting}
        />
      ) : null}

      <PrototypeSwitcher
        currentLabel={`${currentVariant?.key.toUpperCase()} — ${currentVariant?.name}`}
        onNext={() => cycleVariant(1)}
        onPrevious={() => cycleVariant(-1)}
      />
    </>
  );
}

function OneTapDefaultVariant({
  draft,
  feedback,
  onDraftChange,
  onEdit,
  onSave,
  sightings,
}: CaptureVariantProps) {
  const [isCorrecting, setIsCorrecting] = useState(false);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background shadow-sm">
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
              Chicken tracker
            </p>
            <h1 className="font-semibold text-xl">New sighting</h1>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 font-medium text-xs">
            Variant A
          </span>
        </header>

        <main className="flex flex-1 flex-col px-5 py-6">
          {feedback ? <SuccessBanner message={feedback} /> : null}

          <section className="flex flex-1 flex-col justify-center py-8 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
              <Drumstick aria-hidden="true" className="size-10" />
            </div>
            <p className="mt-5 text-muted-foreground text-sm">
              Label time defaults to right now
            </p>
            <p className="mt-1 font-bold text-4xl tabular-nums">
              {formatTime(draft.time)}
            </p>
            <button
              className="mx-auto mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => setIsCorrecting((isOpen) => !isOpen)}
              type="button"
            >
              <CalendarDays aria-hidden="true" className="size-4" />
              {formatDate(draft.date)}
              <span>· Correct</span>
            </button>

            {isCorrecting ? (
              <DateTimeFields
                className="mt-5 rounded-xl border bg-card p-4 text-left"
                draft={draft}
                onDraftChange={onDraftChange}
              />
            ) : null}

            <fieldset className="mt-8">
              <legend className="text-muted-foreground text-sm">
                Doneness <span className="font-normal">(optional)</span>
              </legend>
              <DonenessChoices
                className="mt-3 grid grid-cols-4 gap-2"
                draft={draft}
                onDraftChange={onDraftChange}
              />
            </fieldset>

            <Button
              className="mt-8 h-16 w-full text-lg"
              onClick={() => onSave(draft)}
              size="lg"
            >
              <Check aria-hidden="true" className="size-5" />
              Save {formatTime(draft.time)}
            </Button>
            <button
              className="mx-auto mt-3 text-muted-foreground text-xs underline-offset-4 hover:underline"
              onClick={() => onDraftChange(getCurrentDraft())}
              type="button"
            >
              Reset to current time
            </button>
          </section>

          <RecentSightingsCards
            onEdit={onEdit}
            sightings={sightings}
            title="Recent"
          />
        </main>
      </div>
    </div>
  );
}

function CheckThenSaveVariant({
  draft,
  feedback,
  onDraftChange,
  onEdit,
  onSave,
  sightings,
}: CaptureVariantProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg">
        <header className="border-b bg-card px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Variant B</p>
              <h1 className="font-semibold text-2xl">Record label</h1>
            </div>
            <div className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Drumstick aria-hidden="true" className="size-6" />
            </div>
          </div>
        </header>

        <main className="space-y-6 px-5 py-6">
          {feedback ? <SuccessBanner message={feedback} /> : null}

          <form
            className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              onSave(draft);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Check the label time</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  Both fields stay visible before saving.
                </p>
              </div>
              <button
                className="shrink-0 rounded-md px-2 py-1 font-medium text-primary text-sm hover:bg-primary/10"
                onClick={() => onDraftChange(getCurrentDraft())}
                type="button"
              >
                Now
              </button>
            </div>

            <DateTimeFields draft={draft} onDraftChange={onDraftChange} />

            <fieldset>
              <legend className="font-medium text-sm">
                Doneness{" "}
                <span className="font-normal text-muted-foreground">
                  · optional
                </span>
              </legend>
              <DonenessChoices
                className="mt-2 grid grid-cols-2 gap-2"
                draft={draft}
                onDraftChange={onDraftChange}
                showDescriptions
              />
            </fieldset>

            <Button className="h-14 w-full text-base" size="lg" type="submit">
              Save sighting
              <ChevronRight aria-hidden="true" className="size-5" />
            </Button>
          </form>

          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="font-semibold text-lg">Recent sightings</h2>
                <p className="text-muted-foreground text-sm">
                  Tap a row to correct or delete it.
                </p>
              </div>
              <span className="text-muted-foreground text-xs">
                {sightings.length} total
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border">
              {sightings.map((sighting) => (
                <button
                  className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                  key={sighting.id}
                  onClick={() => onEdit(sighting)}
                  type="button"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                    <Clock3
                      aria-hidden="true"
                      className="size-5 text-muted-foreground"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {formatLabelDateTime(sighting)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {formatDoneness(sighting.doneness)}
                    </p>
                  </div>
                  <Pencil
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SaveThenEnrichVariant({
  draft,
  feedback,
  onDraftChange,
  onEdit,
  onSave,
  onUpdateDoneness,
  sightings,
}: CaptureVariantProps) {
  const [justSaved, setJustSaved] = useState<Sighting | null>(null);
  const [showDate, setShowDate] = useState(false);

  const handleSave = (): void => {
    setJustSaved(onSave({ ...draft, doneness: null }));
  };

  if (justSaved) {
    const currentSaved =
      sightings.find((sighting) => sighting.id === justSaved.id) ?? justSaved;

    return (
      <div className="min-h-screen bg-primary px-5 py-10 text-primary-foreground">
        <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col">
          <p className="font-medium text-sm uppercase tracking-[0.18em] opacity-75">
            Variant C · Saved
          </p>
          <section className="flex flex-1 flex-col justify-center">
            <div className="grid size-16 place-items-center rounded-full bg-primary-foreground text-primary">
              <Check aria-hidden="true" className="size-8" />
            </div>
            <h1 className="mt-6 font-bold text-4xl">Sighting saved</h1>
            <p className="mt-3 text-lg opacity-85">
              {formatLabelDateTime(currentSaved)}
            </p>

            <fieldset className="mt-10">
              <legend className="font-semibold text-lg">Add doneness?</legend>
              <p className="mt-1 text-sm opacity-75">
                Optional—saving already finished.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["light", "medium", "dark"] as const).map((doneness) => {
                  const isSelected = currentSaved.doneness === doneness;

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`h-14 rounded-xl border font-semibold capitalize transition-colors ${
                        isSelected
                          ? "border-primary-foreground bg-primary-foreground text-primary"
                          : "border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                      }`}
                      key={doneness}
                      onClick={() =>
                        onUpdateDoneness(
                          currentSaved.id,
                          isSelected ? null : doneness
                        )
                      }
                      type="button"
                    >
                      {doneness}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Button
              className="mt-8 h-14 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => setJustSaved(null)}
              size="lg"
            >
              Done
            </Button>
            <button
              className="mt-3 rounded-md py-3 text-sm underline underline-offset-4 opacity-80"
              onClick={() => {
                setJustSaved(null);
                onEdit(currentSaved);
              }}
              type="button"
            >
              Correct or delete this sighting
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-primary text-sm">Variant C</p>
            <h1 className="font-semibold text-xl">What does the label say?</h1>
          </div>
          <button
            className="rounded-full bg-muted px-3 py-2 text-muted-foreground text-xs"
            onClick={() => onDraftChange(getCurrentDraft())}
            type="button"
          >
            Use now
          </button>
        </div>

        {feedback ? <SuccessBanner message={feedback} /> : null}

        <section className="flex flex-1 flex-col justify-center py-10">
          <label
            className="text-center font-medium text-muted-foreground text-sm"
            htmlFor="guided-time"
          >
            Label time
          </label>
          <input
            className="mt-2 w-full border-0 bg-transparent text-center font-bold text-6xl tabular-nums tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="guided-time"
            onChange={(event) =>
              onDraftChange({ ...draft, time: event.target.value })
            }
            required
            type="time"
            value={draft.time}
          />

          <button
            className="mx-auto mt-5 flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            onClick={() => setShowDate((isVisible) => !isVisible)}
            type="button"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            {formatDate(draft.date)}
            <span className="text-muted-foreground">· Change</span>
          </button>

          {showDate ? (
            <div className="mx-auto mt-3">
              <label className="sr-only" htmlFor="guided-date">
                Label date
              </label>
              <input
                className="h-12 rounded-lg border bg-background px-3 text-base"
                id="guided-date"
                onChange={(event) =>
                  onDraftChange({ ...draft, date: event.target.value })
                }
                required
                type="date"
                value={draft.date}
              />
            </div>
          ) : null}

          <Button
            className="mt-10 h-16 w-full text-lg"
            onClick={handleSave}
            size="lg"
          >
            Save label time
          </Button>
          <p className="mt-3 text-center text-muted-foreground text-sm">
            Doneness comes next, but it can be skipped.
          </p>
        </section>

        <RecentSightingsCards
          onEdit={onEdit}
          sightings={sightings}
          title="Need to fix one?"
        />
      </main>
    </div>
  );
}

function DateTimeFields({
  className,
  draft,
  onDraftChange,
}: Readonly<{
  className?: string;
  draft: SightingDraft;
  onDraftChange: (draft: SightingDraft) => void;
}>) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Label date</span>
          <input
            className="h-12 w-full rounded-lg border bg-background px-3 text-base"
            onChange={(event) =>
              onDraftChange({ ...draft, date: event.target.value })
            }
            required
            type="date"
            value={draft.date}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Label time</span>
          <input
            className="h-12 w-full rounded-lg border bg-background px-3 text-base"
            onChange={(event) =>
              onDraftChange({ ...draft, time: event.target.value })
            }
            required
            type="time"
            value={draft.time}
          />
        </label>
      </div>
    </div>
  );
}

function DonenessChoices({
  className,
  draft,
  onDraftChange,
  showDescriptions = false,
}: Readonly<{
  className: string;
  draft: SightingDraft;
  onDraftChange: (draft: SightingDraft) => void;
  showDescriptions?: boolean;
}>) {
  const choices: readonly {
    description: string;
    label: string;
    value: Doneness | null;
  }[] = [
    { value: null, label: "None", description: "Skip" },
    { value: "light", label: "Light", description: "Pale" },
    { value: "medium", label: "Medium", description: "Golden" },
    { value: "dark", label: "Dark", description: "Deep brown" },
  ];

  return (
    <div className={className}>
      {choices.map((choice) => {
        const isSelected = draft.doneness === choice.value;

        return (
          <button
            aria-pressed={isSelected}
            className={`min-h-12 rounded-xl border px-2 py-2 text-sm transition-colors ${
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
            key={choice.label}
            onClick={() => onDraftChange({ ...draft, doneness: choice.value })}
            type="button"
          >
            <span className="block font-medium">{choice.label}</span>
            {showDescriptions ? (
              <span
                className={`block text-xs ${
                  isSelected
                    ? "text-primary-foreground/75"
                    : "text-muted-foreground"
                }`}
              >
                {choice.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function RecentSightingsCards({
  onEdit,
  sightings,
  title,
}: Readonly<{
  onEdit: (sighting: Sighting) => void;
  sightings: readonly Sighting[];
  title: string;
}>) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-muted-foreground text-xs">Tap to edit</span>
      </div>
      <div className="space-y-2">
        {sightings.slice(0, 3).map((sighting) => (
          <button
            className="flex w-full items-center rounded-xl border bg-card px-4 py-3 text-left shadow-xs hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
            key={sighting.id}
            onClick={() => onEdit(sighting)}
            type="button"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{formatLabelDateTime(sighting)}</p>
              <p className="text-muted-foreground text-sm">
                {formatDoneness(sighting.doneness)}
              </p>
            </div>
            <Pencil
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function SuccessBanner({ message }: Readonly<{ message: string }>) {
  return (
    <div
      aria-live="polite"
      className="mb-4 flex items-center gap-2 rounded-xl bg-success/15 px-4 py-3 text-sm text-success"
    >
      <Check aria-hidden="true" className="size-4 shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

function EditSightingSheet({
  onClose,
  onDelete,
  onSave,
  sighting,
}: Readonly<{
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (sighting: Sighting) => void;
  sighting: Sighting;
}>) {
  const [draft, setDraft] = useState<SightingDraft>(sighting);
  const [deleteArmed, setDeleteArmed] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/45 px-0 sm:items-center sm:px-4">
      <button
        aria-label="Close sighting editor"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="edit-sighting-title"
        aria-modal="true"
        className="relative w-full max-w-md rounded-t-3xl bg-background p-5 shadow-2xl sm:rounded-3xl"
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Recent sighting</p>
            <h2 className="font-semibold text-xl" id="edit-sighting-title">
              Correct label details
            </h2>
          </div>
          <button
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full hover:bg-muted"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <DateTimeFields
          className="mt-5"
          draft={draft}
          onDraftChange={setDraft}
        />
        <fieldset className="mt-5">
          <legend className="font-medium text-sm">Doneness · optional</legend>
          <DonenessChoices
            className="mt-2 grid grid-cols-4 gap-2"
            draft={draft}
            onDraftChange={setDraft}
          />
        </fieldset>

        <div className="mt-6 grid grid-cols-[auto_1fr] gap-3">
          <Button
            aria-label={
              deleteArmed ? "Confirm delete sighting" : "Delete sighting"
            }
            className="h-12"
            onClick={() => {
              if (deleteArmed) {
                onDelete(sighting.id);
                return;
              }

              setDeleteArmed(true);
            }}
            variant="destructive"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {deleteArmed ? "Delete?" : null}
          </Button>
          <Button
            className="h-12"
            onClick={() => onSave({ ...sighting, ...draft })}
          >
            Save correction
          </Button>
        </div>
        {deleteArmed ? (
          <p className="mt-2 text-center text-destructive text-xs">
            Tap Delete again to confirm.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function PrototypeState({
  draft,
  sightings,
  variant,
}: Readonly<{
  draft: SightingDraft;
  sightings: readonly Sighting[];
  variant: VariantKey;
}>) {
  return (
    <aside className="max-h-72 overflow-auto border-t bg-muted/40 px-4 pt-4 pb-28 text-xs">
      <div className="mx-auto max-w-3xl">
        <p className="font-semibold text-muted-foreground uppercase tracking-wider">
          Prototype state · Variant {variant.toUpperCase()}
        </p>
        <pre className="mt-2 overflow-x-auto text-[11px] leading-4">
          {JSON.stringify(
            {
              activeDraft: draft,
              recentSightings: sightings.slice(0, 3),
            },
            null,
            2
          )}
        </pre>
      </div>
    </aside>
  );
}

const capitalize = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const formatDate = (date: string): string => {
  const parsedDate = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const formatTime = (time: string): string => {
  const [hours = "0", minutes = "0"] = time.split(":");
  const parsedDate = new Date(2000, 0, 1, Number(hours), Number(minutes));

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
};

const formatLabelDateTime = (
  sighting: Pick<SightingDraft, "date" | "time">
): string => `${formatDate(sighting.date)} · ${formatTime(sighting.time)}`;

const formatDoneness = (doneness: Doneness | null): string =>
  doneness ? `${capitalize(doneness)} doneness` : "No doneness recorded";

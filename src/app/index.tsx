import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSighting,
  listRecentSightings,
  saveSighting,
  updateSightingDoneness,
} from "@/lib/sighting-functions";
import {
  type CreateSighting,
  type CreateSightingInput,
  createSightingInputSchema,
  DONENESS_FAILURE_MESSAGE,
  DONENESS_VALUES,
  type GetSighting,
  type ListRecentSightings,
  RECENT_SIGHTINGS_FAILURE_MESSAGE,
  SAVE_FAILURE_MESSAGE,
  type Sighting,
  type UpdateSightingDoneness,
} from "@/lib/sightings";

export const Route = createFileRoute("/")({
  component: CaptureRoute,
  validateSearch: z.object({
    completion: z.coerce.number().int().positive().optional(),
  }),
});

// biome-ignore lint/style/useConsistentTypeDefinitions: AGENTS.md prefers types unless extending.
type LabelTime = {
  labelDate: string;
  labelTime: string;
};

const getCurrentDeviceTime = (): Date => new Date();
const LABEL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const STORE_OPENING_MINUTE = 9 * 60;
const STORE_CLOSING_MINUTE = 20 * 60;
const CORRECTION_NAVIGATION_FAILURE_MESSAGE =
  "Unable to open this correction. Try again.";

function padTimePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function getDeviceLabelTime(date: Date): LabelTime {
  return {
    labelDate: `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`,
    labelTime: `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`,
  };
}

function labelTimeToMinute(labelTime: string): number | undefined {
  const match = LABEL_TIME_PATTERN.exec(labelTime);
  if (!match) {
    return undefined;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function isOutsideStoreHours(labelMinute: number | undefined): boolean {
  return (
    labelMinute !== undefined &&
    (labelMinute < STORE_OPENING_MINUTE || labelMinute > STORE_CLOSING_MINUTE)
  );
}

function formatSavedLabelTime(sighting: Sighting): string {
  const date = new Date(`${sighting.labelDate}T12:00:00`);
  const hour = Math.floor(sighting.labelMinute / 60);
  const minute = sighting.labelMinute % 60;
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hour, minute));
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return `Saved label time for ${formattedDate} at ${time}.`;
}

function formatRecentSighting(sighting: Sighting): string {
  return formatSavedLabelTime(sighting).replace("Saved label time for ", "");
}

function CaptureRoute(): ReactNode {
  const { completion } = Route.useSearch();
  const navigate = useNavigate();
  const get = useServerFn(getSighting);
  const listRecent = useServerFn(listRecentSightings);
  const save = useServerFn(saveSighting);
  const updateDoneness = useServerFn(updateSightingDoneness);
  const saveSightingFromRoute = useCallback<CreateSighting>(
    async (input) => {
      return await save({ data: input });
    },
    [save]
  );
  const updateSightingDonenessFromRoute = useCallback<UpdateSightingDoneness>(
    async (input) => {
      return await updateDoneness({ data: input });
    },
    [updateDoneness]
  );
  const getSightingFromRoute = useCallback<GetSighting>(
    async (id) => {
      return await get({ data: id });
    },
    [get]
  );
  const listRecentSightingsFromRoute =
    useCallback<ListRecentSightings>(async () => {
      return await listRecent();
    }, [listRecent]);

  return (
    <CaptureForm
      getSighting={getSightingFromRoute}
      initialCompletionId={completion}
      listRecentSightings={listRecentSightingsFromRoute}
      onOpenCompletionCorrection={async (id) => {
        await navigate({
          params: { sightingId: id.toString() },
          search: { from: "completion" },
          to: "/sightings/$sightingId",
        });
      }}
      onOpenRecentCorrection={async (id) => {
        await navigate({
          params: { sightingId: id.toString() },
          search: { from: "capture" },
          to: "/sightings/$sightingId",
        });
      }}
      saveSighting={saveSightingFromRoute}
      updateSightingDoneness={updateSightingDonenessFromRoute}
    />
  );
}

export function CapturePage(): ReactNode {
  const save = useServerFn(saveSighting);
  const updateDoneness = useServerFn(updateSightingDoneness);
  const saveSightingFromRoute = useCallback<CreateSighting>(
    async (input) => {
      return await save({ data: input });
    },
    [save]
  );
  const updateSightingDonenessFromRoute = useCallback<UpdateSightingDoneness>(
    async (input) => {
      return await updateDoneness({ data: input });
    },
    [updateDoneness]
  );

  return (
    <CaptureForm
      saveSighting={saveSightingFromRoute}
      updateSightingDoneness={updateSightingDonenessFromRoute}
    />
  );
}

export function CaptureForm({
  getSighting,
  initialCompletionId,
  listRecentSightings,
  now = getCurrentDeviceTime,
  onOpenCompletionCorrection,
  onOpenRecentCorrection,
  saveSighting,
  updateSightingDoneness,
}: Readonly<{
  getSighting?: GetSighting;
  initialCompletionId?: number;
  listRecentSightings?: ListRecentSightings;
  now?: () => Date;
  onOpenCompletionCorrection?: (id: number) => Promise<void> | void;
  onOpenRecentCorrection?: (id: number) => Promise<void> | void;
  saveSighting: CreateSighting;
  updateSightingDoneness?: UpdateSightingDoneness;
}>): ReactNode {
  const [labelTime, setLabelTime] = useState<LabelTime>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [recentErrorMessage, setRecentErrorMessage] = useState<string>();
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const [recentSightings, setRecentSightings] = useState<Sighting[]>();
  const [savedSighting, setSavedSighting] = useState<Sighting>();

  useEffect(() => {
    setLabelTime(getDeviceLabelTime(now()));
  }, [now]);

  useEffect(() => {
    if (!listRecentSightings) {
      return;
    }

    let active = true;
    if (recentRefreshKey > 0) {
      setRecentSightings(undefined);
    }
    const loadRecentSightings = async (): Promise<void> => {
      try {
        const result = await listRecentSightings();
        if (!active) {
          return;
        }

        if (!result.ok) {
          setRecentErrorMessage(result.message);
          return;
        }

        setRecentErrorMessage(undefined);
        setRecentSightings(result.sightings);
      } catch {
        if (active) {
          setRecentErrorMessage(RECENT_SIGHTINGS_FAILURE_MESSAGE);
        }
      }
    };

    loadRecentSightings().catch(() => {
      if (active) {
        setRecentErrorMessage(RECENT_SIGHTINGS_FAILURE_MESSAGE);
      }
    });
    return () => {
      active = false;
    };
  }, [listRecentSightings, recentRefreshKey]);

  useEffect(() => {
    if (!(initialCompletionId && getSighting)) {
      return;
    }

    let active = true;
    const loadCompletion = async (): Promise<void> => {
      try {
        const result = await getSighting(initialCompletionId);
        if (!active) {
          return;
        }

        if (result.ok) {
          setSavedSighting(result.sighting);
          return;
        }

        setErrorMessage(result.message);
      } catch {
        if (active) {
          setErrorMessage(RECENT_SIGHTINGS_FAILURE_MESSAGE);
        }
      }
    };

    loadCompletion().catch(() => {
      if (active) {
        setErrorMessage(RECENT_SIGHTINGS_FAILURE_MESSAGE);
      }
    });
    return () => {
      active = false;
    };
  }, [getSighting, initialCompletionId]);

  if (savedSighting && updateSightingDoneness) {
    return (
      <SightingCompletion
        onDone={() => {
          setErrorMessage(undefined);
          setLabelTime(getDeviceLabelTime(now()));
          setRecentRefreshKey((refreshKey) => refreshKey + 1);
          setSavedSighting(undefined);
        }}
        onOpenCorrection={onOpenCompletionCorrection}
        sighting={savedSighting}
        updateSightingDoneness={updateSightingDoneness}
      />
    );
  }

  if (!labelTime) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
        <header className="mb-8">
          <p className="font-medium text-muted-foreground text-sm">
            Chicken Tracking
          </p>
          <h1 className="mt-2 font-semibold text-4xl tracking-tight">
            Capture
          </h1>
          <p className="mt-2 text-muted-foreground">
            Record the label time exactly as printed.
          </p>
        </header>
        <Card aria-busy="true">
          <CardHeader>
            <CardTitle>Label time</CardTitle>
          </CardHeader>
          <CardContent>
            <output aria-live="polite">Preparing capture form…</output>
          </CardContent>
        </Card>
      </div>
    );
  }

  const labelMinute = labelTimeToMinute(labelTime.labelTime);
  const outsideStoreHours = isOutsideStoreHours(labelMinute);

  const handleSave = async (): Promise<void> => {
    if (isSaving) {
      return;
    }

    if (labelMinute === undefined) {
      setErrorMessage("Enter a complete clock time.");
      return;
    }

    const input: CreateSightingInput = {
      labelDate: labelTime.labelDate,
      labelMinute,
    };
    const validation = createSightingInputSchema.safeParse(input);
    if (!validation.success) {
      setErrorMessage("Enter a complete real date.");
      return;
    }

    setErrorMessage(undefined);
    setIsSaving(true);
    try {
      const result = await saveSighting(validation.data);

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setSavedSighting(result.sighting);
    } catch {
      setErrorMessage(SAVE_FAILURE_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    await handleSave();
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
      <header className="mb-8">
        <p className="font-medium text-muted-foreground text-sm">
          Chicken Tracking
        </p>
        <h1 className="mt-2 font-semibold text-4xl tracking-tight">Capture</h1>
        <p className="mt-2 text-muted-foreground">
          Record the label time exactly as printed.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Label time</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            aria-label="Capture label time"
            className="grid gap-6"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="grid gap-2">
              <Label htmlFor="label-time">Label time</Label>
              <Input
                aria-describedby={
                  outsideStoreHours ? "store-hours-warning" : undefined
                }
                className="h-16 text-3xl"
                id="label-time"
                onChange={(event) => {
                  setLabelTime((current) => {
                    if (!current) {
                      return current;
                    }

                    return { ...current, labelTime: event.target.value };
                  });
                }}
                required
                type="time"
                value={labelTime.labelTime}
              />
              {outsideStoreHours ? (
                <p
                  className="text-sm text-warning-foreground"
                  id="store-hours-warning"
                >
                  Outside store hours
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="label-date">Label date</Label>
              <Input
                id="label-date"
                onChange={(event) => {
                  setLabelTime((current) => {
                    if (!current) {
                      return current;
                    }

                    return { ...current, labelDate: event.target.value };
                  });
                }}
                required
                type="date"
                value={labelTime.labelDate}
              />
            </div>
            {errorMessage ? (
              <p
                aria-live="assertive"
                className="text-destructive text-sm"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}
            {isSaving ? (
              <output aria-live="polite">Saving label time…</output>
            ) : null}
            <Button
              className="h-12 text-base"
              disabled={isSaving}
              type="submit"
            >
              Save label time
            </Button>
          </form>
        </CardContent>
      </Card>
      {listRecentSightings ? (
        <RecentSightings
          errorMessage={recentErrorMessage}
          onOpenCorrection={onOpenRecentCorrection}
          sightings={recentSightings}
        />
      ) : null}
    </div>
  );
}

function RecentSightings({
  errorMessage,
  onOpenCorrection,
  sightings,
}: Readonly<{
  errorMessage?: string;
  onOpenCorrection?: (id: number) => Promise<void> | void;
  sightings?: Sighting[];
}>): ReactNode {
  const [navigationErrorMessage, setNavigationErrorMessage] =
    useState<string>();

  const openCorrection = async (id: number): Promise<void> => {
    if (!onOpenCorrection) {
      return;
    }

    setNavigationErrorMessage(undefined);
    try {
      await onOpenCorrection(id);
    } catch {
      setNavigationErrorMessage(CORRECTION_NAVIGATION_FAILURE_MESSAGE);
    }
  };

  return (
    <section aria-labelledby="recent-sightings-heading" className="mt-8">
      <h2
        className="font-semibold text-2xl tracking-tight"
        id="recent-sightings-heading"
      >
        Recent Sightings
      </h2>
      {errorMessage ? (
        <p className="mt-3 text-destructive text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {navigationErrorMessage ? (
        <p className="mt-3 text-destructive text-sm" role="alert">
          {navigationErrorMessage}
        </p>
      ) : null}
      {errorMessage || sightings ? null : (
        <output
          aria-live="polite"
          className="mt-3 text-muted-foreground text-sm"
        >
          Loading recent sightings…
        </output>
      )}
      {sightings?.length === 0 ? (
        <p className="mt-3 text-muted-foreground text-sm">No sightings yet.</p>
      ) : null}
      {sightings && sightings.length > 0 ? (
        <ul className="mt-3 grid gap-3">
          {sightings.slice(0, 3).map((sighting) => (
            <li key={sighting.id}>
              <Button
                className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left text-base"
                onClick={async () => await openCorrection(sighting.id)}
                type="button"
                variant="outline"
              >
                {formatRecentSighting(sighting)}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SightingCompletion({
  onDone,
  onOpenCorrection,
  sighting,
  updateSightingDoneness,
}: Readonly<{
  onDone: () => void;
  onOpenCorrection?: (id: number) => Promise<void> | void;
  sighting: Sighting;
  updateSightingDoneness: UpdateSightingDoneness;
}>): ReactNode {
  const completionHeadingRef = useRef<HTMLHeadingElement>(null);
  const [currentSighting, setCurrentSighting] = useState(sighting);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [navigationErrorMessage, setNavigationErrorMessage] =
    useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  useEffect(() => {
    completionHeadingRef.current?.focus();
  }, []);

  const saveDoneness = async (
    doneness: Sighting["doneness"]
  ): Promise<void> => {
    if (isUpdating || doneness === currentSighting.doneness) {
      return;
    }

    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    setIsUpdating(true);
    try {
      const result = await updateSightingDoneness({
        doneness,
        id: currentSighting.id,
      });

      if (!result.ok) {
        if (result.kind === "not-found") {
          setErrorMessage(`${result.message} Start a new Capture.`);
          return;
        }

        setErrorMessage(`${result.message} The label time remains saved.`);
        return;
      }

      setCurrentSighting(result.sighting);
      setSuccessMessage(
        doneness === null
          ? "Doneness cleared."
          : `Doneness saved as ${doneness}.`
      );
    } catch {
      setErrorMessage(
        `${DONENESS_FAILURE_MESSAGE} The label time remains saved.`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const openCorrection = async (): Promise<void> => {
    if (!onOpenCorrection) {
      return;
    }

    setNavigationErrorMessage(undefined);
    try {
      await onOpenCorrection(currentSighting.id);
    } catch {
      setNavigationErrorMessage(CORRECTION_NAVIGATION_FAILURE_MESSAGE);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
      <header className="mb-8">
        <p className="font-medium text-muted-foreground text-sm">
          Chicken Tracking
        </p>
        <h1
          className="mt-2 font-semibold text-4xl tracking-tight"
          ref={completionHeadingRef}
          tabIndex={-1}
        >
          Sighting saved
        </h1>
        <p className="mt-2 text-muted-foreground">
          {formatSavedLabelTime(currentSighting)}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Optional doneness</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <p className="text-muted-foreground text-sm">
            Record how the chicken looked, or leave this unrecorded.
          </p>
          <fieldset className="grid gap-3">
            <legend className="sr-only">Doneness</legend>
            {DONENESS_VALUES.map((doneness) => (
              <Button
                aria-pressed={currentSighting.doneness === doneness}
                className="h-12 justify-start text-base capitalize"
                disabled={isUpdating}
                key={doneness}
                onClick={() => saveDoneness(doneness)}
                type="button"
                variant={
                  currentSighting.doneness === doneness ? "default" : "outline"
                }
              >
                {`${doneness[0]?.toUpperCase()}${doneness.slice(1)}`}
              </Button>
            ))}
            <Button
              aria-pressed={currentSighting.doneness === null}
              className="h-12 justify-start text-base"
              disabled={isUpdating || currentSighting.doneness === null}
              onClick={() => saveDoneness(null)}
              type="button"
              variant="outline"
            >
              Clear doneness
            </Button>
          </fieldset>
          {isUpdating ? (
            <output aria-live="polite">Saving doneness…</output>
          ) : null}
          {successMessage ? (
            <output aria-atomic="true" aria-live="polite">
              {successMessage}
            </output>
          ) : null}
          {errorMessage ? (
            <p
              aria-live="assertive"
              className="text-destructive text-sm"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
          {navigationErrorMessage ? (
            <p
              aria-live="assertive"
              className="text-destructive text-sm"
              role="alert"
            >
              {navigationErrorMessage}
            </p>
          ) : null}
          <Button
            className="h-12 text-base"
            disabled={isUpdating}
            onClick={onDone}
            type="button"
          >
            Done
          </Button>
          <Button
            className="h-12 text-base"
            disabled={isUpdating}
            onClick={openCorrection}
            type="button"
            variant="outline"
          >
            Correct this sighting
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

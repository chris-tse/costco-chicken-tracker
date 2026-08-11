import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSighting, updateSightingDoneness } from "@/lib/sighting-functions";
import {
  type CreateSighting,
  type CreateSightingInput,
  createSightingInputSchema,
  DONENESS_FAILURE_MESSAGE,
  DONENESS_VALUES,
  SAVE_FAILURE_MESSAGE,
  type Sighting,
  type UpdateSightingDoneness,
} from "@/lib/sightings";

export const Route = createFileRoute("/")({
  component: CapturePage,
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

export function CapturePage(): ReactNode {
  const save = useServerFn(saveSighting);
  const updateDoneness = useServerFn(updateSightingDoneness);
  const saveSightingFromRoute: CreateSighting = async (input) => {
    return await save({ data: input });
  };
  const updateSightingDonenessFromRoute: UpdateSightingDoneness = async (
    input
  ) => {
    return await updateDoneness({ data: input });
  };

  return (
    <CaptureForm
      saveSighting={saveSightingFromRoute}
      updateSightingDoneness={updateSightingDonenessFromRoute}
    />
  );
}

export function CaptureForm({
  now = getCurrentDeviceTime,
  saveSighting,
  updateSightingDoneness,
}: Readonly<{
  now?: () => Date;
  saveSighting: CreateSighting;
  updateSightingDoneness?: UpdateSightingDoneness;
}>): ReactNode {
  const [labelTime, setLabelTime] = useState<LabelTime>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [savedSighting, setSavedSighting] = useState<Sighting>();

  useEffect(() => {
    setLabelTime(getDeviceLabelTime(now()));
  }, [now]);

  if (savedSighting && updateSightingDoneness) {
    return (
      <SightingCompletion
        onDone={() => {
          setErrorMessage(undefined);
          setLabelTime(getDeviceLabelTime(now()));
          setSavedSighting(undefined);
        }}
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
    </div>
  );
}

function SightingCompletion({
  onDone,
  sighting,
  updateSightingDoneness,
}: Readonly<{
  onDone: () => void;
  sighting: Sighting;
  updateSightingDoneness: UpdateSightingDoneness;
}>): ReactNode {
  const [currentSighting, setCurrentSighting] = useState(sighting);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isUpdating, setIsUpdating] = useState(false);

  const saveDoneness = async (
    doneness: Sighting["doneness"]
  ): Promise<void> => {
    if (isUpdating || doneness === currentSighting.doneness) {
      return;
    }

    setErrorMessage(undefined);
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
    } catch {
      setErrorMessage(
        `${DONENESS_FAILURE_MESSAGE} The label time remains saved.`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
      <header className="mb-8">
        <p className="font-medium text-muted-foreground text-sm">
          Chicken Tracking
        </p>
        <h1 className="mt-2 font-semibold text-4xl tracking-tight">
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
          {errorMessage ? (
            <p
              aria-live="assertive"
              className="text-destructive text-sm"
              role="alert"
            >
              {errorMessage}
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
        </CardContent>
      </Card>
    </main>
  );
}

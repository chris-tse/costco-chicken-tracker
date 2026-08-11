import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { BottomNavigation } from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listWeekdayEvidence } from "@/lib/sighting-functions";
import type { ListWeekdayEvidence } from "@/lib/sightings";
import {
  calculateVisitPlan,
  type VisitPlan,
  type WeekdayEvidence,
} from "@/lib/visit-planner";

export const Route = createFileRoute("/plan")({
  component: PlanRoute,
});

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// biome-ignore lint/style/useConsistentTypeDefinitions: AGENTS.md prefers types unless extending.
type PlanFields = {
  labelTime: string;
  weekday: number;
};

const getCurrentDeviceTime = (): Date => new Date();

function PlanRoute(): ReactNode {
  return <PlanPage />;
}

export function PlanPage(): ReactNode {
  const getWeekdayEvidence = useServerFn(listWeekdayEvidence);
  const listWeekdayEvidenceFromRoute = useCallback<ListWeekdayEvidence>(
    async (weekday) => await getWeekdayEvidence({ data: weekday }),
    [getWeekdayEvidence]
  );

  return <PlanForm listWeekdayEvidence={listWeekdayEvidenceFromRoute} />;
}

export function PlanForm({
  listWeekdayEvidence,
  now = getCurrentDeviceTime,
}: Readonly<{
  listWeekdayEvidence: ListWeekdayEvidence;
  now?: () => Date;
}>): ReactNode {
  const [fields, setFields] = useState<PlanFields>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [evidence, setEvidence] = useState<WeekdayEvidence[]>();
  const [evidenceWeekday, setEvidenceWeekday] = useState<number>();

  useEffect(() => {
    const currentTime = now();
    setFields({
      labelTime: formatTime(currentTime),
      weekday: currentTime.getDay(),
    });
  }, [now]);

  const selectedWeekday = fields?.weekday;

  useEffect(() => {
    if (selectedWeekday === undefined) {
      return;
    }

    let active = true;
    setEvidence(undefined);
    setEvidenceWeekday(undefined);
    setErrorMessage(undefined);
    const loadEvidence = async (): Promise<void> => {
      try {
        const result = await listWeekdayEvidence(selectedWeekday);
        if (!active) {
          return;
        }

        if (!result.ok) {
          setErrorMessage(result.message);
          return;
        }

        setEvidence(result.evidence);
        setEvidenceWeekday(selectedWeekday);
      } catch {
        if (active) {
          setErrorMessage("Unable to load planning evidence. Try again.");
        }
      }
    };

    loadEvidence().catch(() => {
      if (active) {
        setErrorMessage("Unable to load planning evidence. Try again.");
      }
    });
    return () => {
      active = false;
    };
  }, [listWeekdayEvidence, selectedWeekday]);

  if (!fields) {
    return <PlanLoadingFrame />;
  }

  const selectedMinute = labelTimeToMinute(fields.labelTime);
  const selectedEvidence =
    evidenceWeekday === fields.weekday ? evidence : undefined;
  const plan =
    selectedEvidence && selectedMinute !== undefined
      ? calculateVisitPlan(selectedEvidence, selectedMinute)
      : undefined;
  const isLoadingEvidence =
    selectedMinute !== undefined &&
    selectedEvidence === undefined &&
    !errorMessage;

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8"
      data-testid="plan-page"
    >
      <header className="mb-8">
        <p className="font-medium text-muted-foreground text-sm">
          Chicken Tracking
        </p>
        <h1 className="mt-2 font-semibold text-4xl tracking-tight">Plan</h1>
        <p className="mt-2 text-muted-foreground">
          Compare a weekday and approximate time with your historical sightings.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Visit plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <p className="text-muted-foreground">
            I&apos;m going {WEEKDAYS[fields.weekday]} around{" "}
            {formatPlannerTime(fields.labelTime)}.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="plan-weekday">Weekday</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="plan-weekday"
              onChange={(event) => {
                setFields((current) =>
                  current
                    ? { ...current, weekday: Number(event.target.value) }
                    : current
                );
              }}
              value={fields.weekday}
            >
              {WEEKDAYS.map((weekday, index) => (
                <option key={weekday} value={index}>
                  {weekday}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plan-time">Approximate time</Label>
            <Input
              className="h-12 text-base"
              id="plan-time"
              onChange={(event) => {
                setFields((current) =>
                  current
                    ? { ...current, labelTime: event.target.value }
                    : current
                );
              }}
              required
              type="time"
              value={fields.labelTime}
            />
          </div>
          {selectedMinute === undefined ? (
            <p className="text-destructive text-sm" role="alert">
              Choose a complete approximate time.
            </p>
          ) : null}
          {errorMessage ? <PlanFailure message={errorMessage} /> : null}
          {isLoadingEvidence ? (
            <output aria-live="polite">Loading historical sightings…</output>
          ) : null}
          {plan ? (
            <section
              aria-atomic="true"
              aria-live="polite"
              data-testid="planner-result"
            >
              <PlanResult plan={plan} />
            </section>
          ) : null}
        </CardContent>
      </Card>
      <BottomNavigation currentDestination="plan" />
    </div>
  );
}

function PlanFailure({ message }: Readonly<{ message: string }>): ReactNode {
  return (
    <section aria-labelledby="plan-unavailable-heading">
      <h2
        className="font-semibold text-2xl tracking-tight"
        id="plan-unavailable-heading"
      >
        Plan unavailable
      </h2>
      <p className="mt-3 text-destructive text-sm" role="alert">
        {message}
      </p>
      <p className="mt-3 text-muted-foreground text-sm">
        Planning evidence is unavailable.
      </p>
      <p className="mt-3 text-muted-foreground text-sm">
        Selected-window distinct-date count is unavailable.
      </p>
    </section>
  );
}

function PlanLoadingFrame(): ReactNode {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
      <header className="mb-8">
        <p className="font-medium text-muted-foreground text-sm">
          Chicken Tracking
        </p>
        <h1 className="mt-2 font-semibold text-4xl tracking-tight">Plan</h1>
      </header>
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle>Visit plan</CardTitle>
        </CardHeader>
        <CardContent>
          <output aria-live="polite">Preparing Visit plan…</output>
        </CardContent>
      </Card>
      <BottomNavigation currentDestination="plan" />
    </div>
  );
}

function PlanResult({ plan }: Readonly<{ plan: VisitPlan }>): ReactNode {
  const countDescription = `Selected window: ${formatDateCount(plan.selectedDateCount)}.`;

  if (plan.state === "no-weekday-history") {
    return (
      <PlanState
        coaching="Record label times on this weekday to improve this Visit plan."
        countDescription={countDescription}
        heading="No history for this weekday"
      />
    );
  }

  if (plan.state === "zero-selected-matches") {
    return (
      <PlanState
        coaching="Record more label times to improve this Visit plan."
        countDescription={countDescription}
        heading="No matching sightings yet"
      />
    );
  }

  if (plan.state === "insufficient-comparison") {
    return (
      <PlanState
        coaching="Record more label times to improve this Visit plan."
        countDescription={countDescription}
        heading="Not enough history to compare yet"
      />
    );
  }

  const headingBySignal = {
    better: "One of the better times",
    quieter: "One of the quieter times",
    typical: "About typical",
  } as const;

  return (
    <section aria-labelledby="planner-signal-heading">
      <h2
        className="font-semibold text-2xl tracking-tight"
        id="planner-signal-heading"
      >
        {headingBySignal[plan.signal]}
      </h2>
      <p className="mt-3 text-muted-foreground text-sm">{countDescription}</p>
    </section>
  );
}

function PlanState({
  coaching,
  countDescription,
  heading,
}: Readonly<{
  coaching: string;
  countDescription: string;
  heading: string;
}>): ReactNode {
  return (
    <section aria-labelledby="planner-state-heading">
      <h2
        className="font-semibold text-2xl tracking-tight"
        id="planner-state-heading"
      >
        {heading}
      </h2>
      <p className="mt-3 text-muted-foreground text-sm">{countDescription}</p>
      <p className="mt-3 text-muted-foreground text-sm">{coaching}</p>
      <a
        className="mt-4 inline-flex h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-base text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        href="/"
      >
        Capture
      </a>
    </section>
  );
}

function formatDateCount(count: number): string {
  return `${count} distinct ${count === 1 ? "date" : "dates"}`;
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function labelTimeToMinute(labelTime: string): number | undefined {
  const match = TIME_PATTERN.exec(labelTime);
  if (!match) {
    return undefined;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatPlannerTime(labelTime: string): string {
  const labelMinute = labelTimeToMinute(labelTime);
  if (labelMinute === undefined) {
    return labelTime;
  }

  const hour = Math.floor(labelMinute / 60);
  const minute = labelMinute % 60;
  const period = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 || 12;

  return `${twelveHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

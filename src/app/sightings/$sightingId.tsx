import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  correctSighting,
  deleteSighting,
  getSighting,
} from "@/lib/sighting-functions";
import {
  type CorrectSighting,
  correctSightingInputSchema,
  DELETE_FAILURE_MESSAGE,
  type DeleteSighting,
  DONENESS_VALUES,
  type GetSighting,
  RECENT_SIGHTINGS_FAILURE_MESSAGE,
  SIGHTING_NOT_FOUND_MESSAGE,
  type Sighting,
} from "@/lib/sightings";

export const Route = createFileRoute("/sightings/$sightingId")({
  component: CorrectionRoute,
  validateSearch: z.object({
    from: z.enum(["capture", "completion"]).catch("capture"),
  }),
});

const LABEL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// biome-ignore lint/style/useConsistentTypeDefinitions: AGENTS.md prefers types unless extending.
type CorrectionFields = {
  doneness: Sighting["doneness"];
  labelDate: string;
  labelTime: string;
};

function labelMinuteToTime(labelMinute: number): string {
  const hour = Math.floor(labelMinute / 60);
  const minute = labelMinute % 60;

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function labelTimeToMinute(labelTime: string): number | undefined {
  const match = LABEL_TIME_PATTERN.exec(labelTime);
  if (!match) {
    return undefined;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function correctionFieldsFromSighting(sighting: Sighting): CorrectionFields {
  return {
    doneness: sighting.doneness,
    labelDate: sighting.labelDate,
    labelTime: labelMinuteToTime(sighting.labelMinute),
  };
}

function getFocusTarget(isLoading: boolean, isNotFound: boolean): string {
  if (isLoading) {
    return "loading";
  }

  return isNotFound ? "not-found" : "editor";
}

export function CorrectionRoute(): ReactNode {
  const { sightingId } = Route.useParams();
  const { from } = Route.useSearch();
  const navigate = useNavigate();
  const correct = useServerFn(correctSighting);
  const remove = useServerFn(deleteSighting);
  const get = useServerFn(getSighting);
  const id = Number(sightingId);
  const returnToOrigin = async (
    preserveCompletion: boolean,
    sighting?: Sighting
  ): Promise<void> => {
    await navigate({
      search:
        preserveCompletion && from === "completion"
          ? { completion: sighting?.id ?? id }
          : {},
      to: "/",
    });
  };

  return (
    <CorrectionEditor
      correctSighting={async (input) => await correct({ data: input })}
      deleteSighting={async (deleteId) => await remove({ data: deleteId })}
      getSighting={async (getId) => await get({ data: getId })}
      id={id}
      onCancel={async () => await returnToOrigin(true)}
      onDeleted={async () => await returnToOrigin(false)}
      onNotFoundReturn={async () => await returnToOrigin(false)}
      onSaved={async (sighting) => await returnToOrigin(true, sighting)}
    />
  );
}

export function CorrectionEditor({
  correctSighting,
  deleteSighting,
  getSighting,
  id,
  onCancel,
  onDeleted,
  onNotFoundReturn,
  onSaved,
}: Readonly<{
  correctSighting: CorrectSighting;
  deleteSighting: DeleteSighting;
  getSighting: GetSighting;
  id: number;
  onCancel: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onNotFoundReturn: () => Promise<void>;
  onSaved: (sighting: Sighting) => Promise<void>;
}>): ReactNode {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const [fields, setFields] = useState<CorrectionFields>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const focusTarget = getFocusTarget(isLoading, isNotFound);

  useEffect(() => {
    if (focusTarget !== "loading") {
      headingRef.current?.focus();
    }
  }, [focusTarget]);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    let active = true;
    if (loadAttempt > 0) {
      setFields(undefined);
      setIsNotFound(false);
    }
    const markLoadUnavailable = (): void => {
      if (active) {
        setErrorMessage(RECENT_SIGHTINGS_FAILURE_MESSAGE);
      }
    };
    const loadSighting = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);
      try {
        const result = await getSighting(id);
        if (!active) {
          return;
        }

        if (!result.ok) {
          setIsNotFound(result.kind === "not-found");
          setErrorMessage(
            result.kind === "not-found" ? undefined : result.message
          );
          return;
        }

        setFields(correctionFieldsFromSighting(result.sighting));
        setIsNotFound(false);
      } catch {
        markLoadUnavailable();
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadSighting().catch(markLoadUnavailable);
    return () => {
      active = false;
    };
  }, [getSighting, id, loadAttempt]);

  const updateFields = (next: Partial<CorrectionFields>): void => {
    setFields((current) => (current ? { ...current, ...next } : current));
  };

  const saveCorrection = async (): Promise<void> => {
    if (!fields || isSaving || isDeleting) {
      return;
    }

    const labelMinute = labelTimeToMinute(fields.labelTime);
    if (labelMinute === undefined) {
      setErrorMessage("Enter a complete clock time.");
      return;
    }

    const validation = correctSightingInputSchema.safeParse({
      doneness: fields.doneness,
      id,
      labelDate: fields.labelDate,
      labelMinute,
    });
    if (!validation.success) {
      setErrorMessage("Enter a complete real date.");
      return;
    }

    setErrorMessage(undefined);
    setIsSaving(true);
    try {
      const result = await correctSighting(validation.data);
      if (!result.ok) {
        if (result.kind === "not-found") {
          setIsNotFound(true);
          return;
        }

        setErrorMessage(result.message);
        return;
      }

      await onSaved(result.sighting);
    } catch {
      setErrorMessage("Unable to save this correction. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeletion = async (): Promise<void> => {
    if (isDeleting || isSaving) {
      return;
    }

    setErrorMessage(undefined);
    setIsDeleting(true);
    try {
      const result = await deleteSighting(id);
      if (!result.ok) {
        if (result.kind === "not-found") {
          setIsNotFound(true);
          setIsConfirmingDeletion(false);
          return;
        }

        setErrorMessage(result.message);
        return;
      }

      await onDeleted();
    } catch {
      setErrorMessage(DELETE_FAILURE_MESSAGE);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    await saveCorrection();
  };

  const returnWithoutSaving = async (
    returnToOrigin: () => Promise<void>
  ): Promise<void> => {
    try {
      await returnToOrigin();
    } catch {
      setErrorMessage("Unable to return to Capture. Try again.");
    }
  };

  if (isLoading) {
    return (
      <CorrectionFrame heading="Correct sighting">
        Loading sighting…
      </CorrectionFrame>
    );
  }

  if (isNotFound) {
    return (
      <CorrectionFrame heading="Sighting not found" headingRef={headingRef}>
        <p className="text-muted-foreground">{SIGHTING_NOT_FOUND_MESSAGE}</p>
        <Button
          className="mt-6 h-12 text-base"
          onClick={async () => await returnWithoutSaving(onNotFoundReturn)}
          type="button"
        >
          Return to Capture
        </Button>
      </CorrectionFrame>
    );
  }

  if (!fields) {
    return (
      <CorrectionFrame heading="Correct sighting" headingRef={headingRef}>
        <p className="text-destructive" role="alert">
          {errorMessage ?? RECENT_SIGHTINGS_FAILURE_MESSAGE}
        </p>
        <Button
          className="mt-6 h-12 text-base"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          type="button"
        >
          Try again
        </Button>
        <Button
          className="mt-3 h-12 text-base"
          onClick={async () => await returnWithoutSaving(onCancel)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </CorrectionFrame>
    );
  }

  return (
    <CorrectionFrame heading="Correct sighting" headingRef={headingRef}>
      <Card>
        <CardHeader>
          <CardTitle>Label facts</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="correction-label-time">Label time</Label>
              <Input
                className="h-16 text-3xl"
                id="correction-label-time"
                onChange={(event) =>
                  updateFields({ labelTime: event.target.value })
                }
                required
                type="time"
                value={fields.labelTime}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="correction-label-date">Label date</Label>
              <Input
                id="correction-label-date"
                onChange={(event) =>
                  updateFields({ labelDate: event.target.value })
                }
                required
                type="date"
                value={fields.labelDate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="correction-doneness">Doneness</Label>
              <select
                className="h-12 rounded-md border bg-background px-3"
                id="correction-doneness"
                onChange={(event) =>
                  updateFields({
                    doneness:
                      event.target.value === ""
                        ? null
                        : (event.target.value as Sighting["doneness"]),
                  })
                }
                value={fields.doneness ?? ""}
              >
                <option value="">Not recorded</option>
                {DONENESS_VALUES.map((doneness) => (
                  <option key={doneness} value={doneness}>
                    {`${doneness[0]?.toUpperCase()}${doneness.slice(1)}`}
                  </option>
                ))}
              </select>
            </div>
            {errorMessage ? (
              <p className="text-destructive text-sm" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {isSaving ? (
              <output aria-live="polite">Saving correction…</output>
            ) : null}
            <Button
              className="h-12 text-base"
              disabled={isSaving || isDeleting}
              type="submit"
            >
              Save correction
            </Button>
            <Button
              className="h-12 text-base"
              disabled={isSaving || isDeleting}
              onClick={async () => await returnWithoutSaving(onCancel)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
      <Dialog
        onOpenChange={setIsConfirmingDeletion}
        open={isConfirmingDeletion}
      >
        <section
          aria-labelledby="delete-heading"
          className="mt-8 border-destructive border-t pt-6"
        >
          <h2 className="font-semibold text-xl" id="delete-heading">
            Delete this sighting
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Deletion permanently removes this sighting.
          </p>
          <DialogTrigger asChild>
            <Button
              className="mt-4 h-12 text-base"
              disabled={isSaving || isDeleting}
              type="button"
              variant="destructive"
            >
              Delete sighting
            </Button>
          </DialogTrigger>
        </section>
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            confirmationRef.current?.focus();
          }}
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle ref={confirmationRef} tabIndex={-1}>
              Permanently delete this sighting?
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {errorMessage ? (
            <p className="text-destructive text-sm" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {isDeleting ? (
            <output aria-live="polite">Deleting sighting…</output>
          ) : null}
          <DialogFooter>
            <Button
              disabled={isDeleting}
              onClick={confirmDeletion}
              type="button"
              variant="destructive"
            >
              Permanently delete
            </Button>
            <DialogClose asChild>
              <Button disabled={isDeleting} type="button" variant="outline">
                Keep sighting
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CorrectionFrame>
  );
}

function CorrectionFrame({
  children,
  heading,
  headingRef,
}: Readonly<{
  children: ReactNode;
  heading: string;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}>): ReactNode {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
      <header className="mb-8">
        <p className="font-medium text-muted-foreground text-sm">
          Chicken Tracking
        </p>
        <h1
          className="mt-2 font-semibold text-4xl tracking-tight"
          ref={headingRef}
          tabIndex={-1}
        >
          {heading}
        </h1>
      </header>
      {children}
    </div>
  );
}

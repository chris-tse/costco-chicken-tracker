import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect } from "react";

type PrototypeSwitcherProps = Readonly<{
  currentLabel: string;
  onNext: () => void;
  onPrevious: () => void;
}>;

export function PrototypeSwitcher({
  currentLabel,
  onNext,
  onPrevious,
}: PrototypeSwitcherProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing =
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable);

      if (isEditing) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onNext, onPrevious]);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full bg-foreground p-1.5 text-background shadow-2xl ring-1 ring-background/20">
        <button
          aria-label="Previous prototype variant"
          className="grid size-10 place-items-center rounded-full transition-colors hover:bg-background/15 focus-visible:outline-2 focus-visible:outline-background"
          onClick={onPrevious}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>
        <span
          aria-live="polite"
          className="min-w-56 px-3 text-center font-medium text-sm"
        >
          {currentLabel}
        </span>
        <button
          aria-label="Next prototype variant"
          className="grid size-10 place-items-center rounded-full transition-colors hover:bg-background/15 focus-visible:outline-2 focus-visible:outline-background"
          onClick={onNext}
          type="button"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}

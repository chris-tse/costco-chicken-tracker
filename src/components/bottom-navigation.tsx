import type { ReactNode } from "react";

type Destination = "capture" | "plan";

export function BottomNavigation({
  currentDestination,
}: Readonly<{
  currentDestination: Destination;
}>): ReactNode {
  return (
    <nav
      aria-label="Primary navigation"
      className="sticky bottom-0 mt-8 grid grid-cols-2 gap-2 border-t bg-background py-3"
    >
      <a
        aria-current={currentDestination === "capture" ? "page" : undefined}
        className="flex h-12 items-center justify-center rounded-md font-medium text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
        href="/"
      >
        Capture
      </a>
      <a
        aria-current={currentDestination === "plan" ? "page" : undefined}
        className="flex h-12 items-center justify-center rounded-md font-medium text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
        href="/plan"
      >
        Plan
      </a>
    </nav>
  );
}

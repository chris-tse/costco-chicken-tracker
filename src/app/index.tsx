import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

export function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-lg flex-col items-center gap-6 text-center">
        <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
          Chicken Tracking
        </h1>
        <p className="max-w-md text-lg text-muted-foreground leading-8">
          A private tool for recording rotisserie chicken label times and
          learning from your sightings.
        </p>
      </div>
    </div>
  );
}

import { createFileRoute, redirect } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dev")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: "/" });
    }
  },
  component: DevPage,
});

function DevPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-16">
      <h1 className="font-semibold text-3xl tracking-tight">
        Component Viewer
      </h1>
      <p className="text-muted-foreground text-sm">
        Use the "Swap Theme" button (bottom-right) to toggle between A (Chicken
        Bag) and B (Price Tag).
      </p>

      <section className="space-y-4">
        <h2 className="font-medium text-xl">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-xl">Colors</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch className="bg-primary text-primary-foreground" label="Primary" />
          <Swatch className="bg-secondary text-secondary-foreground" label="Secondary" />
          <Swatch className="bg-muted text-muted-foreground" label="Muted" />
          <Swatch className="bg-accent text-accent-foreground" label="Accent" />
          <Swatch className="bg-destructive text-white" label="Destructive" />
          <Swatch className="bg-success text-success-foreground" label="Success" />
          <Swatch className="bg-warning text-warning-foreground" label="Warning" />
          <Swatch className="bg-error text-error-foreground" label="Error" />
          <Swatch className="bg-brand-red text-white" label="Brand Red" />
          <Swatch className="bg-brand-blue text-white" label="Brand Blue" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-xl">Heatmap Scale</h2>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-12 flex-1 rounded-md"
              style={{ backgroundColor: `var(--heatmap-${n})` }}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-sm">
          Low probability → High probability
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-xl">Typography</h2>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Heading (theme font)</h3>
          <p className="text-foreground">Body text — foreground</p>
          <p className="text-muted-foreground">Body text — muted foreground</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-xl">Surfaces</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-4 text-card-foreground">
            Card
          </div>
          <div className="rounded-lg border bg-popover p-4 text-popover-foreground">
            Popover
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-xl">Sample CTA</h2>
        <div className="flex flex-col items-center gap-4 rounded-lg border p-8">
          <h3 className="text-2xl font-bold">Fresh Chicken Alert</h3>
          <p className="text-muted-foreground">
            New batch spotted at Costco #123 — 5 minutes ago
          </p>
          <Button size="lg">Report a Sighting</Button>
        </div>
      </section>
    </div>
  );
}

function Swatch(props: Readonly<{ className: string; label: string }>) {
  return (
    <div
      className={`rounded-md px-3 py-2 text-center text-sm font-medium ${props.className}`}
    >
      {props.label}
    </div>
  );
}

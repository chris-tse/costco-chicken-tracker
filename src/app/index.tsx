import { Link, createFileRoute, redirect } from "@tanstack/react-router";

import { getSession } from "@/lib/auth.server";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/app" });
    }
  },
  component: Home,
});

function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-lg flex-col items-center gap-6 text-center">
        <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
          Costco Chicken Tracker
        </h1>
        <p className="max-w-md text-lg text-muted-foreground leading-8">
          Crowdsource rotisserie chicken batch timestamps and discover the best
          times to grab a fresh bird with probability heatmaps.
        </p>
        <Button asChild size="lg">
          <Link to="/sign-up">Sign Up</Link>
        </Button>
      </div>
    </div>
  );
}

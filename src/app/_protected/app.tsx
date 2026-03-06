import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/app")({
  component: App,
});

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="font-semibold text-4xl tracking-tight">app</h1>
    </div>
  );
}

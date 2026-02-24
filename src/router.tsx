import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-bold text-4xl">Page Not Found</h1>
      <p className="text-lg">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <a
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        href="/"
      >
        Go Home
      </a>
    </div>
  );
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
  });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

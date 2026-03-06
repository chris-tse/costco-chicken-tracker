import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

import { ThemeToggle } from "@/components/dev/ThemeToggle";

import appCss from "./globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Costco Chicken Tracker" },
      {
        name: "description",
        content:
          "Crowdsource Costco rotisserie chicken batch timestamps and view probability heatmaps for fresh chicken availability.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <header>
          <nav>{/* TODO: populate navigation links */}</nav>
        </header>
        <main>
          <Outlet />
        </main>
        <ThemeToggle />
        <Scripts />
      </body>
    </html>
  );
}

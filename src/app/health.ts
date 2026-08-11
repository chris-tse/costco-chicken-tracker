import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseReachable } from "@/lib/database-health";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => {
        const databaseReachable = await isDatabaseReachable();

        if (!databaseReachable) {
          return Response.json({ status: "unavailable" }, { status: 503 });
        }

        return Response.json({ status: "ok" });
      },
    },
  },
});

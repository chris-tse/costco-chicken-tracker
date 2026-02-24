import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "@/lib/auth.server";

export const Route = createFileRoute("/_protected/_admin")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session?.user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});

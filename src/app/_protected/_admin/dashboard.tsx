import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/_admin/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return <div>Admin Dashboard</div>;
}

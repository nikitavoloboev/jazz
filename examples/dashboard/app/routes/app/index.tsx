import { createFileRoute } from "@tanstack/react-router";

function RouteComponent() {
  return (
    <>
      <div>todos</div>
    </>
  );
}

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

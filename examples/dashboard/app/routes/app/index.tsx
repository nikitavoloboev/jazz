import { createFileRoute } from "@tanstack/react-router";

function RouteComponent() {
  return (
    <>
      <div>jazz dash</div>
    </>
  );
}

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

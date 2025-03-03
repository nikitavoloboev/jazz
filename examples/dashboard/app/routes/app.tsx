import { Outlet, createFileRoute } from "@tanstack/react-router";
import { JazzProvider } from "jazz-react";

function LayoutComponent() {
  return (
    <>
      <JazzProvider
        sync={{
          // TODO: change this
          peer: "wss://cloud.jazz.tools/?key=nikiv-dashboard@nikiv.dev",
        }}
      >
        <Outlet />
      </JazzProvider>
    </>
  );
}

export const Route = createFileRoute("/app")({
  component: LayoutComponent,
});

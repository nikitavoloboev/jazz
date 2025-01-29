import { ClerkProvider, useClerk } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { JazzProviderWithClerk } from "jazz-react-auth-clerk";

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk publishable key to the .env.local file");
}

function JazzProvider({ children }: { children: React.ReactNode }) {
  const clerk = useClerk();

  return (
    <JazzProviderWithClerk
      clerk={clerk}
      sync={{
        peer: "wss://cloud.jazz.tools/?key=minimal-auth-clerk-example@garden.co",
        when: "signedUp", // This makes the app work in local mode when the user is not authenticated
      }}
    >
      {children}
    </JazzProviderWithClerk>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <JazzProvider>
        <App />
      </JazzProvider>
    </ClerkProvider>
  </StrictMode>,
);

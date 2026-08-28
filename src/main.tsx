import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!convexUrl) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <div className="setup-notice">
        <h1>InboxHabit</h1>
        <p>
          <code>VITE_CONVEX_URL</code> is not set. Run <code>npx convex dev</code>{" "}
          once to link a Convex deployment (it writes this into{" "}
          <code>.env.local</code>), then restart the dev server.
        </p>
      </div>
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </StrictMode>,
  );
}

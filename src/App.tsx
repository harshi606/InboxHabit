import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { SignIn } from "./components/SignIn";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>InboxHabit</h1>
        <p className="tagline">
          Build habits by email. Log progress by sending a message — your streak
          updates live, and a daily digest nudges you on what's left.
        </p>
      </header>

      <AuthLoading>
        <p className="loading">Loading…</p>
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <Dashboard />
      </Authenticated>
    </div>
  );
}

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { getOrCreateUserId } from "./lib/userId";
import { EmailSetup } from "./components/EmailSetup";
import { NewHabitForm } from "./components/NewHabitForm";
import { HabitCard } from "./components/HabitCard";

export default function App() {
  const userId = useMemo(() => getOrCreateUserId(), []);
  const habits = useQuery(api.habits.listForUser, { userId });

  return (
    <div className="app">
      <header className="app-header">
        <h1>InboxHabit</h1>
        <p className="tagline">
          Build habits by email. Log progress by sending a message — your streak
          updates live, and a daily digest nudges you on what's left.
        </p>
      </header>

      <EmailSetup userId={userId} />
      <NewHabitForm userId={userId} />

      {habits && habits.length > 0 && (
        <p className="section-label">Your habits</p>
      )}

      <main className="habit-list">
        {habits === undefined && <p className="loading">Loading your habits…</p>}
        {habits?.length === 0 && (
          <p className="empty-state">
            No habits yet — add your first one above.
          </p>
        )}
        {habits?.map((habit) => (
          <HabitCard key={habit._id} habit={habit} userId={userId} />
        ))}
      </main>
    </div>
  );
}

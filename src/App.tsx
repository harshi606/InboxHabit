import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { getOrCreateUserId } from "./lib/userId";
import { NewHabitForm } from "./components/NewHabitForm";
import { HabitCard } from "./components/HabitCard";

export default function App() {
  const userId = useMemo(getOrCreateUserId, []);
  const habits = useQuery(api.habits.listForUser, { userId });

  return (
    <div className="app">
      <header className="app-header">
        <h1>InboxHabit</h1>
        <p className="tagline">
          Build habits by email. Each habit gets its own AI inbox — log progress
          by sending a message, watch your streak update live.
        </p>
      </header>

      <NewHabitForm userId={userId} />

      <main className="habit-list">
        {habits === undefined && <p className="loading">Loading habits…</p>}
        {habits?.length === 0 && (
          <p className="empty-state">No habits yet — add one above to get started.</p>
        )}
        {habits?.map((habit) => (
          <HabitCard key={habit._id} habit={habit} userId={userId} />
        ))}
      </main>
    </div>
  );
}

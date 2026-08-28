import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

function timeAgo(ms: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export function HabitCard({ habit }: { habit: Doc<"habits">; userId: string }) {
  const entries = useQuery(api.entries.listForHabit, { habitId: habit._id });
  const logManual = useMutation(api.entries.logManual);
  const [logging, setLogging] = useState(false);
  const [showEntries, setShowEntries] = useState(false);

  const todayUtc = new Date().toISOString().slice(0, 10);
  const doneToday = habit.lastCompletedDate === todayUtc;

  async function handleLog() {
    if (logging) return;
    setLogging(true);
    try {
      await logManual({ habitId: habit._id, userId: habit.userId });
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="habit-card">
      <div className="habit-card-header">
        <div>
          <h3>{habit.name}</h3>
          <p className="habit-description">{habit.description}</p>
        </div>
        <div className="streaks">
          <div className="streak">
            <span className="streak-number">{habit.currentStreak}</span>
            <span className="streak-label">day streak</span>
          </div>
          <div className="streak streak-secondary">
            <span className="streak-number">{habit.longestStreak}</span>
            <span className="streak-label">best</span>
          </div>
        </div>
      </div>

      {habit.tips && (
        <details className="habit-tips">
          <summary>Tips</summary>
          <pre>{habit.tips}</pre>
        </details>
      )}

      <div className="habit-actions">
        <button onClick={handleLog} disabled={logging || doneToday} className="log-button">
          {doneToday ? "Done today ✓" : logging ? "Logging…" : "Log today"}
        </button>
        {habit.inboxAddress ? (
          <a className="inbox-address" href={`mailto:${habit.inboxAddress}`}>
            ✉ {habit.inboxAddress}
          </a>
        ) : (
          <span className="inbox-address inbox-address-missing">
            Email logging unavailable (inbox creation failed)
          </span>
        )}
      </div>

      <button className="toggle-entries" onClick={() => setShowEntries((s) => !s)}>
        {showEntries ? "Hide" : "Show"} activity ({entries?.length ?? 0})
      </button>

      {showEntries && (
        <ul className="entry-feed">
          {entries === undefined && <li className="entry-empty">Loading…</li>}
          {entries?.length === 0 && <li className="entry-empty">No entries yet.</li>}
          {entries?.map((entry) => (
            <li key={entry._id} className="entry-item">
              <span className="entry-source" title={entry.source}>
                {entry.source === "email" ? "✉" : "✓"}
              </span>
              <span className="entry-note">{entry.note}</span>
              {entry.mood && <span className="entry-mood">{entry.mood}</span>}
              <span className="entry-time">{timeAgo(entry.completedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

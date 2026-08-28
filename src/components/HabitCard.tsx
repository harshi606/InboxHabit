import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { habitColor } from "../lib/palette";

function timeAgo(ms: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

/** Split the stored "- tip\n- tip" string into individual lines. */
function tipLines(tips: string): string[] {
  return tips
    .split("\n")
    .map((t) => t.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

export function HabitCard({
  habit,
  index = 0,
}: {
  habit: Doc<"habits">;
  userId: string;
  index?: number;
}) {
  const entries = useQuery(api.entries.listForHabit, { habitId: habit._id });
  const logManual = useMutation(api.entries.logManual);
  const [logging, setLogging] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const todayUtc = new Date().toISOString().slice(0, 10);
  const doneToday = habit.lastCompletedDate === todayUtc;
  const streak = habit.currentStreak;
  const heat = streak === 0 ? "cold" : streak < 3 ? "warm" : streak < 7 ? "hot" : "blazing";
  const tips = tipLines(habit.tips);
  const color = habitColor(habit._id);

  // Celebrate whenever the streak grows (manual click or an emailed log).
  const prevStreak = useRef(streak);
  useEffect(() => {
    if (streak > prevStreak.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 1100);
      return () => clearTimeout(t);
    }
    prevStreak.current = streak;
  }, [streak]);

  async function handleLog() {
    if (logging || doneToday) return;
    setLogging(true);
    try {
      await logManual({ habitId: habit._id, userId: habit.userId });
    } finally {
      setLogging(false);
    }
  }

  const style = {
    "--c1": color.from,
    "--c2": color.to,
    "--glow": color.glow,
    "--stagger": `${Math.min(index, 12) * 60}ms`,
  } as React.CSSProperties;

  return (
    <div
      className={`habit-card${doneToday ? " is-done" : ""}${celebrate ? " celebrate" : ""}`}
      style={style}
    >
      <span className="habit-stripe" />

      <div className="habit-card-header">
        <div className="habit-title">
          <h3>
            {doneToday && <span className="done-check">✓</span>}
            {habit.name}
          </h3>
          <p className="habit-description">{habit.description}</p>
        </div>
        <div
          className={`streak ${heat}`}
          title={`Best: ${habit.longestStreak} days`}
        >
          <span className="streak-flame">🔥</span>
          <span className="streak-number">{streak}</span>
          <span className="streak-unit">{streak === 1 ? "day" : "days"}</span>
        </div>
      </div>

      <div className="habit-meta">
        <span>
          Best <b>{habit.longestStreak}</b>
        </span>
        <span>
          Logged <b>{entries?.length ?? 0}</b>×
        </span>
      </div>

      {tips.length > 0 && (
        <details className="habit-tips">
          <summary>Tips</summary>
          <ul className="tips-list">
            {tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="habit-actions">
        <button
          onClick={handleLog}
          disabled={logging || doneToday}
          className={`log-button${doneToday ? " done" : ""}`}
        >
          {doneToday ? "Done today ✓" : logging ? "Logging…" : "Log today"}
          {celebrate && <span className="plus-one">+1</span>}
        </button>
        <span className="log-hint">or email “{habit.name}” to the inbox</span>
      </div>

      <button
        className="toggle-entries"
        onClick={() => setShowEntries((s) => !s)}
      >
        {showEntries ? "Hide activity" : `Show activity (${entries?.length ?? 0})`}
      </button>

      {showEntries && (
        <ul className="entry-feed">
          {entries === undefined && <li className="entry-empty">Loading…</li>}
          {entries?.length === 0 && (
            <li className="entry-empty">No entries yet.</li>
          )}
          {entries?.map((entry, i) => (
            <li
              key={entry._id}
              className="entry-item"
              style={{ "--stagger": `${i * 40}ms` } as React.CSSProperties}
            >
              <span
                className={`entry-source ${entry.source}`}
                title={
                  entry.source === "email" ? "Logged by email" : "Logged in app"
                }
              >
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

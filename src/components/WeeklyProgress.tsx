import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function weekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00Z");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Level 0–4 → cell opacity/intensity, capped at 4+. */
function level(count: number): number {
  return Math.min(count, 4);
}

export function WeeklyProgress() {
  const data = useQuery(api.entries.weeklyGrid, {});
  if (!data) return null;

  const weeks = data.weeks;
  const best = Math.max(1, ...weeks.map((w) => w.total));

  return (
    <div className="weekly card">
      <div className="weekly-head">
        <span className="section-label" style={{ margin: 0 }}>
          Last 8 weeks
        </span>
        <span className="weekly-legend">
          less
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className="wk-cell" data-level={l} />
          ))}
          more
        </span>
      </div>

      <div className="weekly-grid">
        <div className="weekly-col weekly-col-labels">
          <span />
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="wk-daylabel">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((w) => (
          <div className="weekly-col" key={w.weekStart} title={`${w.total} logged`}>
            <span className="wk-weeklabel">{weekLabel(w.weekStart)}</span>
            {w.days.map((count, i) => (
              <i
                key={i}
                className="wk-cell"
                data-level={level(count)}
                title={`${count} on ${weekLabel(w.weekStart)}`}
              />
            ))}
            <span
              className="wk-total"
              style={{ opacity: 0.35 + 0.65 * (w.total / best) }}
            >
              {w.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

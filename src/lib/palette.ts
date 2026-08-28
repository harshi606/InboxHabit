/**
 * A fixed set of vivid gradients. Each habit gets one deterministically from
 * its id, so its colour is stable across reloads and consistent everywhere it
 * appears.
 */
export interface HabitColor {
  from: string;
  to: string;
  /** rgba used for the hover glow / tint. */
  glow: string;
}

const PALETTE: HabitColor[] = [
  { from: "#8b5cf6", to: "#d946ef", glow: "139, 92, 246" },
  { from: "#3b82f6", to: "#06b6d4", glow: "59, 130, 246" },
  { from: "#10b981", to: "#84cc16", glow: "16, 185, 129" },
  { from: "#f59e0b", to: "#f97316", glow: "245, 158, 11" },
  { from: "#f43f5e", to: "#ec4899", glow: "244, 63, 94" },
  { from: "#6366f1", to: "#a855f7", glow: "99, 102, 241" },
  { from: "#14b8a6", to: "#22d3ee", glow: "20, 184, 166" },
  { from: "#ef4444", to: "#f59e0b", glow: "239, 68, 68" },
];

export function habitColor(id: string): HabitColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

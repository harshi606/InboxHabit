/** UTC "YYYY-MM-DD" for a timestamp, used to key daily streaks. */
export function utcDateString(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

/** True if `earlier` is exactly one UTC calendar day before `later`. */
export function isConsecutiveDay(earlier: string, later: string): boolean {
  const earlierMs = Date.parse(`${earlier}T00:00:00.000Z`);
  const laterMs = Date.parse(`${later}T00:00:00.000Z`);
  const oneDayMs = 24 * 60 * 60 * 1000;
  return laterMs - earlierMs === oneDayMs;
}

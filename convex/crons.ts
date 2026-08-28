import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily reminder digest. 13:00 UTC — adjust hourUTC/minuteUTC for your users
// (e.g. 2 for ~morning in Asia, 14 for ~morning in the Americas).
crons.daily(
  "daily habit digest",
  { hourUTC: 13, minuteUTC: 0 },
  internal.digests.sendDaily,
);

export default crons;

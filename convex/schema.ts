import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  habits: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    tips: v.string(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletedDate: v.optional(v.string()), // "YYYY-MM-DD" in UTC
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  entries: defineTable({
    habitId: v.id("habits"),
    userId: v.id("users"),
    completedAt: v.number(),
    note: v.string(),
    mood: v.optional(v.string()),
    source: v.union(v.literal("manual"), v.literal("email")),
    emailSubject: v.optional(v.string()),
  })
    .index("by_habit", ["habitId"])
    .index("by_user", ["userId"]),

  // Inbound emails already handled, so polling the shared inbox is idempotent.
  processedEmails: defineTable({
    messageId: v.string(),
  }).index("by_message", ["messageId"]),
});

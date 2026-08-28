import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  habits: defineTable({
    userId: v.string(),
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
    userId: v.string(),
    completedAt: v.number(),
    note: v.string(),
    mood: v.optional(v.string()),
    source: v.union(v.literal("manual"), v.literal("email")),
    emailSubject: v.optional(v.string()),
  })
    .index("by_habit", ["habitId"])
    .index("by_user", ["userId"]),

  // One row per anonymous browser user. Their email address is how an inbound
  // message to the shared habit inbox is tied back to their habits.
  userSettings: defineTable({
    userId: v.string(),
    email: v.string(), // stored lowercased
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"]),

  // Inbound emails already handled, so polling the shared inbox is idempotent.
  processedEmails: defineTable({
    messageId: v.string(),
  }).index("by_message", ["messageId"]),
});

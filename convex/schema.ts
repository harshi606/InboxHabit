import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  habits: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    tips: v.string(),
    inboxAddress: v.optional(v.string()),
    inboxId: v.optional(v.string()),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletedDate: v.optional(v.string()), // "YYYY-MM-DD" in UTC
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_inboxAddress", ["inboxAddress"]),

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
});

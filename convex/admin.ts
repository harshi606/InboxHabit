import { internalMutation } from "./_generated/server";

/**
 * Delete every row in the app's tables. Internal-only; run with
 * `npx convex run admin:wipe` to reset a dev deployment to a clean slate.
 */
export const wipe = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["entries", "habits", "processedEmails"] as const) {
      for (const doc of await ctx.db.query(table).collect()) {
        await ctx.db.delete(doc._id);
      }
    }
  },
});

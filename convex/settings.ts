import { query } from "./_generated/server";

/** The shared inbox address that all habit-logging emails are sent to. */
export const inboxAddress = query({
  args: {},
  handler: async () => {
    return process.env.AGENTMAIL_INBOX_ADDRESS ?? null;
  },
});

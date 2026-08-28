const STORAGE_KEY = "inboxhabit:userId";

/**
 * InboxHabit has no login for this hackathon build (recorded as `Auth: none`
 * in hackathon.md). Each browser gets a random id, stored locally, that
 * scopes its habits.
 */
export function getOrCreateUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

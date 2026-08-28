import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Lets the user register the email address they'll send habit updates from,
 * and shows the shared inbox address to email. Without a registered address,
 * inbound emails can't be tied back to this user's habits.
 */
export function EmailSetup({ userId }: { userId: string }) {
  const settings = useQuery(api.userSettings.get, { userId });
  const inboxAddress = useQuery(api.settings.inboxAddress, {});
  const setEmail = useMutation(api.userSettings.setEmail);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const savedEmail = settings?.email ?? null;
  const showForm = editing || (settings !== undefined && savedEmail === null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const email = value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || saving) return;
    setSaving(true);
    try {
      await setEmail({ userId, email });
      setEditing(false);
      setValue("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="email-setup">
      <div className="email-setup-head">
        <span className={`dot${savedEmail ? " on" : ""}`} />
        Log by email
      </div>

      <div className="email-setup-line">
        <span>Send updates to</span>
        <code>{inboxAddress ?? "…"}</code>
      </div>

      {showForm ? (
        <form className="email-setup-form" onSubmit={handleSave}>
          <input
            type="email"
            placeholder="the address you'll send from"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {savedEmail !== null && (
            <button
              type="button"
              className="link-button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          )}
        </form>
      ) : (
        savedEmail !== null && (
          <div className="email-setup-line">
            <span>
              from <strong>{savedEmail}</strong>
            </span>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setValue(savedEmail);
                setEditing(true);
              }}
            >
              change
            </button>
          </div>
        )
      )}
    </div>
  );
}

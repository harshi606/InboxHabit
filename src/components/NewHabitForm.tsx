import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function NewHabitForm() {
  const createHabit = useAction(api.habits.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    setWarnings([]);
    try {
      const result = await createHabit({
        name: name.trim(),
        description: description.trim() || `Complete "${name.trim()}" once per day.`,
        sourceUrl: sourceUrl.trim() || undefined,
      });
      setWarnings(result.warnings);
      setName("");
      setDescription("");
      setSourceUrl("");
      setExpanded(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="new-habit-form" onSubmit={handleSubmit}>
      <div className="new-habit-row">
        <input
          type="text"
          placeholder="New habit, e.g. Read 10 pages"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setExpanded(true)}
          maxLength={80}
        />
        <button type="submit" disabled={!name.trim() || busy}>
          {busy ? "Creating…" : "Add habit"}
        </button>
      </div>

      {expanded && (
        <div className="new-habit-details">
          <label>
            What counts as "done"?
            <input
              type="text"
              placeholder="e.g. 10+ pages of any book"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </label>
          <label>
            Inspiration link (optional — we'll crawl it into a few tips)
            <input
              type="url"
              placeholder="https://…"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </label>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {warnings.length > 0 && (
        <ul className="form-warnings">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </form>
  );
}

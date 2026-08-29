import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { NewHabitForm } from "./NewHabitForm";
import { HabitCard } from "./HabitCard";
import { WeeklyProgress } from "./WeeklyProgress";

export function Dashboard() {
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me);
  const inboxAddress = useQuery(api.settings.inboxAddress, {});
  const habits = useQuery(api.habits.list);

  return (
    <>
      <div className="account-bar">
        <span>
          {me?.email ? (
            <>
              Signed in as <strong>{me.email}</strong>
            </>
          ) : (
            "…"
          )}
        </span>
        <button className="link-button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      <div className="email-setup">
        <div className="email-setup-head">
          <span className="dot on" />
          Log by email
        </div>
        <div className="email-setup-line">
          <span>Email</span>
          <code>{inboxAddress ?? "…"}</code>
          <span>
            from <strong>{me?.email ?? "your account"}</strong>, mention the
            habit, and your streak updates within a minute.
          </span>
        </div>
      </div>

      <WeeklyProgress />

      <NewHabitForm />

      {habits && habits.length > 0 && (
        <p className="section-label">Your habits</p>
      )}

      <main className="habit-list">
        {habits === undefined && <p className="loading">Loading your habits…</p>}
        {habits?.length === 0 && (
          <p className="empty-state">No habits yet — add your first one above.</p>
        )}
        {habits?.map((habit, i) => (
          <HabitCard key={habit._id} habit={habit} index={i} />
        ))}
      </main>
    </>
  );
}

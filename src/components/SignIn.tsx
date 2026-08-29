import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow,
      });
    } catch {
      setError(
        flow === "signIn"
          ? "Wrong email or password."
          : "Couldn't create the account — use a password of at least 8 characters.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="signin-card">
      <h2>{flow === "signIn" ? "Welcome back" : "Create your account"}</h2>
      <p className="signin-sub">
        Your email is also the address you'll log habits from.
      </p>

      <form onSubmit={handleSubmit} className="signin-form">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          required
        />
        <button type="submit" disabled={busy}>
          {busy
            ? "…"
            : flow === "signIn"
              ? "Sign in"
              : "Sign up"}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      <button
        type="button"
        className="link-button signin-switch"
        onClick={() => {
          setFlow((f) => (f === "signIn" ? "signUp" : "signIn"));
          setError(null);
        }}
      >
        {flow === "signIn"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

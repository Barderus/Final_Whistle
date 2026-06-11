import { useState } from "react";

export default function AuthPanel({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (mode === "sign-up") {
        const result = await onSignUp(email, password, displayName);
        setMessage({
          type: "success",
          text: result.session
            ? "Account created."
            : "Check your email to confirm your account.",
        });
      } else {
        await onSignIn(email, password);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Authentication failed.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage(null);
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-heading">
      <div>
        <p className="eyebrow">Participant access</p>
        <h2 id="auth-heading">
          {mode === "sign-in" ? "Sign in to predict" : "Create your account"}
        </h2>
        <p>
          Predictions are private until each match starts. Your email is never
          shown to other participants.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "sign-up" && (
          <label>
            Display name
            <input
              autoComplete="nickname"
              maxLength="30"
              minLength="2"
              onChange={(event) => setDisplayName(event.target.value)}
              required
              type="text"
              value={displayName}
            />
          </label>
        )}

        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label>
          Password
          <input
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            minLength="6"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        <button disabled={submitting} type="submit">
          {submitting
            ? "Please wait..."
            : mode === "sign-in"
              ? "Sign in"
              : "Create account"}
        </button>

        <button
          className="text-button"
          onClick={() =>
            switchMode(mode === "sign-in" ? "sign-up" : "sign-in")
          }
          type="button"
        >
          {mode === "sign-in"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>

        {message && (
          <p
            className={`form-message ${
              message.type === "error" ? "is-error" : ""
            }`}
            role={message.type === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}

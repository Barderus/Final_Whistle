import { useState } from "react";

export default function AccountPanel({
  profile,
  email,
  onDisplayNameUpdate,
  onSignOut,
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await onDisplayNameUpdate(displayName);
      setMessage({ type: "success", text: "Display name updated." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Could not update your display name.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setMessage(null);

    try {
      await onSignOut();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Could not sign out.",
      });
      setSigningOut(false);
    }
  }

  return (
    <section className="account-panel" aria-labelledby="account-heading">
      <div>
        <p className="eyebrow">Signed in</p>
        <h2 id="account-heading">{profile?.display_name || "Your account"}</h2>
        <p>{email}</p>
      </div>

      <form className="account-form" onSubmit={handleSubmit}>
        <label>
          Display name
          <input
            maxLength="30"
            minLength="2"
            onChange={(event) => setDisplayName(event.target.value)}
            required
            type="text"
            value={displayName}
          />
        </label>
        <button disabled={saving} type="submit">
          {saving ? "Saving..." : "Update name"}
        </button>
        <button
          className="secondary-button"
          disabled={signingOut}
          onClick={handleSignOut}
          type="button"
        >
          {signingOut ? "Signing out..." : "Sign out"}
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

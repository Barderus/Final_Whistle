import { useMemo, useState } from "react";
import {
  formatMatchDate,
  formatMatchTime,
  isKnockoutStage,
  isPlaceholderTeam,
} from "../utils/matches";

const statusOptions = [
  { label: "Scheduled", value: "scheduled" },
  { label: "In progress", value: "in_progress" },
  { label: "Complete", value: "complete" },
];

function getDraftFromMatch(match) {
  return {
    status: match.status,
    team1Score: match.team1_score ?? "",
    team2Score: match.team2_score ?? "",
    winnerTeam: match.winner_team ?? "",
  };
}

function MatchResultEditor({ match, onSaveResult }) {
  const [draft, setDraft] = useState(() => getDraftFromMatch(match));
  const [changeReason, setChangeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const isCorrection =
    match.status === "complete" &&
    (draft.status !== match.status ||
      String(draft.team1Score) !== String(match.team1_score ?? "") ||
      String(draft.team2Score) !== String(match.team2_score ?? "") ||
      String(draft.winnerTeam) !== String(match.winner_team ?? ""));
  const completedTie =
    draft.status === "complete" &&
    draft.team1Score !== "" &&
    draft.team2Score !== "" &&
    Number(draft.team1Score) === Number(draft.team2Score);
  const needsWinner = isKnockoutStage(match.stage) && completedTie;

  function updateField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setMessage(null);
  }

  function handleStatusChange(value) {
    const nextDraft = {
      ...draft,
      status: value,
    };

    if (value === "scheduled") {
      nextDraft.team1Score = "";
      nextDraft.team2Score = "";
      nextDraft.winnerTeam = "";
    }

    setDraft(nextDraft);
    setMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updatedMatch = await onSaveResult(
        match.id,
        draft.status,
        draft.team1Score,
        draft.team2Score,
        needsWinner ? draft.winnerTeam : "",
        changeReason,
      );

      setDraft(getDraftFromMatch(updatedMatch));
      setChangeReason("");
      setMessage({ type: "success", text: "Match result saved." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          error.details ||
          error.hint ||
          "Could not save the result.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-summary">
        <p>
          Match {match.match_number} - {match.team1} vs {match.team2}
        </p>
        <p>
          {formatMatchDate(match.start_time)} at {formatMatchTime(match.start_time)}
        </p>
        <p>{match.location}</p>
      </div>

      <div className="admin-grid">
        <label className="admin-field">
          <span>Status</span>
          <select
            onChange={(event) => handleStatusChange(event.target.value)}
            value={draft.status}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>{match.team1} score</span>
          <input
            disabled={draft.status === "scheduled"}
            inputMode="numeric"
            min="0"
            max="99"
            onChange={(event) => updateField("team1Score", event.target.value)}
            pattern="[0-9]*"
            type="number"
            value={draft.team1Score}
          />
        </label>

        <label className="admin-field">
          <span>{match.team2} score</span>
          <input
            disabled={draft.status === "scheduled"}
            inputMode="numeric"
            min="0"
            max="99"
            onChange={(event) => updateField("team2Score", event.target.value)}
            pattern="[0-9]*"
            type="number"
            value={draft.team2Score}
          />
        </label>

        {needsWinner && (
          <label className="admin-field">
            <span>Advancing team</span>
            <select
              onChange={(event) => updateField("winnerTeam", event.target.value)}
              required
              value={draft.winnerTeam}
            >
              <option value="">Select winner</option>
              <option value={match.team1}>{match.team1}</option>
              <option value={match.team2}>{match.team2}</option>
            </select>
          </label>
        )}
      </div>

      {isCorrection && (
        <label className="admin-field">
          <span>Correction reason</span>
          <textarea
            maxLength="500"
            minLength="5"
            onChange={(event) => setChangeReason(event.target.value)}
            required
            rows="3"
            value={changeReason}
          />
        </label>
      )}

      <button disabled={saving} type="submit">
        {saving
          ? "Saving..."
          : isCorrection
            ? "Save correction"
            : "Save result"}
      </button>

      {message && (
        <p
          className={`form-message ${message.type === "error" ? "is-error" : ""}`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

export default function AdminResultsPanel({
  matches,
  signedIn,
  isAdmin,
  status,
  onSaveResult,
}) {
  const editableMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          !isPlaceholderTeam(match.team1) && !isPlaceholderTeam(match.team2),
      ),
    [matches],
  );
  const [selectedMatchId, setSelectedMatchId] = useState("");

  const selectedMatch =
    editableMatches.find((match) => match.id === selectedMatchId) ??
    editableMatches[0] ??
    null;

  let content;

  if (!signedIn) {
    content = (
      <div className="empty-state">
        <strong>Sign in to manage results</strong>
        <p>Admin controls are only available after authentication.</p>
      </div>
    );
  } else if (!isAdmin) {
    content = (
      <div className="empty-state">
        <strong>Admin access required</strong>
        <p>
          This account cannot edit match results. Add the email to the
          `admin_emails` allowlist in Supabase.
        </p>
      </div>
    );
  } else if (status === "error") {
    content = (
      <div className="empty-state" role="alert">
        <strong>Could not load admin tools</strong>
        <p>Refresh the page and try again.</p>
      </div>
    );
  } else if (status === "loading") {
    content = <div className="empty-state">Loading admin tools...</div>;
  } else if (editableMatches.length === 0) {
    content = (
      <div className="empty-state">
        <strong>No editable matches</strong>
        <p>All fixtures still use placeholder teams.</p>
      </div>
    );
  } else {
    content = (
      <div className="admin-form-stack">
        <label className="admin-field admin-match-select">
          <span>Match</span>
          <select
            onChange={(event) => setSelectedMatchId(event.target.value)}
            value={selectedMatch?.id ?? ""}
          >
            {editableMatches.map((match) => (
              <option key={match.id} value={match.id}>
                Match {match.match_number} - {match.team1} vs {match.team2}
              </option>
            ))}
          </select>
        </label>

        {selectedMatch && (
          <MatchResultEditor
            key={selectedMatch.id}
            match={selectedMatch}
            onSaveResult={onSaveResult}
          />
        )}
      </div>
    );
  }

  return (
    <section className="content-section" aria-labelledby="admin-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin tools</p>
          <h2 id="admin-heading">Match results</h2>
        </div>
      </div>

      <p className="section-intro">
        Update completed scores here. The leaderboard updates from matches
        marked complete.
      </p>
      {content}
    </section>
  );
}

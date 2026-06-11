import { getPredictionOutcome } from "../utils/matches";

export default function PredictionForm({
  match,
  prediction,
  onPredictionChange,
  onSave,
  saving,
  message,
}) {
  const team1Score = prediction?.team1Score ?? "";
  const team2Score = prediction?.team2Score ?? "";
  const outcome = getPredictionOutcome(team1Score, team2Score, match);
  const hasCompleteScore = team1Score !== "" && team2Score !== "";

  function updateScore(team, value) {
    if (value !== "" && (!/^\d+$/.test(value) || Number(value) > 99)) {
      return;
    }

    onPredictionChange(match.id, {
      team1Score,
      team2Score,
      [team]: value,
    });
  }

  return (
    <div className="prediction-form">
      <div className="score-inputs">
        <label>
          <span>{match.team1} score</span>
          <input
            aria-label={`${match.team1} predicted score`}
            inputMode="numeric"
            min="0"
            max="99"
            onChange={(event) =>
              updateScore("team1Score", event.target.value)
            }
            pattern="[0-9]*"
            type="number"
            value={team1Score}
          />
        </label>

        <span className="score-divider" aria-hidden="true">
          -
        </span>

        <label>
          <span>{match.team2} score</span>
          <input
            aria-label={`${match.team2} predicted score`}
            inputMode="numeric"
            min="0"
            max="99"
            onChange={(event) =>
              updateScore("team2Score", event.target.value)
            }
            pattern="[0-9]*"
            type="number"
            value={team2Score}
          />
        </label>
      </div>

      <p
        className={`prediction-outcome ${
          outcome === "Enter both scores" ? "is-empty" : ""
        }`}
        aria-live="polite"
      >
        {outcome}
      </p>

      <button
        className="save-prediction-button"
        disabled={!hasCompleteScore || saving}
        onClick={() => onSave(match.id)}
        type="button"
      >
        {saving ? "Saving..." : "Save prediction"}
      </button>

      {message && (
        <p
          className={`prediction-message ${
            message.type === "error" ? "is-error" : ""
          }`}
          aria-live="polite"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

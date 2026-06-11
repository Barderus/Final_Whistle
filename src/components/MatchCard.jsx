import {
  formatMatchDate,
  formatMatchTime,
  isMatchLocked,
  isMatchUnlocked,
} from "../utils/matches";
import PredictionForm from "./PredictionForm";

export default function MatchCard({
  match,
  prediction,
  onPredictionChange,
  onSavePrediction,
  predictionMessage,
  saving = false,
  currentTime,
  signedIn,
  readOnly = false,
}) {
  const locked = isMatchLocked(match.start_time, currentTime);
  const unlocked = isMatchUnlocked(match);
  const statusLabel = !signedIn
    ? "Sign in"
    : locked
    ? "Locked"
    : unlocked
      ? "Open"
      : "Waiting on teams";
  const disabled = !unlocked || !signedIn;

  return (
    <article
      aria-disabled={disabled}
      className={`match-card ${disabled ? "is-disabled" : ""}`}
    >
      <div className="match-card-header">
        <div>
          <span className="match-number">Match {match.match_number}</span>
          <span className="stage-pill">{match.stage}</span>
        </div>
        <span
          className={`lock-status ${
            locked
              ? "is-locked"
              : disabled
                ? "is-unavailable"
                : ""
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="match-meta">
        <p>
          <span>{formatMatchDate(match.start_time)}</span>
          <span>{formatMatchTime(match.start_time)}</span>
        </p>
        <p>{match.location}</p>
      </div>

      <div className="teams" aria-label={`${match.team1} versus ${match.team2}`}>
        <strong>{match.team1}</strong>
        <span>vs</span>
        <strong>{match.team2}</strong>
      </div>

      {!signedIn ? (
        <div className="locked-prediction">
          <span>Sign in to submit and view predictions.</span>
        </div>
      ) : !unlocked ? (
        <div className="locked-prediction">
          <span>Predictions open when both teams are confirmed.</span>
        </div>
      ) : locked || readOnly ? (
        <div className="locked-prediction">
          {prediction?.team1Score !== "" &&
          prediction?.team1Score !== undefined &&
          prediction?.team2Score !== "" &&
          prediction?.team2Score !== undefined ? (
            <>
              <span>Your prediction</span>
              <strong>
                {prediction.team1Score} - {prediction.team2Score}
              </strong>
            </>
          ) : (
            <span>
              {locked
                ? "Predictions are closed for this match."
                : "No prediction submitted yet."}
            </span>
          )}
        </div>
      ) : (
        <PredictionForm
          match={match}
          prediction={prediction}
          onPredictionChange={onPredictionChange}
          onSave={onSavePrediction}
          saving={saving}
          message={predictionMessage}
        />
      )}
    </article>
  );
}

import {
  formatMatchDate,
  formatMatchTime,
  isMatchLocked,
} from "../utils/matches";
import PredictionForm from "./PredictionForm";

export default function MatchCard({
  match,
  prediction,
  onPredictionChange,
  readOnly = false,
}) {
  const locked = isMatchLocked(match.start_time);

  return (
    <article className="match-card">
      <div className="match-card-header">
        <div>
          <span className="match-number">Match {match.match_number}</span>
          <span className="stage-pill">{match.stage}</span>
        </div>
        <span className={`lock-status ${locked ? "is-locked" : ""}`}>
          {locked ? "Locked" : "Open"}
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

      {locked || readOnly ? (
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
        />
      )}
    </article>
  );
}

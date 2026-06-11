import { formatMatchDate, formatMatchTime } from "../utils/matches";

export default function FriendsGuesses({
  matches,
  predictions,
  signedIn,
  status,
}) {
  const matchesById = Object.fromEntries(
    matches.map((match) => [match.id, match]),
  );
  const groupedPredictions = predictions.reduce((groups, prediction) => {
    const group = groups[prediction.matchId] ?? [];
    group.push(prediction);
    groups[prediction.matchId] = group;
    return groups;
  }, {});

  const matchesWithPredictions = Object.keys(groupedPredictions)
    .map((matchId) => matchesById[matchId])
    .filter(Boolean)
    .sort(
      (firstMatch, secondMatch) =>
        new Date(firstMatch.start_time) - new Date(secondMatch.start_time),
    );

  let content;

  if (!signedIn) {
    content = (
      <div className="empty-state">
        <strong>Sign in to view shared guesses</strong>
        <p>Predictions appear only after each related match starts.</p>
      </div>
    );
  } else if (status === "loading") {
    content = <div className="empty-state">Loading shared guesses...</div>;
  } else if (status === "error") {
    content = (
      <div className="empty-state" role="alert">
        <strong>Could not load shared guesses</strong>
        <p>Try opening this page again.</p>
      </div>
    );
  } else if (matchesWithPredictions.length === 0) {
    content = (
      <div className="empty-state">
        <strong>No guesses are available yet</strong>
        <p>They will appear after matches start and participants have picks.</p>
      </div>
    );
  } else {
    content = (
      <div className="friend-grid">
        {matchesWithPredictions.map((match) => (
          <article className="friend-card" key={match.id}>
            <div>
              <span className="stage-pill">{match.stage}</span>
              <h3>
                {match.team1} vs {match.team2}
              </h3>
              <p>
                {formatMatchDate(match.start_time)} at{" "}
                {formatMatchTime(match.start_time)}
              </p>
            </div>
            <ul>
              {groupedPredictions[match.id].map((prediction) => (
                <li key={`${match.id}-${prediction.displayName}`}>
                  <span>{prediction.displayName}</span>
                  <strong>
                    {prediction.team1Score} - {prediction.team2Score}
                  </strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    );
  }

  return (
    <section className="content-section" aria-labelledby="friends-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Shared picks</p>
          <h2 id="friends-heading">Friends' guesses</h2>
        </div>
      </div>

      <p className="section-intro">
        Other participants' guesses appear only after each match starts.
      </p>
      {content}
    </section>
  );
}

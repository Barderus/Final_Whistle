import {
  formatMatchDate,
  formatMatchTime,
  isMatchLocked,
} from "../utils/matches";

const friendPredictions = {
  "match-001": [
    { name: "Alex", score: "2 - 1" },
    { name: "Jordan", score: "1 - 1" },
  ],
  "match-002": [
    { name: "Alex", score: "0 - 2" },
    { name: "Sam", score: "1 - 2" },
  ],
};

export default function FriendsGuesses({ matches }) {
  const unlockedMatches = matches.filter(
    (match) => isMatchLocked(match.start_time) && friendPredictions[match.id],
  );

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

      {unlockedMatches.length === 0 ? (
        <div className="empty-state">
          <strong>No guesses are unlocked yet</strong>
          <p>Check back after the first match begins.</p>
        </div>
      ) : (
        <div className="friend-grid">
          {unlockedMatches.map((match) => (
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
                {friendPredictions[match.id].map((guess) => (
                  <li key={guess.name}>
                    <span>{guess.name}</span>
                    <strong>{guess.score}</strong>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

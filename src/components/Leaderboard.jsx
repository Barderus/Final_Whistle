export default function Leaderboard({ entries, signedIn, status }) {
  let content;

  if (!signedIn) {
    content = (
      <div className="empty-state">
        <strong>Sign in to view the leaderboard</strong>
        <p>Standings are available to authenticated participants.</p>
      </div>
    );
  } else if (status === "loading") {
    content = <div className="empty-state">Loading leaderboard...</div>;
  } else if (status === "error") {
    content = (
      <div className="empty-state" role="alert">
        <strong>Could not load the leaderboard</strong>
        <p>Try opening this page again.</p>
      </div>
    );
  } else if (entries.length === 0) {
    content = (
      <div className="empty-state">
        <strong>No standings are available yet</strong>
        <p>Points appear after completed matches have saved predictions.</p>
      </div>
    );
  } else {
    content = (
      <div className="leaderboard-table">
        <div className="leaderboard-row leaderboard-header" aria-hidden="true">
          <span>Rank</span>
          <span>Participant</span>
          <span>Exact</span>
          <span>Points</span>
        </div>
        {entries.map((participant, index) => (
          <div className="leaderboard-row" key={participant.user_id}>
            <span>{index + 1}</span>
            <strong>{participant.display_name}</strong>
            <span>{participant.exact_scores}</span>
            <strong>{participant.points}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="content-section" aria-labelledby="leaderboard-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pool standings</p>
          <h2 id="leaderboard-heading">Leaderboard</h2>
        </div>
      </div>

      <p className="section-intro">
        Exact scores earn 3 points. Correct outcomes earn 1 point.
      </p>
      {content}
    </section>
  );
}

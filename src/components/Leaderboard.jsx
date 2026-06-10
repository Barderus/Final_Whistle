const participants = [
  { name: "You", points: 0, exact: 0 },
  { name: "Alex", points: 0, exact: 0 },
  { name: "Jordan", points: 0, exact: 0 },
  { name: "Sam", points: 0, exact: 0 },
];

export default function Leaderboard() {
  return (
    <section className="content-section" aria-labelledby="leaderboard-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pool standings</p>
          <h2 id="leaderboard-heading">Leaderboard</h2>
        </div>
      </div>

      <p className="section-intro">
        Scoring begins after a match is complete. Exact scores earn 3 points and
        correct outcomes earn 1 point.
      </p>

      <div className="leaderboard-table">
        <div className="leaderboard-row leaderboard-header" aria-hidden="true">
          <span>Rank</span>
          <span>Participant</span>
          <span>Exact</span>
          <span>Points</span>
        </div>
        {participants.map((participant, index) => (
          <div className="leaderboard-row" key={participant.name}>
            <span>{index + 1}</span>
            <strong>{participant.name}</strong>
            <span>{participant.exact}</span>
            <strong>{participant.points}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import FriendsGuesses from "./components/FriendsGuesses";
import Leaderboard from "./components/Leaderboard";
import MatchCard from "./components/MatchCard";
import MatchFilters from "./components/MatchFilters";
import Navbar from "./components/Navbar";
import { parseMatchesCsv } from "./utils/csv";
import {
  isGroupStage,
  isKnockoutStage,
  isPlaceholderTeam,
} from "./utils/matches";

const emptyFilters = {
  stage: "",
  team: "",
  location: "",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Schedule");
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [filters, setFilters] = useState(emptyFilters);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadMatches() {
      try {
        const response = await fetch("/matches.csv");

        if (!response.ok) {
          throw new Error("The match schedule could not be loaded.");
        }

        const csvText = await response.text();
        const parsedMatches = parseMatchesCsv(csvText);

        setMatches(parsedMatches);
        setStatus(parsedMatches.length > 0 ? "ready" : "empty");
      } catch (error) {
        console.error("Failed to load mock matches:", error);
        setStatus("error");
      }
    }

    loadMatches();
  }, []);

  const stages = useMemo(
    () => [...new Set(matches.map((match) => match.stage))],
    [matches],
  );
  const teams = useMemo(
    () =>
      [
        ...new Set(
          matches
            .flatMap((match) => [match.team1, match.team2])
            .filter((team) => !isPlaceholderTeam(team)),
        ),
      ].sort(),
    [matches],
  );
  const locations = useMemo(
    () => [...new Set(matches.map((match) => match.location))].sort(),
    [matches],
  );

  const visibleMatches = useMemo(() => {
    let tabMatches = matches;

    if (activeTab === "Groups") {
      tabMatches = matches.filter((match) => isGroupStage(match.stage));
    } else if (activeTab === "Knockout") {
      tabMatches = matches.filter((match) => isKnockoutStage(match.stage));
    } else if (activeTab === "My Guesses") {
      tabMatches = matches.filter((match) => {
        const prediction = predictions[match.id];
        return (
          prediction?.team1Score !== "" &&
          prediction?.team1Score !== undefined &&
          prediction?.team2Score !== "" &&
          prediction?.team2Score !== undefined
        );
      });
    }

    return tabMatches.filter((match) => {
      const matchesStage = !filters.stage || match.stage === filters.stage;
      const matchesTeam =
        !filters.team ||
        match.team1 === filters.team ||
        match.team2 === filters.team;
      const matchesLocation =
        !filters.location || match.location === filters.location;

      return matchesStage && matchesTeam && matchesLocation;
    });
  }, [activeTab, filters, matches, predictions]);

  function updatePrediction(matchId, prediction) {
    setPredictions((currentPredictions) => ({
      ...currentPredictions,
      [matchId]: prediction,
    }));
  }

  function renderScheduleContent() {
    if (status === "loading") {
      return <div className="empty-state">Loading the match schedule...</div>;
    }

    if (status === "error") {
      return (
        <div className="empty-state" role="alert">
          <strong>Could not load the schedule</strong>
          <p>Refresh the page to try again.</p>
        </div>
      );
    }

    if (status === "empty" || visibleMatches.length === 0) {
      return (
        <div className="empty-state">
          <strong>No matches found</strong>
          <p>
            {activeTab === "My Guesses"
              ? "Add a score prediction from the schedule first."
              : "Try changing or clearing the filters."}
          </p>
        </div>
      );
    }

    return (
      <div className="match-grid">
        {visibleMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onPredictionChange={updatePrediction}
            prediction={predictions[match.id]}
            readOnly={activeTab === "My Guesses"}
          />
        ))}
      </div>
    );
  }

  const scheduleTab = !["Friends' Guesses", "Leaderboard"].includes(activeTab);

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-content">
          <div>
            <p className="hero-kicker">The road to the final starts here</p>
            <h1>FIFA World Cup 2026 Predictor</h1>
            <p className="hero-copy">
              Pick every score, compare with friends, and follow the standings
              through the tournament.
            </p>
          </div>
          <div className="hero-badge" aria-label="Tournament year 2026">
            <span>World Cup</span>
            <strong>2026</strong>
            <small>Prototype schedule</small>
          </div>
        </div>
      </header>

      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main>
        {scheduleTab && (
          <>
            <MatchFilters
              filters={filters}
              locations={locations}
              onChange={setFilters}
              onReset={() => setFilters(emptyFilters)}
              stages={stages}
              teams={teams}
            />

            <section className="content-section" aria-labelledby="matches-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    {activeTab === "Schedule" ? "All fixtures" : activeTab}
                  </p>
                  <h2 id="matches-heading">
                    {activeTab === "My Guesses"
                      ? "Your predictions"
                      : "Match schedule"}
                  </h2>
                </div>
                {status === "ready" && (
                  <div className="schedule-summary">
                    <span>Chicago time (CDT, UTC-5)</span>
                    <span className="match-count">
                      {visibleMatches.length}{" "}
                      {visibleMatches.length === 1 ? "match" : "matches"}
                    </span>
                  </div>
                )}
              </div>
              {renderScheduleContent()}
            </section>
          </>
        )}

        {activeTab === "Friends' Guesses" && (
          <FriendsGuesses matches={matches} />
        )}
        {activeTab === "Leaderboard" && <Leaderboard />}
      </main>

      <footer>
        <p>Final Whistle prototype using local sample data.</p>
      </footer>
    </div>
  );
}

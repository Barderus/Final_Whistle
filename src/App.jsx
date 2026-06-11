import { useEffect, useMemo, useState } from "react";
import AccountPanel from "./components/AccountPanel";
import AdminResultsPanel from "./components/AdminResultsPanel";
import AuthPanel from "./components/AuthPanel";
import FriendsGuesses from "./components/FriendsGuesses";
import Leaderboard from "./components/Leaderboard";
import MatchCard from "./components/MatchCard";
import MatchFilters from "./components/MatchFilters";
import Navbar from "./components/Navbar";
import { isSupabaseConfigured } from "./lib/supabase";
import { isAdmin, saveMatchResult } from "./services/admin";
import {
  getSession,
  listenForAuthChanges,
  signIn,
  signOut,
  signUp,
} from "./services/auth";
import { getLeaderboard } from "./services/leaderboard";
import { getMatches, getServerTime } from "./services/matches";
import {
  getMyPredictions,
  getSharedPredictions,
  savePrediction,
} from "./services/predictions";
import { ensureProfile, updateDisplayName } from "./services/profiles";
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
  const [session, setSession] = useState(null);
  const [authStatus, setAuthStatus] = useState(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );
  const [profile, setProfile] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [localMatches, setLocalMatches] = useState([]);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [sharedPredictions, setSharedPredictions] = useState([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [status, setStatus] = useState("loading");
  const [sharedStatus, setSharedStatus] = useState("idle");
  const [leaderboardStatus, setLeaderboardStatus] = useState("idle");
  const [dataError, setDataError] = useState("");
  const [serverOffset, setServerOffset] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [savingMatches, setSavingMatches] = useState({});
  const [predictionMessages, setPredictionMessages] = useState({});

  useEffect(() => {
    async function loadLocalMatches() {
      try {
        const response = await fetch("/matches.csv");

        if (!response.ok) {
          throw new Error("The match schedule could not be loaded.");
        }

        const parsedMatches = parseMatchesCsv(await response.text());
        setLocalMatches(parsedMatches);

        if (!session) {
          setMatches(parsedMatches);
          setStatus(parsedMatches.length > 0 ? "ready" : "empty");
        }
      } catch (error) {
        console.error("Failed to load local matches:", error);
        setStatus("error");
      }
    }

    loadLocalMatches();
  }, [session]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let active = true;

    getSession()
      .then((currentSession) => {
        if (active) {
          setSession(currentSession);
          setAuthStatus("ready");
        }
      })
      .catch((error) => {
        console.error("Failed to restore session:", error);
        if (active) {
          setAuthStatus("error");
        }
      });

    const stopListening = listenForAuthChanges((nextSession) => {
      setSession(nextSession);
      setAuthStatus("ready");
    });

    return () => {
      active = false;
      stopListening();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setIsAdminUser(false);
      setPredictions({});
      setSharedPredictions([]);
      setLeaderboardEntries([]);
      setDataError("");
      setActiveTab("Schedule");

      if (localMatches.length > 0) {
        setMatches(localMatches);
        setStatus("ready");
      }

      return;
    }

    let active = true;
    setStatus("loading");
    setDataError("");

    Promise.all([
      ensureProfile(session.user),
      getMatches(),
      getMyPredictions(session.user.id),
      getServerTime(),
      isAdmin().catch(() => false),
    ])
      .then(
        ([
          nextProfile,
          nextMatches,
          nextPredictions,
          serverTime,
          nextIsAdmin,
        ]) => {
          if (!active) {
            return;
          }

          setProfile(nextProfile);
          setIsAdminUser(nextIsAdmin);
          setMatches(nextMatches);
          setPredictions(nextPredictions);
          setServerOffset(new Date(serverTime).getTime() - Date.now());
          setStatus(nextMatches.length > 0 ? "ready" : "empty");
        },
      )
      .catch((error) => {
        console.error("Failed to load Supabase data:", error);

        if (active) {
          setDataError(error.message || "Could not load your pool data.");
          setStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [localMatches, session]);

  useEffect(() => {
    if (!session || activeTab !== "Friends' Guesses") {
      return;
    }

    let active = true;
    setSharedStatus("loading");

    getSharedPredictions(session.user.id)
      .then((nextPredictions) => {
        if (active) {
          setSharedPredictions(nextPredictions);
          setSharedStatus("ready");
        }
      })
      .catch((error) => {
        console.error("Failed to load shared predictions:", error);
        if (active) {
          setSharedStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [activeTab, session]);

  useEffect(() => {
    if (!session || activeTab !== "Leaderboard") {
      return;
    }

    let active = true;
    setLeaderboardStatus("loading");

    getLeaderboard()
      .then((entries) => {
        if (active) {
          setLeaderboardEntries(entries);
          setLeaderboardStatus("ready");
        }
      })
      .catch((error) => {
        console.error("Failed to load leaderboard:", error);
        if (active) {
          setLeaderboardStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [activeTab, session]);

  const currentTime = clock + serverOffset;
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
      tabMatches = matches.filter(
        (match) => predictions[match.id]?.updatedAt,
      );
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
      [matchId]: {
        ...currentPredictions[matchId],
        ...prediction,
      },
    }));
    setPredictionMessages((messages) => ({
      ...messages,
      [matchId]: null,
    }));
  }

  async function handleSavePrediction(matchId) {
    const prediction = predictions[matchId];

    if (!prediction) {
      return;
    }

    setSavingMatches((matchesBeingSaved) => ({
      ...matchesBeingSaved,
      [matchId]: true,
    }));
    setPredictionMessages((messages) => ({
      ...messages,
      [matchId]: null,
    }));

    try {
      const savedPrediction = await savePrediction(
        matchId,
        prediction.team1Score,
        prediction.team2Score,
      );

      setPredictions((currentPredictions) => ({
        ...currentPredictions,
        [matchId]: savedPrediction,
      }));
      setPredictionMessages((messages) => ({
        ...messages,
        [matchId]: { type: "success", text: "Prediction saved." },
      }));
    } catch (error) {
      setPredictionMessages((messages) => ({
        ...messages,
        [matchId]: {
          type: "error",
          text: error.message || "Could not save this prediction.",
        },
      }));
    } finally {
      setSavingMatches((matchesBeingSaved) => ({
        ...matchesBeingSaved,
        [matchId]: false,
      }));
    }
  }

  async function handleDisplayNameUpdate(displayName) {
    const nextProfile = await updateDisplayName(displayName);
    setProfile(nextProfile);
    return nextProfile;
  }

  async function handleSaveMatchResult(
    matchId,
    statusValue,
    team1Score,
    team2Score,
  ) {
    const updatedMatch = await saveMatchResult(
      matchId,
      statusValue,
      team1Score,
      team2Score,
    );

    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === updatedMatch.id ? updatedMatch : match,
      ),
    );

    if (activeTab === "Leaderboard") {
      const entries = await getLeaderboard();
      setLeaderboardEntries(entries);
      setLeaderboardStatus("ready");
    }

    return updatedMatch;
  }

  function renderScheduleContent() {
    if (status === "loading") {
      return <div className="empty-state">Loading the match schedule...</div>;
    }

    if (status === "error") {
      return (
        <div className="empty-state" role="alert">
          <strong>Could not load the schedule</strong>
          <p>{dataError || "Refresh the page to try again."}</p>
        </div>
      );
    }

    if (status === "empty" || visibleMatches.length === 0) {
      return (
        <div className="empty-state">
          <strong>No matches found</strong>
          <p>
            {activeTab === "My Guesses"
              ? "Save a score prediction from the schedule first."
              : "Try changing or clearing the filters."}
          </p>
        </div>
      );
    }

    return (
      <div className="match-grid">
        {visibleMatches.map((match) => (
          <MatchCard
            currentTime={currentTime}
            key={match.id}
            match={match}
            onPredictionChange={updatePrediction}
            onSavePrediction={handleSavePrediction}
            prediction={predictions[match.id]}
            predictionMessage={predictionMessages[match.id]}
            readOnly={activeTab === "My Guesses"}
            saving={Boolean(savingMatches[match.id])}
            signedIn={Boolean(session)}
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
            <small>Prediction pool</small>
          </div>
        </div>
      </header>

      <Navbar
        activeTab={activeTab}
        isAdmin={isAdminUser}
        onTabChange={setActiveTab}
      />

      <main>
        {!isSupabaseConfigured && (
          <div className="setup-notice" role="status">
            <strong>Supabase setup required</strong>
            <span>
              The schedule is read-only until the environment variables are
              configured.
            </span>
          </div>
        )}

        {authStatus === "error" && (
          <div className="setup-notice is-error" role="alert">
            Could not connect to Supabase. Check the project environment
            variables.
          </div>
        )}

        {isSupabaseConfigured &&
          authStatus !== "loading" &&
          (session ? (
            profile ? (
              <AccountPanel
                email={session.user.email}
                key={profile.id}
                onDisplayNameUpdate={handleDisplayNameUpdate}
                onSignOut={signOut}
                profile={profile}
              />
            ) : (
              <div className="empty-state">Loading your profile...</div>
            )
          ) : (
            <AuthPanel onSignIn={signIn} onSignUp={signUp} />
          ))}

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
          <FriendsGuesses
            matches={matches}
            predictions={sharedPredictions}
            signedIn={Boolean(session)}
            status={sharedStatus}
          />
        )}
        {activeTab === "Leaderboard" && (
          <Leaderboard
            entries={leaderboardEntries}
            signedIn={Boolean(session)}
            status={leaderboardStatus}
          />
        )}
        {activeTab === "Admin" && (
          <AdminResultsPanel
            isAdmin={isAdminUser}
            matches={matches}
            onSaveResult={handleSaveMatchResult}
            signedIn={Boolean(session)}
            status={status}
          />
        )}
      </main>

      <footer>
        <p>Final Whistle displays all match times in Chicago time.</p>
      </footer>
    </div>
  );
}

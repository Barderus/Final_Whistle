const tabs = [
  "Schedule",
  "Groups",
  "Knockout",
  "My Guesses",
  "Friends' Guesses",
  "Leaderboard",
];

export default function Navbar({ activeTab, onTabChange, isAdmin }) {
  const visibleTabs = isAdmin ? [...tabs, "Admin"] : tabs;

  return (
    <nav className="main-nav" aria-label="Primary navigation">
      <div className="nav-list">
        {visibleTabs.map((tab) => (
          <button
            className={`nav-button ${activeTab === tab ? "is-active" : ""}`}
            key={tab}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
    </nav>
  );
}

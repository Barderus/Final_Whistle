export default function MatchFilters({
  filters,
  locations,
  stages,
  teams,
  onChange,
  onReset,
}) {
  function updateFilter(event) {
    onChange({
      ...filters,
      [event.target.name]: event.target.value,
    });
  }

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <section className="filters" aria-labelledby="filter-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Find a match</p>
          <h2 id="filter-heading">Schedule filters</h2>
        </div>
        {hasActiveFilters && (
          <button className="text-button" onClick={onReset} type="button">
            Clear filters
          </button>
        )}
      </div>

      <div className="filter-grid">
        <label>
          Stage
          <select name="stage" value={filters.stage} onChange={updateFilter}>
            <option value="">All stages</option>
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>

        <label>
          Team
          <select name="team" value={filters.team} onChange={updateFilter}>
            <option value="">All teams</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <select
            name="location"
            value={filters.location}
            onChange={updateFilter}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

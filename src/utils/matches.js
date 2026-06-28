const GROUP_STAGE_PATTERN = /^Group /;
const ROUND_OF_32_STAGE = "Round of 32";
const DISPLAY_TIME_ZONE = "America/Chicago";

export function isGroupStage(stage) {
  return GROUP_STAGE_PATTERN.test(stage);
}

export function isKnockoutStage(stage) {
  return !isGroupStage(stage);
}

export function isPlaceholderTeam(team) {
  return (
    /^(?:UEFA|FIFA)\s+\w+$/i.test(team) ||
    /^(?:W|L)\d+$/i.test(team) ||
    /^\d[A-L]+$/i.test(team)
  );
}

export function isMatchUnlocked(match) {
  if (match.stage === ROUND_OF_32_STAGE) {
    return true;
  }

  return (
    !isPlaceholderTeam(match.team1) && !isPlaceholderTeam(match.team2)
  );
}

export function formatMatchDate(startTime) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(startTime));
}

export function formatMatchTime(startTime) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
    timeZoneName: "short",
  }).format(new Date(startTime));
}

export function getPredictionOutcome(team1Score, team2Score, match) {
  if (team1Score === "" || team2Score === "") {
    return "Enter both scores";
  }

  const firstScore = Number(team1Score);
  const secondScore = Number(team2Score);

  if (firstScore > secondScore) {
    return `${match.team1} win`;
  }

  if (secondScore > firstScore) {
    return `${match.team2} win`;
  }

  return "Draw";
}

export function isMatchLocked(startTime, currentTime = Date.now()) {
  return new Date(startTime).getTime() <= currentTime;
}

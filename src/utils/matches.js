const GROUP_STAGE_PATTERN = /^Group /;

export function isGroupStage(stage) {
  return GROUP_STAGE_PATTERN.test(stage);
}

export function isKnockoutStage(stage) {
  return !isGroupStage(stage);
}

export function formatMatchDate(startTime) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(startTime));
}

export function formatMatchTime(startTime) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
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

export function isMatchLocked(startTime) {
  return new Date(startTime).getTime() <= Date.now();
}

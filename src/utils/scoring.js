export function calculatePredictionPoints(
  predictedTeam1Score,
  predictedTeam2Score,
  actualTeam1Score,
  actualTeam2Score,
  matchStatus = "complete",
  actualWinnerSide = null,
) {
  if (matchStatus !== "complete") {
    return 0;
  }

  if (
    predictedTeam1Score === actualTeam1Score &&
    predictedTeam2Score === actualTeam2Score
  ) {
    return 3;
  }

  const predictedOutcome = Math.sign(
    predictedTeam1Score - predictedTeam2Score,
  );
  const actualOutcome =
    actualWinnerSide ?? Math.sign(actualTeam1Score - actualTeam2Score);

  return predictedOutcome === actualOutcome ? 1 : 0;
}

export function tallyLeaderboardPredictions(predictions) {
  return predictions.reduce(
    (totals, prediction) => {
      if (prediction.status !== "complete") {
        return totals;
      }

      const points = calculatePredictionPoints(
        prediction.predictedTeam1Score,
        prediction.predictedTeam2Score,
        prediction.actualTeam1Score,
        prediction.actualTeam2Score,
        prediction.status,
        prediction.actualWinnerSide ?? null,
      );

      return {
        scoredPredictions: totals.scoredPredictions + 1,
        exactScores: totals.exactScores + (points === 3 ? 1 : 0),
        points: totals.points + points,
      };
    },
    {
      scoredPredictions: 0,
      exactScores: 0,
      points: 0,
    },
  );
}

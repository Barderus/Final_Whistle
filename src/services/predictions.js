import { supabase } from "../lib/supabase";

function normalizePrediction(prediction) {
  return {
    matchId: prediction.match_id,
    team1Score: String(prediction.team1_score),
    team2Score: String(prediction.team2_score),
    updatedAt: prediction.updated_at,
  };
}

export async function getMyPredictions(userId) {
  const { data, error } = await supabase
    .from("predictions")
    .select("match_id, team1_score, team2_score, updated_at")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return Object.fromEntries(
    data.map((prediction) => {
      const normalized = normalizePrediction(prediction);
      return [normalized.matchId, normalized];
    }),
  );
}

export async function savePrediction(matchId, team1Score, team2Score) {
  const { data, error } = await supabase
    .rpc("save_prediction", {
      p_match_id: matchId,
      p_team1_score: Number(team1Score),
      p_team2_score: Number(team2Score),
    })
    .single();

  if (error) {
    throw error;
  }

  return normalizePrediction(data);
}

export async function getSharedPredictions(userId) {
  const { data, error } = await supabase
    .from("predictions")
    .select(
      "match_id, team1_score, team2_score, profiles!predictions_user_id_fkey(display_name)",
    )
    .neq("user_id", userId);

  if (error) {
    throw error;
  }

  return data.map((prediction) => ({
    matchId: prediction.match_id,
    displayName: prediction.profiles.display_name,
    team1Score: prediction.team1_score,
    team2Score: prediction.team2_score,
  }));
}

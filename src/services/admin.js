import { supabase } from "../lib/supabase";

export async function isAdmin() {
  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function saveMatchResult(
  matchId,
  status,
  team1Score,
  team2Score,
) {
  const normalizeScore = (score) =>
    score === "" || score === null || score === undefined
      ? null
      : Number(score);

  const { data, error } = await supabase
    .rpc("set_match_result", {
      p_match_id: matchId,
      p_status: status,
      p_team1_score: normalizeScore(team1Score),
      p_team2_score: normalizeScore(team2Score),
    })
    .single();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error("Supabase did not return the updated match.");
  }

  return data;
}

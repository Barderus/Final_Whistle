import { supabase } from "../lib/supabase.js";

export async function isAdmin() {
  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function isCompetitionExcluded(userId, client = supabase) {
  const { data, error } = await client.rpc("is_competition_excluded", {
    p_user_id: userId,
  });

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
  winnerTeam = "",
  changeReason = "",
  client = supabase,
) {
  const normalizeScore = (score) =>
    score === "" || score === null || score === undefined
      ? null
      : Number(score);

  const { data, error } = await client
    .rpc("set_match_result", {
      p_match_id: matchId,
      p_status: status,
      p_team1_score: normalizeScore(team1Score),
      p_team2_score: normalizeScore(team2Score),
      p_winner_team: winnerTeam || null,
      p_change_reason: changeReason.trim() || null,
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

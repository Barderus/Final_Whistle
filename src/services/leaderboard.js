import { supabase } from "../lib/supabase";

export async function getLeaderboard() {
  const { data, error } = await supabase
    .from("leaderboard")
    .select(
      "user_id, display_name, scored_predictions, exact_scores, points",
    )
    .order("points", { ascending: false })
    .order("exact_scores", { ascending: false })
    .order("display_name");

  if (error) {
    throw error;
  }

  return data;
}

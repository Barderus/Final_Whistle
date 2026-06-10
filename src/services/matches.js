import { supabase } from "../lib/supabase";

export async function getMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, match_number, stage, start_time, location, team1, team2, team1_score, team2_score, status",
    )
    .order("start_time")
    .order("match_number");

  if (error) {
    throw error;
  }

  return data;
}

export async function getServerTime() {
  const { data, error } = await supabase.rpc("get_server_time");

  if (error) {
    throw error;
  }

  return data;
}

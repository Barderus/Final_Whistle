import { supabase } from "../lib/supabase";

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateDisplayName(userId, displayName) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("id", userId)
    .select("id, display_name")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

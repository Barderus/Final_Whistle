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

export async function ensureProfile(user) {
  const profile = await getProfile(user.id);

  if (profile) {
    return profile;
  }

  const requestedName = user.user_metadata?.display_name?.trim();
  const defaultName =
    requestedName?.length >= 2
      ? requestedName
      : `Player ${user.id.slice(0, 8)}`;

  return updateDisplayName(defaultName);
}

export async function updateDisplayName(displayName) {
  const normalizedName = displayName.trim();
  const { data, error } = await supabase
    .rpc("save_display_name", {
      p_display_name: normalizedName,
    })
    .single();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error("Supabase did not return the updated profile.");
  }

  const savedProfile = await getProfile(data.id);

  if (!savedProfile || savedProfile.display_name !== normalizedName) {
    throw new Error("The display name was not saved by Supabase.");
  }

  return savedProfile;
}

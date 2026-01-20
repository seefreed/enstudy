"use server";

import { supabaseServer } from "../lib/supabaseServer";

const TABLE_NAME = process.env.SUPABASE_DISPLAY_MODE_TABLE || "useractions";

export async function updateDisplayMode(displayMode) {
  if (displayMode !== "dark" && displayMode !== "light") {
    throw new Error("displayMode must be 'dark' or 'light'.");
  }

  const { data, error: selectError } = await supabaseServer
    .from(TABLE_NAME)
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (data?.id) {
    const { error: updateError } = await supabaseServer
      .from(TABLE_NAME)
      .update({ display_mode: displayMode })
      .eq("id", data.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { ok: true, updated: true };
  }

  const { error: insertError } = await supabaseServer
    .from(TABLE_NAME)
    .insert({ display_mode: displayMode });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { ok: true, updated: false };
}

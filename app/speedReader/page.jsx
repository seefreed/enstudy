import path from "path";
import { readFile } from "fs/promises";
import SpeedReaderClient from "./SpeedReaderClient";
import { supabaseServer } from "../lib/supabaseServer";
import { DEFAULT_TEXT_FILENAME, DEFAULT_TEXT_FALLBACK } from "./utils";

async function loadDefaultText() {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      DEFAULT_TEXT_FILENAME
    );
    return await readFile(filePath, "utf8");
  } catch (error) {
    return DEFAULT_TEXT_FALLBACK;
  }
}

export default async function SpeedReaderPage() {
  const defaultText = await loadDefaultText();
  const tableName = process.env.SUPABASE_DISPLAY_MODE_TABLE || "useractions";
  const { data } = await supabaseServer
    .from(tableName)
    .select("display_mode, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  console.log("Fetched display mode:", data);
  const initialDisplayMode = data?.display_mode ?? "dark";

  return (
    <SpeedReaderClient
      defaultText={defaultText}
      initialDisplayMode={initialDisplayMode}
    />
  );
}

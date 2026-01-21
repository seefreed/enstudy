import path from "path";
import { readFile, readdir } from "fs/promises";
import MobileSpeedReaderClient from "./MobileSpeedReaderClient";
import { DEFAULT_TEXT_FILENAME, DEFAULT_TEXT_FALLBACK } from "../speedReader/utils";

async function loadDefaultText() {
  try {
    const filePath = path.join(process.cwd(), "public", DEFAULT_TEXT_FILENAME);
    return await readFile(filePath, "utf8");
  } catch (error) {
    return DEFAULT_TEXT_FALLBACK;
  }
}

async function loadTextFiles() {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const entries = await readdir(publicDir, { recursive: true });
    return entries
      .filter((entry) => entry.toLowerCase().endsWith(".txt"))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    return [];
  }
}

export default async function MobileVersionPage() {
  const defaultText = await loadDefaultText();
  const textFiles = await loadTextFiles();

  return <MobileSpeedReaderClient defaultText={defaultText} textFiles={textFiles} />;
}

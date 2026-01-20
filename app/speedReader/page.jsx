import path from "path";
import { readFile } from "fs/promises";
import SpeedReaderClient from "./SpeedReaderClient";
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
  return <SpeedReaderClient defaultText={defaultText} />;
}

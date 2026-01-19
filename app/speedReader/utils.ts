export const DEFAULT_TEXT_URL = "/The_secrets_of_learning_a_new_language_TED.txt";
export const DEFAULT_TEXT_FALLBACK =
  "Paste your text here to begin speed reading.";

export async function fetchDefaultText() {
  const response = await fetch(DEFAULT_TEXT_URL, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load default text: ${response.status}`);
  }

  return response.text();
}

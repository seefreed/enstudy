export const runtime = "nodejs";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

function distributeWordsOverSegment(words, start, end, offsetIndex) {
  const duration = Math.max(end - start, 0.01);
  const perWord = duration / words.length;
  return words.map((text, idx) => ({
    text,
    start: start + idx * perWord,
    end: start + (idx + 1) * perWord,
    index: offsetIndex + idx
  }));
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const payload = new FormData();
    payload.append("file", file, file.name || "audio" );
    payload.append("model", "gpt-4o-mini-transcribe");
    payload.append("response_format", "verbose_json");
    payload.append("timestamp_granularities[]", "word");

    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: payload
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: text || "Whisper failed." }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const words = [];

    if (Array.isArray(data.words) && data.words.length) {
      data.words.forEach((word, idx) => {
        if (!word?.word) return;
        words.push({
          text: word.word.trim(),
          start: word.start ?? 0,
          end: word.end ?? (word.start ?? 0),
          index: idx
        });
      });
    } else if (Array.isArray(data.segments)) {
      let index = 0;
      data.segments.forEach((segment) => {
        const rawWords = (segment.text || "")
          .replace(/\s+/g, " ")
          .trim()
          .split(" ")
          .filter(Boolean);
        if (!rawWords.length) return;
        const mapped = distributeWordsOverSegment(
          rawWords,
          segment.start ?? 0,
          segment.end ?? segment.start ?? 0,
          index
        );
        index += mapped.length;
        words.push(...mapped);
      });
    }

    return new Response(JSON.stringify({ words, text: data.text || "" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Whisper failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

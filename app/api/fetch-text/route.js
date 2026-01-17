import { NextResponse } from "next/server";

function decodeEntities(input) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromHtml(html) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(cleaned);
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing URL." }, { status: 400 });
    }

    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      return NextResponse.json({ error: "Unsupported URL." }, { status: 400 });
    }

    const response = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SpeedReaderStudio/1.0; +https://example.com)"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const text = extractTextFromHtml(html);

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not fetch that URL." },
      { status: 500 }
    );
  }
}

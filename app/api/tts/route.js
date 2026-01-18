export const runtime = "nodejs";

const TTS_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/audio/speech";

export async function POST(request) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing ZHIPU_API_KEY." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json();
    const payload = {
      model: "glm-tts",
      input: body?.input || "",
      voice: body?.voice || "tongtong",
      response_format: body?.response_format || "wav",
      stream: Boolean(body?.stream),
      watermark_enabled: body?.watermark_enabled ?? true,
      speed: body?.speed,
      volume: body?.volume,
      encode_format: body?.encode_format
    };

    if (!payload.input || typeof payload.input !== "string") {
      return new Response(JSON.stringify({ error: "Missing input text." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const upstream = await fetch(TTS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return new Response(
        JSON.stringify({ error: errorText || "TTS failed." }),
        {
          status: upstream.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const contentType = upstream.headers.get("content-type") || "audio/wav";
    const arrayBuffer = await upstream.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "TTS failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

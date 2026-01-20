import { NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabaseServer";

const TABLE_NAME = process.env.SUPABASE_DISPLAY_MODE_TABLE || "useractions";

export async function GET() {
  const { data, error } = await supabaseServer
    .from(TABLE_NAME)
    .select("display_mode, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    displayMode: data?.display_mode ?? null
  });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const displayMode = payload?.displayMode;

    if (displayMode !== "dark" && displayMode !== "light") {
      return NextResponse.json(
        { error: "displayMode must be 'dark' or 'light'." },
        { status: 400 }
      );
    }

    const { data, error: selectError } = await supabaseServer
      .from(TABLE_NAME)
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (data?.id) {
      const { error: updateError } = await supabaseServer
        .from(TABLE_NAME)
        .update({ display_mode: displayMode })
        .eq("id", data.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabaseServer
        .from(TABLE_NAME)
        .insert({ display_mode: displayMode });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

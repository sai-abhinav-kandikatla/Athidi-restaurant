import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, database: "unconfigured" },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  const result = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", "athidhi-family-restaurant")
    .maybeSingle();

  if (result.error || !result.data) {
    console.error("Health check database query failed", {
      code: result.error?.code ?? "restaurant_missing",
    });
    return NextResponse.json(
      {
        ok: false,
        database: "unavailable",
        message: "The restaurant database is temporarily unavailable.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    database: "connected",
    latencyMs: Date.now() - startedAt,
  });
}

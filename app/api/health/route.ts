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
    return NextResponse.json(
      {
        ok: false,
        database: "unavailable",
        message: result.error?.message ?? "Restaurant record is missing",
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

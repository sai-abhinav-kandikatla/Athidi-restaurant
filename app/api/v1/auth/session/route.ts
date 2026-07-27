import { getServerSupabase } from "../../../../lib/supabase/server";
import { jsonError, jsonSuccess } from "../../../../lib/auth-helpers";

export async function DELETE() {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return jsonError("Database service unavailable", 503);
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    return jsonError(error.message, 400);
  }

  return jsonSuccess({ message: "Signed out successfully" });
}

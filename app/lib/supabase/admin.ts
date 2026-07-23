import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "./config";

export function getServiceSupabase() {
  const config = getSupabaseServerConfig();
  if (!config) return null;
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}


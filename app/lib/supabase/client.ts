"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (browserClient) return browserClient;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  browserClient = createBrowserClient(config.url, config.anonKey);
  return browserClient;
}

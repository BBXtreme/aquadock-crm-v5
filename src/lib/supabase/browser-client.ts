// src/lib/supabase/browser.ts
// This file sets up the Supabase client for use in the browser
// It uses the createBrowserClient function from @supabase/ssr, which
// is designed to work in both server and client environments
// The client is configured using environment variables for the URL and
// anon key, which should be defined in a .env.local file for local
// development and in the deployment environment for production
// The createClient function can be imported and used throughout the app
// to interact with Supabase, ensuring that the client is properly
// initialized and configured for browser use
// The code includes a check to ensure that the necessary environment
// variables are defined, throwing an error if they are missing to prevent
// runtime issues when trying to use the client without proper
// configuration

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env.local file.");
}

export function createClient() {
  return createBrowserClient(supabaseUrl as string, supabaseAnonKey as string);
}

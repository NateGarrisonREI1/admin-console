export const dynamic = "force-dynamic";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Don't hard-throw during build; just create the client.
// (If env vars are missing at runtime, auth calls will fail, but builds won't.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

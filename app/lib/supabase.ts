import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon);

/** Sets the PostgreSQL session variable that RLS policies read. */
export async function initFamilySession(familyCode: string): Promise<void> {
  await supabase.rpc("set_family_code", { code: familyCode.toUpperCase() });
}

/** localStorage key for the persisted family code (device-local). */
export const FAMILY_CODE_KEY = "mm_family_code";

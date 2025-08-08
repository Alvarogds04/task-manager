import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://evizflpueqlinbfbrfpa.supabase.co";
const supabaseAnonKey = "sb_publishable_22VnyBe4hCF8Z6aM4tlULg_GaNi028T";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

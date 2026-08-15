import { createClient, SupabaseClient } from '@supabase/supabase-js';

const RUBYCHAN_SUPABASE_URL = 'https://rmmanieytszkfzdyrjvt.supabase.co';
const RUBYCHAN_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rIAI7GT3HSlKA-9AId9HuQ_hI0-KVMa';

let serviceSupabaseClient: SupabaseClient | null = null;
let lastUsedUrl: string | undefined = undefined;
let lastUsedKey: string | undefined = undefined;

export function getServerSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || RUBYCHAN_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || RUBYCHAN_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  if (serviceSupabaseClient && lastUsedUrl === supabaseUrl && lastUsedKey === supabaseKey) {
    return serviceSupabaseClient;
  }

  try {
    serviceSupabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    lastUsedUrl = supabaseUrl;
    lastUsedKey = supabaseKey;
    console.log(`[ServerSupabase] Initialized RubyChan Supabase client: ${supabaseUrl}`);
    return serviceSupabaseClient;
  } catch (err) {
    console.warn('[ServerSupabase] Could not initialize Supabase client:', err);
    return null;
  }
}

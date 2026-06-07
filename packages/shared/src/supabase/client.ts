import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export function createClient(supabaseUrl: string, supabaseKey: string, options?: { auth?: { persistSession?: boolean; storage?: any; autoRefreshToken?: boolean } }) {
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: options?.auth?.persistSession ?? true,
      storage: options?.auth?.storage,
      autoRefreshToken: options?.auth?.autoRefreshToken ?? true,
    },
  });
}

export type SupabaseClient = ReturnType<typeof createClient>;

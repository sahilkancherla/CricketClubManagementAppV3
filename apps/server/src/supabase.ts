import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env from repo root (two levels up from apps/server/)
config({ path: resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Untyped client for the server — all input validation is done via Zod middleware.
// We skip Database generics here because the service role key bypasses RLS,
// and the strict generics cause friction with dynamic request bodies.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

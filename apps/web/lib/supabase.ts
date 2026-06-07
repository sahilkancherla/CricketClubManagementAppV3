import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@cricket/shared';

// Reuse a single browser client across the app. A fresh client per call would
// never keep Supabase's background token-refresh timer alive, so the access
// token would silently expire (~1h) and API calls would 401.
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserClient;
}

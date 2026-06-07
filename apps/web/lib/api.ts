import { createSupabaseBrowserClient } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const supabase = createSupabaseBrowserClient();
  let { data: { session } } = await supabase.auth.getSession();

  // Proactively refresh a token that's expired or about to (within 60s), so a
  // long-lived tab never sends a stale JWT that the server rejects.
  const nowSec = Math.floor(Date.now() / 1000);
  if (session?.expires_at && session.expires_at - nowSec < 60) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) session = data.session;
  }

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    // Session is truly dead (refresh failed) — sign out and send to login
    // rather than surfacing a raw "Invalid or expired token" error.
    if (res.status === 401 && typeof window !== 'undefined') {
      await supabase.auth.signOut().catch(() => {});
      window.location.href = '/login';
      return null;
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

import { createClient } from '@supabase/supabase-js';

const getStoredConfig = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const url = localStorage.getItem('studypilot.supabase_url');
      const key = localStorage.getItem('studypilot.supabase_anon_key');
      if (url && key) return { url, key };
    }
  } catch (e) {}
  return { url: '', key: '' };
};

const stored = getStoredConfig();

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  stored.url ||
  '';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  stored.key ||
  '';

export const isSupabaseConfigured = () => {
  return (
    typeof supabaseUrl === 'string' &&
    typeof supabaseAnonKey === 'string' &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('YOUR_PROJECT') &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.includes('YOUR_PUBLIC_ANON_KEY')
  );
};

// Create the Supabase client instance
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getSupabaseConfig = () => ({
  configured: isSupabaseConfigured(),
  url: supabaseUrl || '',
  hasKey: Boolean(supabaseAnonKey),
});

import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-id')
  );
}

// Singleton instances for browser environment
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;
let dummyClientInstance: SupabaseClient | null = null;

export function createClient() {
  if (!isSupabaseConfigured()) {
    if (!dummyClientInstance) {
      dummyClientInstance = createSupabaseClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseAnonKey || 'placeholder-key'
      );
    }
    return dummyClientInstance;
  }

  // On Server Side Rendering (SSR), always return a fresh client
  if (typeof window === 'undefined') {
    return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }

  // On browser, return the cached singleton instance to prevent duplicate connections and token conflicts
  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return browserClientInstance;
}

/**
 * Chủ động kiểm tra và refresh phiên đăng nhập Supabase (nếu token đã hết hạn hoặc sắp hết hạn)
 */
export async function refreshSupabaseSession() {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return null;
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Supabase] Warning refreshing session:', error.message);
    }
    return session;
  } catch (err) {
    console.warn('[Supabase] Error refreshing session:', err);
    return null;
  }
}

/**
 * Kiểm tra và kết nối lại Supabase Realtime nếu socket bị đứt ngầm do thiết bị ngủ/khóa màn hình
 */
export function reconnectRealtimeIfDisconnected() {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return;
  try {
    const supabase = createClient();
    if (supabase && (supabase as any).realtime) {
      const realtime = (supabase as any).realtime;
      if (typeof realtime.isConnected === 'function' && !realtime.isConnected()) {
        realtime.connect();
      }
    }
  } catch (err) {
    console.warn('[Supabase] Error reconnecting realtime:', err);
  }
}



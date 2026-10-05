import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export function createSupabaseClient(
  url: string | undefined,
  anonKey: string | undefined,
): SupabaseClient<Database> | null {
  if (!url || !anonKey) {
    return null;
  }

  const client = createClient<Database>(url, anonKey, {
    auth: {
      storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });
  }

  return client;
}

export const supabase = createSupabaseClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

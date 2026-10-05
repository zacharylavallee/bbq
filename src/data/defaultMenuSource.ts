import { supabase } from '../lib/supabase';
import { mockMenuSource } from './mockMenu';
import { createSupabaseMenuSource } from './supabaseMenuSource';
import type { MenuSource } from './menuSource';

export function createDefaultMenuSource(client: typeof supabase): MenuSource {
  return client ? createSupabaseMenuSource(client) : mockMenuSource;
}

export const defaultMenuSource = createDefaultMenuSource(supabase);

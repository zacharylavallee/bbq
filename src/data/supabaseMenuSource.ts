import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { Menu } from '../types/menu';
import type { MenuSource } from './menuSource';
import { mapCategoryRow, mapItemRow } from '../lib/menuRows';

export function createSupabaseMenuSource(client: SupabaseClient<Database>): MenuSource {
  return {
    async getMenu(): Promise<Menu> {
      const { data: categoryRows, error: categoryError } = await client
        .from('menu_categories')
        .select('*')
        .order('sort_order')
        .order('name');
      if (categoryError) {
        throw new Error(categoryError.message);
      }

      const { data: itemRows, error: itemError } = await client
        .from('menu_items')
        .select('*')
        .order('sort_order')
        .order('name');
      if (itemError) {
        throw new Error(itemError.message);
      }

      return {
        categories: (categoryRows ?? []).map(mapCategoryRow),
        items: (itemRows ?? []).map((row) =>
          mapItemRow(
            row,
            (path) => client.storage.from('menu-photos').getPublicUrl(path).data.publicUrl,
          ),
        ),
      };
    },
  };
}

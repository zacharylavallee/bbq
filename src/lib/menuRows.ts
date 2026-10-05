import type { Tables } from '../types/database';
import type { MenuCategory, MenuUnit, MenuItem } from '../types/menu';
import type { MenuItemInput } from './menuAdminHelpers';

export function mapCategoryRow(row: Tables<'menu_categories'>): MenuCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

export function mapItemRow(
  row: Tables<'menu_items'>,
  publicUrlFor: (path: string) => string,
): MenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    unit: row.unit as MenuUnit,
    sortOrder: row.sort_order,
    imagePath: row.image_path,
    imageUrl: row.image_path ? publicUrlFor(row.image_path) : null,
    isAvailable: row.is_available,
    isCatering: row.is_catering,
  };
}

export function itemInputToRow(input: MenuItemInput) {
  return {
    category_id: input.categoryId,
    name: input.name,
    description: input.description,
    price_cents: input.priceCents,
    unit: input.unit,
    is_available: input.isAvailable,
    is_catering: input.isCatering,
    sort_order: input.sortOrder,
  };
}

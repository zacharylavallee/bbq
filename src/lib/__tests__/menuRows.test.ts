import type { Tables } from '../../types/database';
import type { MenuItemInput } from '../menuAdminHelpers';
import { itemInputToRow, mapCategoryRow, mapItemRow } from '../menuRows';

const categoryRow: Tables<'menu_categories'> = {
  id: 'category-1',
  name: 'Meats',
  sort_order: 3,
  created_at: '2026-10-05T00:00:00Z',
  updated_at: '2026-10-05T00:00:00Z',
};

const itemRow: Tables<'menu_items'> = {
  id: 'item-1',
  category_id: 'category-1',
  name: 'Brisket',
  description: 'Smoked',
  price_cents: 1234,
  unit: 'lb',
  image_path: 'item-1/photo.jpg',
  is_available: false,
  is_catering: true,
  sort_order: 5,
  created_at: '2026-10-05T00:00:00Z',
  updated_at: '2026-10-05T00:00:00Z',
};

describe('menu row mapping', () => {
  it('maps category columns to the app model', () => {
    expect(mapCategoryRow(categoryRow)).toEqual({
      id: 'category-1',
      name: 'Meats',
      sortOrder: 3,
    });
  });

  it('maps item columns and derives a photo URL', () => {
    expect(mapItemRow(itemRow, (path) => `https://photos.test/${path}`)).toEqual({
      id: 'item-1',
      categoryId: 'category-1',
      name: 'Brisket',
      description: 'Smoked',
      priceCents: 1234,
      unit: 'lb',
      sortOrder: 5,
      imagePath: 'item-1/photo.jpg',
      imageUrl: 'https://photos.test/item-1/photo.jpg',
      isAvailable: false,
      isCatering: true,
    });
  });

  it('does not request a public URL for a row without a photo', () => {
    const publicUrlFor = jest.fn();
    expect(mapItemRow({ ...itemRow, image_path: null }, publicUrlFor).imageUrl).toBeNull();
    expect(publicUrlFor).not.toHaveBeenCalled();
  });

  it('maps menu input fields to database column names', () => {
    const input: MenuItemInput = {
      name: 'Brisket',
      description: 'Smoked',
      priceCents: 1234,
      unit: 'lb',
      categoryId: 'category-1',
      isCatering: true,
      isAvailable: false,
      sortOrder: 5,
    };
    expect(itemInputToRow(input)).toEqual({
      category_id: 'category-1',
      name: 'Brisket',
      description: 'Smoked',
      price_cents: 1234,
      unit: 'lb',
      is_available: false,
      is_catering: true,
      sort_order: 5,
    });
  });
});

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../../types/database';
import { createDefaultMenuSource } from '../defaultMenuSource';
import { mockMenuSource } from '../mockMenu';
import { createSupabaseMenuSource } from '../supabaseMenuSource';

jest.mock('../../lib/supabase', () => ({
  supabase: null,
}));

const category: Tables<'menu_categories'> = {
  id: 'category-1',
  name: 'Meats',
  sort_order: 1,
  created_at: '2026-10-05T00:00:00Z',
  updated_at: '2026-10-05T00:00:00Z',
};

const item: Tables<'menu_items'> = {
  id: 'item-1',
  category_id: category.id,
  name: 'Brisket',
  description: 'Smoked',
  price_cents: 2500,
  unit: 'lb',
  image_path: 'item-1/photo.jpg',
  is_available: true,
  is_catering: false,
  sort_order: 1,
  created_at: '2026-10-05T00:00:00Z',
  updated_at: '2026-10-05T00:00:00Z',
};

function query(result: unknown): { select: jest.Mock; order: jest.Mock } {
  const chain = {
    select: jest.fn(),
    order: jest.fn(),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  chain.select.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

function clientWithResults(categoryResult: unknown, itemResult: unknown) {
  const categoryQuery = query(categoryResult);
  const itemQuery = query(itemResult);
  const client = {
    from: jest.fn((table: string) => (table === 'menu_categories' ? categoryQuery : itemQuery)),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn((path: string) => ({
          data: { publicUrl: `https://photos.test/${path}` },
        })),
      })),
    },
  };
  return { client, categoryQuery, itemQuery };
}

describe('createSupabaseMenuSource', () => {
  it('loads ordered rows and maps public photo URLs', async () => {
    const { client, categoryQuery, itemQuery } = clientWithResults(
      { data: [category], error: null },
      { data: [item, { ...item, id: 'item-2', image_path: null }], error: null },
    );
    const menu = await createSupabaseMenuSource(
      client as unknown as SupabaseClient<Database>,
    ).getMenu();
    expect(menu.categories).toEqual([{ id: category.id, name: category.name, sortOrder: 1 }]);
    expect(menu.items[0]).toMatchObject({
      id: item.id,
      categoryId: category.id,
      imagePath: item.image_path,
      imageUrl: `https://photos.test/${item.image_path}`,
    });
    expect(menu.items[1].imageUrl).toBeNull();
    expect(client.from.mock.calls).toEqual([['menu_categories'], ['menu_items']]);
    expect(categoryQuery.order).toHaveBeenNthCalledWith(1, 'sort_order');
    expect(categoryQuery.order).toHaveBeenNthCalledWith(2, 'name');
    expect(itemQuery.order).toHaveBeenNthCalledWith(1, 'sort_order');
    expect(itemQuery.order).toHaveBeenNthCalledWith(2, 'name');
  });

  it('throws the category query message', async () => {
    const { client } = clientWithResults(
      { data: null, error: { message: 'categories unavailable' } },
      { data: [], error: null },
    );
    await expect(
      createSupabaseMenuSource(client as unknown as SupabaseClient<Database>).getMenu(),
    ).rejects.toThrow('categories unavailable');
  });

  it('throws the item query message', async () => {
    const { client } = clientWithResults(
      { data: [], error: null },
      { data: null, error: { message: 'items unavailable' } },
    );
    await expect(
      createSupabaseMenuSource(client as unknown as SupabaseClient<Database>).getMenu(),
    ).rejects.toThrow('items unavailable');
  });

  it('returns empty collections when the database returns no rows', async () => {
    const { client } = clientWithResults({ data: null, error: null }, { data: null, error: null });
    await expect(
      createSupabaseMenuSource(client as unknown as SupabaseClient<Database>).getMenu(),
    ).resolves.toEqual({ categories: [], items: [] });
  });
});

describe('createDefaultMenuSource', () => {
  it('uses the mock source without a client', () => {
    expect(createDefaultMenuSource(null)).toBe(mockMenuSource);
  });

  it('creates a Supabase source when a client is configured', () => {
    const source = createDefaultMenuSource({} as unknown as SupabaseClient<Database>);
    expect(source).not.toBe(mockMenuSource);
    expect(source.getMenu).toEqual(expect.any(Function));
  });
});

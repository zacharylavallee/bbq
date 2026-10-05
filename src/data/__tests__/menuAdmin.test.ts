import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';
import type { Database } from '../../types/database';
import type { MenuItemInput } from '../../lib/menuAdminHelpers';
import { requireSupabase } from '../../lib/supabase';
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  removeItemPhoto,
  renameCategory,
  reorderCategories,
  replaceItemPhoto,
  setAvailability,
  updateItem,
} from '../menuAdmin';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'generated-uuid') }));
jest.mock('../../lib/supabase', () => ({ requireSupabase: jest.fn() }));

type QueryResult = { data?: unknown; error: { message: string; code?: string } | null };

function makeQuery(result: QueryResult) {
  const chain: Record<string, (...args: never[]) => unknown> = {};
  const self = () => chain;
  chain.insert = jest.fn(self);
  chain.update = jest.fn(self);
  chain.delete = jest.fn(self);
  chain.select = jest.fn(self);
  chain.eq = jest.fn(self);
  chain.single = jest.fn(() => Promise.resolve(result));
  chain.then = (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function setup({
  itemResult = { data: null, error: null },
  itemSingleResult = { data: { id: 'new-item' }, error: null },
  categoryResult = { data: null, error: null },
  categorySingleResult = { data: { id: 'new-category' }, error: null },
  uploadResult = { error: null },
  removeResult = { error: null },
}: {
  itemResult?: QueryResult;
  itemSingleResult?: QueryResult;
  categoryResult?: QueryResult;
  categorySingleResult?: QueryResult;
  uploadResult?: { error: { message: string } | null };
  removeResult?: { error: { message: string } | null };
} = {}) {
  const itemQuery = makeQuery(itemResult);
  itemQuery.single = jest.fn(() => Promise.resolve(itemSingleResult));
  const categoryQuery = makeQuery(categoryResult);
  categoryQuery.single = jest.fn(() => Promise.resolve(categorySingleResult));
  const bucket = {
    upload: jest.fn().mockResolvedValue(uploadResult),
    remove: jest.fn().mockResolvedValue(removeResult),
  };
  const client = {
    from: jest.fn((table: string) => (table === 'menu_items' ? itemQuery : categoryQuery)),
    storage: {
      from: jest.fn(() => bucket),
    },
  };
  jest.mocked(requireSupabase).mockReturnValue(client as unknown as SupabaseClient<Database>);
  return { client, itemQuery, categoryQuery, bucket };
}

const input: MenuItemInput = {
  name: 'Brisket',
  description: 'Smoked',
  priceCents: 2500,
  unit: 'lb',
  categoryId: 'meats',
  isCatering: false,
  isAvailable: true,
  sortOrder: 2,
};

describe('menuAdmin item writes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates an item and returns its ID', async () => {
    const { itemQuery } = setup();
    await expect(createItem(input)).resolves.toBe('new-item');
    expect(itemQuery.insert).toHaveBeenCalledWith({
      category_id: 'meats',
      name: 'Brisket',
      description: 'Smoked',
      price_cents: 2500,
      unit: 'lb',
      is_available: true,
      is_catering: false,
      sort_order: 2,
    });
  });

  it('throws the Supabase error when item creation fails', async () => {
    setup({ itemSingleResult: { data: null, error: { message: 'insert failed' } } });
    await expect(createItem(input)).rejects.toThrow('insert failed');
  });

  it('rejects an item response without an ID', async () => {
    setup({ itemSingleResult: { data: null, error: null } });
    await expect(createItem(input)).rejects.toThrow('Menu item creation returned no ID.');
  });

  it('updates an item and its availability', async () => {
    const { itemQuery } = setup();
    await updateItem('item-1', input);
    expect(itemQuery.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Brisket' }));
    await setAvailability('item-1', false);
    expect(itemQuery.update).toHaveBeenLastCalledWith({ is_available: false });
    expect(itemQuery.eq).toHaveBeenLastCalledWith('id', 'item-1');
  });

  it('throws Supabase errors from item updates', async () => {
    setup({ itemResult: { data: null, error: { message: 'update failed' } } });
    await expect(updateItem('item-1', input)).rejects.toThrow('update failed');
    await expect(setAvailability('item-1', false)).rejects.toThrow('update failed');
  });

  it('deletes an item and best-effort removes its photo', async () => {
    const { itemQuery, bucket } = setup();
    bucket.remove.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(
      deleteItem({ id: 'item-1', imagePath: 'item-1/photo.jpg' }),
    ).resolves.toBeUndefined();
    expect(itemQuery.delete).toHaveBeenCalled();
    expect(bucket.remove).toHaveBeenCalledWith(['item-1/photo.jpg']);
  });

  it('skips photo removal when an item has no photo', async () => {
    const { bucket } = setup();
    await deleteItem({ id: 'item-1', imagePath: null });
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it('does not remove the photo when deleting the item fails', async () => {
    const { bucket } = setup({ itemResult: { data: null, error: { message: 'delete failed' } } });
    await expect(deleteItem({ id: 'item-1', imagePath: 'old.jpg' })).rejects.toThrow(
      'delete failed',
    );
    expect(bucket.remove).not.toHaveBeenCalled();
  });
});

describe('menuAdmin category writes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates, renames, and reorders categories', async () => {
    const { categoryQuery } = setup();
    await createCategory('Sides', 4);
    expect(categoryQuery.insert).toHaveBeenCalledWith({ name: 'Sides', sort_order: 4 });
    await renameCategory('category-1', 'Sides & more');
    expect(categoryQuery.update).toHaveBeenCalledWith({ name: 'Sides & more' });
    await reorderCategories(['second', 'first']);
    expect(categoryQuery.update).toHaveBeenNthCalledWith(2, { sort_order: 1 });
    expect(categoryQuery.update).toHaveBeenNthCalledWith(3, { sort_order: 2 });
    expect(categoryQuery.eq).toHaveBeenLastCalledWith('id', 'first');
  });

  it('throws errors from category writes', async () => {
    setup({ categoryResult: { data: null, error: { message: 'category failed' } } });
    await expect(createCategory('Sides', 1)).rejects.toThrow('category failed');
    await expect(renameCategory('category-1', 'Sides')).rejects.toThrow('category failed');
    await expect(reorderCategories(['category-1'])).rejects.toThrow('category failed');
  });

  it('deletes a category and maps foreign key failures', async () => {
    setup();
    await expect(deleteCategory('category-1')).resolves.toBeUndefined();
    setup({ categoryResult: { data: null, error: { message: 'fk', code: '23503' } } });
    await expect(deleteCategory('category-1')).rejects.toThrow(
      'This category still has items. Move or delete them first.',
    );
  });

  it('preserves other category delete errors', async () => {
    setup({ categoryResult: { data: null, error: { message: 'delete failed', code: '42501' } } });
    await expect(deleteCategory('category-1')).rejects.toThrow('delete failed');
  });
});

describe('menuAdmin photo writes', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('uploads a photo, updates the path, and removes the prior photo', async () => {
    const { itemQuery, bucket } = setup();
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) } as Response);
    await expect(
      replaceItemPhoto('item-1', 'old/photo.jpg', {
        uri: 'file:///photo.png',
        mimeType: 'image/png',
      }),
    ).resolves.toBe('item-1/generated-uuid.png');
    expect(randomUUID).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('file:///photo.png');
    expect(bucket.upload).toHaveBeenCalledWith(
      'item-1/generated-uuid.png',
      expect.any(ArrayBuffer),
      { contentType: 'image/png', upsert: true },
    );
    expect(itemQuery.update).toHaveBeenCalledWith({ image_path: 'item-1/generated-uuid.png' });
    expect(bucket.remove).toHaveBeenCalledWith(['old/photo.jpg']);
  });

  it('uses JPEG as the fallback MIME type and accepts no old path', async () => {
    const { bucket } = setup();
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(1) } as Response);
    await expect(replaceItemPhoto('item-1', null, { uri: 'file:///photo' })).resolves.toBe(
      'item-1/generated-uuid.jpg',
    );
    expect(bucket.upload).toHaveBeenCalledWith(
      'item-1/generated-uuid.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: true },
    );
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it('keeps an existing object when the generated path is unchanged', async () => {
    const { bucket } = setup();
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(1) } as Response);
    await replaceItemPhoto('item-1', 'item-1/generated-uuid.jpg', {
      uri: 'file:///photo',
    });
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it('throws upload errors without updating the item', async () => {
    const { itemQuery } = setup({ uploadResult: { error: { message: 'upload failed' } } });
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(1) } as Response);
    await expect(replaceItemPhoto('item-1', null, { uri: 'file:///photo' })).rejects.toThrow(
      'upload failed',
    );
    expect(itemQuery.update).not.toHaveBeenCalled();
  });

  it('removes an uploaded photo if saving its path fails', async () => {
    const { bucket } = setup({
      itemResult: { data: null, error: { message: 'path update failed' } },
    });
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(1) } as Response);
    await expect(replaceItemPhoto('item-1', null, { uri: 'file:///photo' })).rejects.toThrow(
      'path update failed',
    );
    expect(bucket.remove).toHaveBeenCalledWith(['item-1/generated-uuid.jpg']);
  });

  it('clears an image path before removing the photo', async () => {
    const { itemQuery, bucket } = setup();
    await removeItemPhoto('item-1', 'item-1/photo.jpg');
    expect(itemQuery.update).toHaveBeenCalledWith({ image_path: null });
    expect(bucket.remove).toHaveBeenCalledWith(['item-1/photo.jpg']);
  });

  it('throws when clearing the image path fails', async () => {
    const { bucket } = setup({
      itemResult: { data: null, error: { message: 'clear failed' } },
    });
    await expect(removeItemPhoto('item-1', 'photo.jpg')).rejects.toThrow('clear failed');
    expect(bucket.remove).not.toHaveBeenCalled();
  });
});

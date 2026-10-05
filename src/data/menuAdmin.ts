import { randomUUID } from 'expo-crypto';
import type { MenuItem } from '../types/menu';
import { itemInputToRow } from '../lib/menuRows';
import { photoObjectPath, type MenuItemInput } from '../lib/menuAdminHelpers';
import { requireSupabase } from '../lib/supabase';

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

async function removePhoto(path: string | null): Promise<void> {
  if (!path) {
    return;
  }
  try {
    await requireSupabase().storage.from('menu-photos').remove([path]);
  } catch {
    return;
  }
}

export async function createItem(input: MenuItemInput): Promise<string> {
  const { data, error } = await requireSupabase()
    .from('menu_items')
    .insert(itemInputToRow(input))
    .select('id')
    .single();
  throwIfError(error);
  if (!data) {
    throw new Error('Menu item creation returned no ID.');
  }
  return data.id;
}

export async function updateItem(id: string, input: MenuItemInput): Promise<void> {
  const { error } = await requireSupabase()
    .from('menu_items')
    .update(itemInputToRow(input))
    .eq('id', id);
  throwIfError(error);
}

export async function setAvailability(id: string, isAvailable: boolean): Promise<void> {
  const { error } = await requireSupabase()
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', id);
  throwIfError(error);
}

export async function deleteItem(item: Pick<MenuItem, 'id' | 'imagePath'>): Promise<void> {
  const { error } = await requireSupabase().from('menu_items').delete().eq('id', item.id);
  throwIfError(error);
  await removePhoto(item.imagePath);
}

export async function createCategory(name: string, sortOrder: number): Promise<void> {
  const { error } = await requireSupabase()
    .from('menu_categories')
    .insert({ name, sort_order: sortOrder });
  throwIfError(error);
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await requireSupabase().from('menu_categories').update({ name }).eq('id', id);
  throwIfError(error);
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const client = requireSupabase();
  for (const [index, id] of orderedIds.entries()) {
    const { error } = await client
      .from('menu_categories')
      .update({ sort_order: index + 1 })
      .eq('id', id);
    throwIfError(error);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await requireSupabase().from('menu_categories').delete().eq('id', id);
  if (error?.code === '23503') {
    throw new Error('This category still has items. Move or delete them first.');
  }
  throwIfError(error);
}

export async function replaceItemPhoto(
  itemId: string,
  oldPath: string | null,
  photo: { uri: string; mimeType?: string },
): Promise<string> {
  const client = requireSupabase();
  const path = photoObjectPath(itemId, photo.mimeType, randomUUID());
  const body = await fetch(photo.uri).then((response) => response.arrayBuffer());
  const { error: uploadError } = await client.storage
    .from('menu-photos')
    .upload(path, body, { contentType: photo.mimeType ?? 'image/jpeg', upsert: true });
  throwIfError(uploadError);

  const { error: updateError } = await client
    .from('menu_items')
    .update({ image_path: path })
    .eq('id', itemId);
  if (updateError) {
    await removePhoto(path);
    throw new Error(updateError.message);
  }

  if (oldPath && oldPath !== path) {
    await removePhoto(oldPath);
  }
  return path;
}

export async function removeItemPhoto(itemId: string, oldPath: string | null): Promise<void> {
  const { error } = await requireSupabase()
    .from('menu_items')
    .update({ image_path: null })
    .eq('id', itemId);
  throwIfError(error);
  await removePhoto(oldPath);
}

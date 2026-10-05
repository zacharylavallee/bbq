import type { MenuItem, MenuUnit } from '../types/menu';

export interface MenuItemFormValues {
  name: string;
  description: string;
  price: string;
  unit: MenuUnit | '';
  categoryId: string;
  isCatering: boolean;
  isAvailable: boolean;
  sortOrder: string;
}

export interface MenuItemInput {
  name: string;
  description: string;
  priceCents: number;
  unit: MenuUnit;
  categoryId: string;
  isCatering: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export type MenuItemValidation =
  | { ok: true; value: MenuItemInput }
  | { ok: false; errors: Partial<Record<keyof MenuItemFormValues, string>> };

const MAX_INT32 = 2_147_483_647n;
const units: readonly MenuUnit[] = ['each', 'lb', 'tray'];

export function parseDollarsToCents(input: string): number | null {
  let value = input.trim();
  if (value.startsWith('$')) {
    value = value.slice(1);
  }

  const match = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    return null;
  }

  const wholeDigits = match[1].replaceAll(',', '').replace(/^0+(?=\d)/, '');
  if (wholeDigits.length > 10) {
    return null;
  }

  const cents = BigInt(wholeDigits) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  return cents <= MAX_INT32 ? Number(cents) : null;
}

export function validateMenuItemInput(values: MenuItemFormValues): MenuItemValidation {
  const errors: Partial<Record<keyof MenuItemFormValues, string>> = {};
  const name = values.name.trim();
  const description = values.description.trim();
  const categoryId = values.categoryId.trim();
  const priceCents = parseDollarsToCents(values.price);
  let sortOrder = 0;

  if (!name) {
    errors.name = 'Enter a name.';
  } else if (name.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  if (description.length > 1000) {
    errors.description = 'Description must be 1000 characters or fewer.';
  }

  if (!values.price.trim()) {
    errors.price = 'Enter a price like 12.50.';
  } else if (priceCents === null) {
    errors.price = 'Enter a price like 12.50.';
  }

  if (!units.includes(values.unit as MenuUnit)) {
    errors.unit = 'Choose a unit.';
  }

  if (!categoryId) {
    errors.categoryId = 'Choose a category.';
  }

  if (values.sortOrder === '') {
    sortOrder = 0;
  } else if (!/^-?\d+$/.test(values.sortOrder)) {
    errors.sortOrder = 'Enter a whole number.';
  } else {
    const parsed = BigInt(values.sortOrder);
    if (parsed < -2_147_483_648n || parsed > MAX_INT32) {
      errors.sortOrder = 'Sort order must be a 32-bit integer.';
    } else {
      sortOrder = Number(parsed);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      priceCents: priceCents as number,
      unit: values.unit as MenuUnit,
      categoryId,
      isCatering: values.isCatering,
      isAvailable: values.isAvailable,
      sortOrder,
    },
  };
}

export function validateCategoryName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Enter a category name.';
  }
  if (trimmed.length > 60) {
    return 'Category name must be 60 characters or fewer.';
  }
  return null;
}

export function formValuesFromItem(item?: MenuItem, defaultCategoryId = ''): MenuItemFormValues {
  return item
    ? {
        name: item.name,
        description: item.description,
        price: `${Math.floor(item.priceCents / 100)}.${(item.priceCents % 100)
          .toString()
          .padStart(2, '0')}`,
        unit: item.unit,
        categoryId: item.categoryId,
        isCatering: item.isCatering,
        isAvailable: item.isAvailable,
        sortOrder: String(item.sortOrder),
      }
    : {
        name: '',
        description: '',
        price: '',
        unit: '',
        categoryId: defaultCategoryId,
        isCatering: false,
        isAvailable: true,
        sortOrder: '0',
      };
}

export function photoObjectPath(
  itemId: string,
  mimeType: string | undefined,
  uuid: string,
): string {
  const subtype = mimeType?.toLowerCase().split(';')[0]?.split('/').at(-1);
  const extension =
    subtype === 'jpeg'
      ? 'jpg'
      : subtype === 'png' || subtype === 'webp' || subtype === 'heic' || subtype === 'heif'
        ? subtype
        : 'jpg';
  return `${itemId}/${uuid}.${extension}`;
}

export function moveItem<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const moved = [...items];
  const target = index + delta;
  if (index < 0 || index >= moved.length || target < 0 || target >= moved.length) {
    return moved;
  }
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

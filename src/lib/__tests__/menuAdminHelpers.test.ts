import type { MenuItem } from '../../types/menu';
import {
  formValuesFromItem,
  moveItem,
  parseDollarsToCents,
  photoObjectPath,
  validateCategoryName,
  validateMenuItemInput,
} from '../menuAdminHelpers';

const validValues = {
  name: ' Brisket ',
  description: ' Smoked over oak. ',
  price: '12.5',
  unit: 'lb' as const,
  categoryId: 'meats',
  isCatering: false,
  isAvailable: true,
  sortOrder: '4',
};

describe('parseDollarsToCents', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['$1,234.00', 123400],
    ['0', 0],
    ['  $0.07  ', 7],
    ['21474836.47', 2147483647],
  ])('parses %s', (input, expected) => {
    expect(parseDollarsToCents(input)).toBe(expected);
  });

  it.each([
    '',
    '-1',
    '$-1',
    '1.234',
    '1,23',
    'abc',
    '12.',
    '.5',
    '1e3',
    '$$1',
    '21474836.48',
    '12345678901',
  ])('rejects %s', (input) => {
    expect(parseDollarsToCents(input)).toBeNull();
  });
});

describe('validateMenuItemInput', () => {
  it('trims fields and returns a typed input', () => {
    expect(validateMenuItemInput(validValues)).toEqual({
      ok: true,
      value: {
        name: 'Brisket',
        description: 'Smoked over oak.',
        priceCents: 1250,
        unit: 'lb',
        categoryId: 'meats',
        isCatering: false,
        isAvailable: true,
        sortOrder: 4,
      },
    });
  });

  it('reports required fields and invalid price', () => {
    const result = validateMenuItemInput({
      ...validValues,
      name: ' ',
      price: ' ',
      unit: '',
      categoryId: ' ',
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'Enter a name.',
        price: 'Enter a price like 12.50.',
        unit: 'Choose a unit.',
        categoryId: 'Choose a category.',
      },
    });
  });

  it('reports invalid non-empty prices and overlong text', () => {
    const result = validateMenuItemInput({
      ...validValues,
      name: 'x'.repeat(101),
      description: 'x'.repeat(1001),
      price: 'abc',
    });
    expect(result).toMatchObject({
      ok: false,
      errors: {
        name: 'Name must be 100 characters or fewer.',
        description: 'Description must be 1000 characters or fewer.',
        price: 'Enter a price like 12.50.',
      },
    });
  });

  it('defaults an empty sort order to zero', () => {
    const result = validateMenuItemInput({ ...validValues, sortOrder: '' });
    expect(result).toMatchObject({ ok: true, value: { sortOrder: 0 } });
  });

  it.each(['1.5', '12x', '2147483648', '-2147483649'])(
    'rejects invalid sort order %s',
    (sortOrder) => {
      expect(validateMenuItemInput({ ...validValues, sortOrder })).toMatchObject({
        ok: false,
        errors: { sortOrder: expect.any(String) },
      });
    },
  );

  it('accepts negative int32 sort order', () => {
    expect(validateMenuItemInput({ ...validValues, sortOrder: '-2147483648' })).toMatchObject({
      ok: true,
      value: { sortOrder: -2147483648 },
    });
  });
});

describe('validateCategoryName', () => {
  it('requires a trimmed category name', () => {
    expect(validateCategoryName('  ')).toBe('Enter a category name.');
  });

  it('enforces the length limit and accepts trimmed names', () => {
    expect(validateCategoryName('x'.repeat(61))).toBe(
      'Category name must be 60 characters or fewer.',
    );
    expect(validateCategoryName('  Sides  ')).toBeNull();
  });
});

describe('formValuesFromItem', () => {
  const item: MenuItem = {
    id: '1',
    categoryId: 'meats',
    name: 'Brisket',
    description: 'Smoked',
    priceCents: 1234,
    unit: 'lb',
    sortOrder: 2,
    imagePath: null,
    imageUrl: null,
    isAvailable: true,
    isCatering: false,
  };

  it('converts item data into form values without dollar formatting', () => {
    expect(formValuesFromItem(item)).toEqual({
      name: 'Brisket',
      description: 'Smoked',
      price: '12.34',
      unit: 'lb',
      categoryId: 'meats',
      isCatering: false,
      isAvailable: true,
      sortOrder: '2',
    });
  });

  it('provides defaults for a new item', () => {
    expect(formValuesFromItem(undefined, 'sides')).toEqual({
      name: '',
      description: '',
      price: '',
      unit: '',
      categoryId: 'sides',
      isCatering: false,
      isAvailable: true,
      sortOrder: '0',
    });
  });
});

describe('photoObjectPath', () => {
  it.each([
    ['image/jpeg', 'item/uuid.jpg'],
    ['image/png', 'item/uuid.png'],
    ['image/webp', 'item/uuid.webp'],
    ['image/heic', 'item/uuid.heic'],
    ['image/heif', 'item/uuid.heif'],
    ['image/jpeg; charset=binary', 'item/uuid.jpg'],
    [undefined, 'item/uuid.jpg'],
    ['application/octet-stream', 'item/uuid.jpg'],
  ])('maps %s to %s', (mimeType, expected) => {
    expect(photoObjectPath('item', mimeType, 'uuid')).toBe(expected);
  });
});

describe('moveItem', () => {
  it('moves an item up or down and returns a copy', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(items, 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(items, 1, 1)).not.toBe(items);
  });

  it('does nothing at either edge or for an invalid index', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
  });
});

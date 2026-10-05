import { findMenuItem, groupMenu } from '../menu';
import type { Menu, MenuItem } from '../../types/menu';

function makeItem(overrides: Partial<MenuItem>): MenuItem {
  return {
    id: 'item',
    categoryId: 'a',
    name: 'Item',
    description: 'desc',
    priceCents: 100,
    unit: 'each',
    sortOrder: 0,
    imagePath: null,
    imageUrl: null,
    isAvailable: true,
    isCatering: false,
    ...overrides,
  };
}

describe('groupMenu', () => {
  it('sorts sections by category sortOrder', () => {
    const menu: Menu = {
      categories: [
        { id: 'b', name: 'Second', sortOrder: 2 },
        { id: 'a', name: 'First', sortOrder: 1 },
      ],
      items: [makeItem({ id: '1', categoryId: 'a' }), makeItem({ id: '2', categoryId: 'b' })],
    };
    expect(groupMenu(menu).map((s) => s.category.name)).toEqual(['First', 'Second']);
  });

  it('omits empty categories', () => {
    const menu: Menu = {
      categories: [
        { id: 'a', name: 'A', sortOrder: 1 },
        { id: 'empty', name: 'Empty', sortOrder: 2 },
      ],
      items: [makeItem({ id: '1', categoryId: 'a' })],
    };
    expect(groupMenu(menu).map((s) => s.category.id)).toEqual(['a']);
  });

  it('ignores items with unknown categoryId', () => {
    const menu: Menu = {
      categories: [{ id: 'a', name: 'A', sortOrder: 1 }],
      items: [makeItem({ id: '1' }), makeItem({ id: '2', categoryId: 'nope' })],
    };
    const sections = groupMenu(menu);
    expect(sections).toHaveLength(1);
    expect(sections[0].data.map((i) => i.id)).toEqual(['1']);
  });

  it('sorts items by sort order and then name', () => {
    const menu: Menu = {
      categories: [{ id: 'a', name: 'A', sortOrder: 1 }],
      items: [
        makeItem({ id: 'z', sortOrder: 2 }),
        makeItem({ id: 'y', sortOrder: 1 }),
        makeItem({ id: 'x', sortOrder: 1, name: 'Alpha' }),
      ],
    };
    expect(groupMenu(menu)[0].data.map((i) => i.id)).toEqual(['x', 'y', 'z']);
  });

  it('includes empty categories when requested', () => {
    const menu: Menu = {
      categories: [
        { id: 'a', name: 'A', sortOrder: 1 },
        { id: 'empty', name: 'Empty', sortOrder: 2 },
      ],
      items: [makeItem({ id: '1' })],
    };
    expect(groupMenu(menu, { includeEmpty: true }).map((section) => section.data)).toEqual([
      [menu.items[0]],
      [],
    ]);
  });
});

describe('findMenuItem', () => {
  const menu: Menu = { categories: [], items: [makeItem({ id: 'hit' })] };

  it('finds an item by id', () => {
    expect(findMenuItem(menu, 'hit')?.id).toBe('hit');
  });

  it('returns undefined for unknown id', () => {
    expect(findMenuItem(menu, 'miss')).toBeUndefined();
  });
});

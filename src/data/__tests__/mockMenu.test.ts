import { mockMenu, mockMenuSource } from '../mockMenu';

describe('mockMenu', () => {
  it('gives every item an existing categoryId', () => {
    const ids = new Set(mockMenu.categories.map((c) => c.id));
    for (const item of mockMenu.items) {
      expect(ids.has(item.categoryId)).toBe(true);
    }
  });

  it('has unique item ids', () => {
    const ids = mockMenu.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has non-negative integer prices', () => {
    for (const item of mockMenu.items) {
      expect(Number.isInteger(item.priceCents)).toBe(true);
      expect(item.priceCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('has exactly one unavailable item', () => {
    expect(mockMenu.items.filter((i) => !i.isAvailable)).toHaveLength(1);
  });
});

describe('mockMenuSource', () => {
  it('resolves the mock menu', async () => {
    await expect(mockMenuSource.getMenu()).resolves.toBe(mockMenu);
  });
});

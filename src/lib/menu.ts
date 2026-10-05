import type { Menu, MenuCategory, MenuItem } from '../types/menu';

export interface MenuSection {
  category: MenuCategory;
  data: MenuItem[];
}

export function groupMenu(menu: Menu): MenuSection[] {
  return [...menu.categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      category,
      data: menu.items.filter((item) => item.categoryId === category.id),
    }))
    .filter((section) => section.data.length > 0);
}

export function findMenuItem(menu: Menu, id: string): MenuItem | undefined {
  return menu.items.find((item) => item.id === id);
}

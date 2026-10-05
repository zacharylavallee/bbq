import type { Menu, MenuCategory, MenuItem } from '../types/menu';

export interface MenuSection {
  category: MenuCategory;
  data: MenuItem[];
}

export function groupMenu(
  menu: Menu,
  { includeEmpty = false }: { includeEmpty?: boolean } = {},
): MenuSection[] {
  return [...menu.categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      category,
      data: menu.items
        .filter((item) => item.categoryId === category.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    }))
    .filter((section) => includeEmpty || section.data.length > 0);
}

export function findMenuItem(menu: Menu, id: string): MenuItem | undefined {
  return menu.items.find((item) => item.id === id);
}

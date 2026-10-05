export type MenuUnit = 'each' | 'lb' | 'tray';

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  unit: MenuUnit;
  imageUrl: string | null;
  isAvailable: boolean;
  isCatering: boolean;
}

export interface Menu {
  categories: MenuCategory[];
  items: MenuItem[];
}

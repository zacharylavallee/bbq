import type { Menu } from '../types/menu';

export interface MenuSource {
  getMenu(): Promise<Menu>;
}

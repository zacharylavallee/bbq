import type { MenuItem } from '../types/menu';

export function formatCents(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new RangeError(`formatCents expects a non-negative integer, got ${cents}`);
  }
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  const dollarString = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${dollarString}.${remainder.toString().padStart(2, '0')}`;
}

export function formatItemPrice(item: Pick<MenuItem, 'priceCents' | 'unit'>): string {
  const price = formatCents(item.priceCents);
  if (item.unit === 'each') {
    return price;
  }
  return `${price} / ${item.unit}`;
}

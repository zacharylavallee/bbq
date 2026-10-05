import { formatCents, formatItemPrice } from '../money';
import type { MenuUnit } from '../../types/menu';

describe('formatCents', () => {
  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00');
  });

  it('pads single-digit cents', () => {
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(50)).toBe('$0.50');
  });

  it('formats dollars and cents', () => {
    expect(formatCents(1299)).toBe('$12.99');
  });

  it('adds thousands separators', () => {
    expect(formatCents(123450)).toBe('$1,234.50');
    expect(formatCents(100000)).toBe('$1,000.00');
  });

  it('handles large values', () => {
    expect(formatCents(123456789)).toBe('$1,234,567.89');
  });

  it.each([-1, 1.5, NaN, 0.1])('throws RangeError for %s', (input) => {
    expect(() => formatCents(input)).toThrow(RangeError);
  });
});

describe('formatItemPrice', () => {
  it.each([
    ['lb', 2800, '$28.00 / lb'],
    ['tray', 9500, '$95.00 / tray'],
    ['each', 900, '$9.00'],
  ] as [MenuUnit, number, string][])('formats unit %s', (unit, priceCents, expected) => {
    expect(formatItemPrice({ unit, priceCents })).toBe(expected);
  });
});

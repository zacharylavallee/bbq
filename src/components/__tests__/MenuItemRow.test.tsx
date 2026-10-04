import { fireEvent, render, screen } from '@testing-library/react-native';
import { MenuItemRow } from '../MenuItemRow';
import type { MenuItem } from '../../types/menu';

const baseItem: MenuItem = {
  id: 'brisket',
  categoryId: 'meats',
  name: 'Brisket',
  description: 'Slow-smoked for 14 hours.',
  priceCents: 2800,
  unit: 'lb',
  imageUrl: null,
  isAvailable: true,
  isCatering: false,
};

describe('MenuItemRow', () => {
  it('renders name, description, and formatted price', async () => {
    await render(<MenuItemRow item={baseItem} onPress={jest.fn()} />);
    expect(screen.getByText('Brisket')).toBeOnTheScreen();
    expect(screen.getByText('Slow-smoked for 14 hours.')).toBeOnTheScreen();
    expect(screen.getByText('$28.00 / lb')).toBeOnTheScreen();
  });

  it('shows a Sold out badge when unavailable', async () => {
    await render(<MenuItemRow item={{ ...baseItem, isAvailable: false }} onPress={jest.fn()} />);
    expect(screen.getByText('Sold out')).toBeOnTheScreen();
  });

  it('hides the badge when available', async () => {
    await render(<MenuItemRow item={baseItem} onPress={jest.fn()} />);
    expect(screen.queryByText('Sold out')).toBeNull();
  });

  it('has a button accessibility role and label', async () => {
    await render(<MenuItemRow item={baseItem} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Brisket, $28.00 / lb' })).toBeOnTheScreen();
  });

  it('includes sold out in the accessibility label', async () => {
    await render(<MenuItemRow item={{ ...baseItem, isAvailable: false }} onPress={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Brisket, $28.00 / lb, sold out' }),
    ).toBeOnTheScreen();
  });

  it('fires onPress with the item', async () => {
    const onPress = jest.fn();
    await render(<MenuItemRow item={baseItem} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(baseItem);
  });
});

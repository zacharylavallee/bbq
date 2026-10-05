import { act, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { mockMenu } from '../src/data/mockMenu';
import { renderRoutesWithSource, successSource } from '../test-utils';

describe('item detail screen', () => {
  it('shows details, catering tag, sold-out note, and not-found states', async () => {
    await renderRoutesWithSource(successSource, undefined, {
      initialUrl: '/item/pitmaster-package',
    });

    await waitFor(() => expect(screen.getByText('Catering')).toBeOnTheScreen());
    expect(screen.getByText('Pitmaster Package (feeds 10)')).toBeOnTheScreen();
    expect(screen.getByText('$189.00 / tray')).toBeOnTheScreen();
    expect(
      screen.getByText('Two meats, two sides, and cornbread for ten people.'),
    ).toBeOnTheScreen();

    await act(async () => {
      router.push('/item/banana-pudding');
    });
    await waitFor(() =>
      expect(screen.getByText('This item is currently sold out.')).toBeOnTheScreen(),
    );

    await act(async () => {
      router.push('/item/nope');
    });
    await waitFor(() => expect(screen.getByText('Item not found')).toBeOnTheScreen());
  });

  it('shows the menu photo on the item detail screen', async () => {
    const menu = {
      ...mockMenu,
      items: mockMenu.items.map((item) =>
        item.id === 'brisket' ? { ...item, imageUrl: 'https://photos.test/brisket.jpg' } : item,
      ),
    };
    await renderRoutesWithSource({ getMenu: jest.fn().mockResolvedValue(menu) }, undefined, {
      initialUrl: '/item/brisket',
    });
    await waitFor(() => expect(screen.getByLabelText('Brisket photo')).toBeOnTheScreen());
  });
});

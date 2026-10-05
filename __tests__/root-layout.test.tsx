import { screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import AccountScreen from '../app/(tabs)/account';
import MenuScreen from '../app/(tabs)/index';
import OrdersScreen from '../app/(tabs)/orders';
import TabsLayout from '../app/(tabs)/_layout';
import RootLayout from '../app/_layout';
import ItemScreen from '../app/item/[id]';

describe('root layout', () => {
  it('renders the app inside the real root layout', async () => {
    await renderRouter(
      {
        _layout: RootLayout,
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': MenuScreen,
        '(tabs)/orders': OrdersScreen,
        '(tabs)/account': AccountScreen,
        'item/[id]': ItemScreen,
      },
      { initialUrl: '/' },
    );
    await waitFor(() => expect(screen.getByText('Brisket')).toBeOnTheScreen());
  });
});

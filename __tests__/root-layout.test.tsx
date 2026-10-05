import { screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import AccountScreen from '../app/(tabs)/account';
import MenuScreen from '../app/(tabs)/index';
import OrdersScreen from '../app/(tabs)/orders';
import TabsLayout from '../app/(tabs)/_layout';
import RootLayout from '../app/_layout';
import ItemScreen from '../app/item/[id]';
import SignInScreen from '../app/sign-in';
import AdminLayout from '../app/(tabs)/admin/_layout';
import AdminMenuScreen from '../app/(tabs)/admin';
import AdminCategoriesScreen from '../app/(tabs)/admin/categories';
import AdminItemScreen from '../app/(tabs)/admin/items/[id]';

jest.mock('../src/lib/supabase', () => ({
  createSupabaseClient: jest.fn(() => null),
  requireSupabase: jest.fn(() => {
    throw new Error('Supabase is not configured');
  }),
  supabase: null,
}));

describe('root layout', () => {
  it('renders the app inside the real root layout', async () => {
    await renderRouter(
      {
        _layout: RootLayout,
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': MenuScreen,
        '(tabs)/orders': OrdersScreen,
        '(tabs)/account': AccountScreen,
        '(tabs)/admin/_layout': AdminLayout,
        '(tabs)/admin/index': AdminMenuScreen,
        '(tabs)/admin/categories': AdminCategoriesScreen,
        '(tabs)/admin/items/[id]': AdminItemScreen,
        'item/[id]': ItemScreen,
        'sign-in': SignInScreen,
      },
      { initialUrl: '/' },
    );
    await waitFor(() => expect(screen.getByText('Brisket')).toBeOnTheScreen());
  });
});

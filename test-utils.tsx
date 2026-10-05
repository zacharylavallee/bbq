import { Stack } from 'expo-router';
import { renderRouter, type RenderRouterOptions } from 'expo-router/testing-library';
import type { ReactElement, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SessionContext, type SessionContextValue } from './src/auth/SessionProvider';
import { MenuSourceProvider } from './src/data/MenuSourceProvider';
import { mockMenu } from './src/data/mockMenu';
import type { MenuSource } from './src/data/menuSource';

import AccountScreen from './app/(tabs)/account';
import MenuScreen from './app/(tabs)/index';
import OrdersScreen from './app/(tabs)/orders';
import TabsLayout from './app/(tabs)/_layout';
import ItemScreen from './app/item/[id]';
import SignInScreen from './app/sign-in';
import AdminLayout from './app/(tabs)/admin/_layout';
import AdminMenuScreen from './app/(tabs)/admin/index';
import AdminCategoriesScreen from './app/(tabs)/admin/categories';
import AdminItemScreen from './app/(tabs)/admin/items/[id]';

jest.mock('./src/lib/supabase', () => ({
  createSupabaseClient: jest.fn(() => null),
  requireSupabase: jest.fn(() => {
    throw new Error('Supabase is not configured');
  }),
  supabase: null,
}));

export const successSource: MenuSource = { getMenu: () => Promise.resolve(mockMenu) };

export const signedOutSession: SessionContextValue = {
  session: null,
  profile: null,
  isAdmin: false,
  isLoading: false,
  signIn: async () => null,
  signOut: async () => undefined,
};

function sessionFor(id: string, email: string): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    user: { id, email },
  } as Session;
}

export const customerSession: SessionContextValue = {
  ...signedOutSession,
  session: sessionFor('customer-id', 'customer@bbq.local'),
  profile: { id: 'customer-id', name: 'Customer', phone: null, role: 'customer' },
};

export const adminSession: SessionContextValue = {
  ...signedOutSession,
  session: sessionFor('admin-id', 'admin@bbq.local'),
  profile: { id: 'admin-id', name: 'Pitmaster', phone: null, role: 'admin' },
  isAdmin: true,
};

function testRoutes(): Record<string, () => ReactElement> {
  function TestLayout() {
    return (
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="sign-in" />
      </Stack>
    );
  }
  return {
    _layout: TestLayout,
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
  };
}

export function renderRoutesWithSource(
  source: MenuSource,
  session: SessionContextValue = signedOutSession,
  options: RenderRouterOptions = {},
) {
  function TestProviders({ children }: { children: ReactNode }) {
    return (
      <SessionContext.Provider value={session}>
        <MenuSourceProvider source={source}>{children}</MenuSourceProvider>
      </SessionContext.Provider>
    );
  }

  return renderRouter(testRoutes(), {
    ...options,
    wrapper: TestProviders,
  });
}

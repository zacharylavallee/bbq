import { Slot } from 'expo-router';
import type { ReactElement } from 'react';
import { MenuSourceProvider } from './src/data/MenuSourceProvider';
import { mockMenu } from './src/data/mockMenu';
import type { MenuSource } from './src/data/menuSource';

import AccountScreen from './app/(tabs)/account';
import MenuScreen from './app/(tabs)/index';
import OrdersScreen from './app/(tabs)/orders';
import TabsLayout from './app/(tabs)/_layout';
import ItemScreen from './app/item/[id]';

export const successSource: MenuSource = { getMenu: () => Promise.resolve(mockMenu) };

export function routesWithSource(source: MenuSource): Record<string, () => ReactElement> {
  function TestLayout() {
    return (
      <MenuSourceProvider source={source}>
        <Slot />
      </MenuSourceProvider>
    );
  }
  return {
    _layout: TestLayout,
    '(tabs)/_layout': TabsLayout,
    '(tabs)/index': MenuScreen,
    '(tabs)/orders': OrdersScreen,
    '(tabs)/account': AccountScreen,
    'item/[id]': ItemScreen,
  };
}

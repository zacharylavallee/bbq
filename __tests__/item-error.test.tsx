import { screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { MenuSource } from '../src/data/menuSource';
import { routesWithSource } from '../test-utils';

describe('item detail error state', () => {
  it('shows an error when the menu fails to load', async () => {
    const source: MenuSource = { getMenu: () => Promise.reject(new Error('offline')) };
    await renderRouter(routesWithSource(source), { initialUrl: '/item/brisket' });
    await waitFor(() => expect(screen.getByText("Couldn't load the menu.")).toBeOnTheScreen());
  });
});

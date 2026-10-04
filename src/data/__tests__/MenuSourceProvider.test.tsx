import { render, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { MenuSourceProvider, useMenuSource } from '../MenuSourceProvider';
import { mockMenuSource } from '../mockMenu';
import type { MenuSource } from '../menuSource';

describe('MenuSourceProvider', () => {
  it('provides a custom source to children', async () => {
    const source: MenuSource = { getMenu: jest.fn() };
    const { result } = await renderHook(() => useMenuSource(), {
      wrapper: ({ children }) => (
        <MenuSourceProvider source={source}>{children}</MenuSourceProvider>
      ),
    });
    expect(result.current).toBe(source);
  });

  it('defaults to the mock source', async () => {
    const { result } = await renderHook(() => useMenuSource(), {
      wrapper: ({ children }) => <MenuSourceProvider>{children}</MenuSourceProvider>,
    });
    expect(result.current).toBe(mockMenuSource);
  });

  it('provides the mock source without a provider', async () => {
    const { result } = await renderHook(() => useMenuSource());
    expect(result.current).toBe(mockMenuSource);
  });

  it('renders children', async () => {
    await render(
      <MenuSourceProvider>
        <Text>child content</Text>
      </MenuSourceProvider>,
    );
    expect(screen.getByText('child content')).toBeOnTheScreen();
  });
});

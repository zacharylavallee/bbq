import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  MenuSourceProvider,
  useInvalidateMenu,
  useMenuSource,
  useMenuVersion,
} from '../MenuSourceProvider';
import { defaultMenuSource } from '../defaultMenuSource';
import type { MenuSource } from '../menuSource';

jest.mock('../../lib/supabase', () => ({
  supabase: null,
}));

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
    expect(result.current).toBe(defaultMenuSource);
  });

  it('provides the mock source without a provider', async () => {
    const { result } = await renderHook(() => useMenuSource());
    expect(result.current).toBe(defaultMenuSource);
  });

  it('provides a no-op invalidation callback without a provider', async () => {
    const { result } = await renderHook(() => useInvalidateMenu());
    expect(() => result.current()).not.toThrow();
  });

  it('renders children', async () => {
    await render(
      <MenuSourceProvider>
        <Text>child content</Text>
      </MenuSourceProvider>,
    );
    expect(screen.getByText('child content')).toBeOnTheScreen();
  });

  it('increments the shared version when invalidated', async () => {
    function ReadVersion() {
      const version = useMenuVersion();
      const invalidate = useInvalidateMenu();
      return <Text onPress={invalidate}>{version}</Text>;
    }

    const { getByText } = await render(
      <MenuSourceProvider>
        <ReadVersion />
      </MenuSourceProvider>,
    );
    expect(getByText('0')).toBeOnTheScreen();
    await fireEvent.press(getByText('0'));
    expect(getByText('1')).toBeOnTheScreen();
  });
});

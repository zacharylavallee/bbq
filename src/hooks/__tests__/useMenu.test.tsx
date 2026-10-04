import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useMenu } from '../useMenu';
import { mockMenu } from '../../data/mockMenu';
import type { MenuSource } from '../../data/menuSource';

describe('useMenu', () => {
  it('starts loading and becomes ready', async () => {
    let resolveMenu: (value: typeof mockMenu) => void = () => undefined;
    const source: MenuSource = {
      getMenu: () =>
        new Promise((resolve) => {
          resolveMenu = resolve;
        }),
    };
    const { result } = await renderHook(() => useMenu(source));
    expect(result.current.status).toBe('loading');
    await act(async () => {
      resolveMenu(mockMenu);
    });
    expect(result.current.status).toBe('ready');
  });

  it('serves the cached menu synchronously on remount', async () => {
    const getMenu = jest.fn().mockResolvedValue(mockMenu);
    const source: MenuSource = { getMenu };
    const first = await renderHook(() => useMenu(source));
    expect(first.result.current.status).toBe('ready');
    const second = await renderHook(() => useMenu(source));
    expect(second.result.current.status).toBe('ready');
    expect(getMenu).toHaveBeenCalledTimes(2);
    if (second.result.current.status === 'ready') {
      expect(second.result.current.menu).toBe(mockMenu);
    }
  });

  it('goes from loading to ready', async () => {
    const { result } = await renderHook(() => useMenu());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status === 'ready') {
      expect(result.current.menu).toBe(mockMenu);
    }
  });

  it('goes from loading to error on Error rejection', async () => {
    const failure = new Error('boom');
    const source: MenuSource = { getMenu: () => Promise.reject(failure) };
    const { result } = await renderHook(() => useMenu(source));
    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status === 'error') {
      expect(result.current.error).toBe(failure);
    }
  });

  it('normalizes non-Error rejections to Error', async () => {
    const source: MenuSource = { getMenu: () => Promise.reject('string failure') };
    const { result } = await renderHook(() => useMenu(source));
    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status === 'error') {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error.message).toBe('string failure');
    }
  });

  it('reload refetches the menu', async () => {
    let resolveMenu: (value: typeof mockMenu) => void = () => undefined;
    const getMenu = jest
      .fn<ReturnType<MenuSource['getMenu']>, []>()
      .mockRejectedValueOnce(new Error('first'))
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMenu = resolve;
          }),
      );
    const source: MenuSource = { getMenu };
    const { result } = await renderHook(() => useMenu(source));
    await waitFor(() => expect(result.current.status).toBe('error'));
    await act(async () => {
      result.current.reload();
    });
    expect(result.current.status).toBe('loading');
    await act(async () => {
      resolveMenu(mockMenu);
    });
    expect(result.current.status).toBe('ready');
    expect(getMenu).toHaveBeenCalledTimes(2);
  });

  it('does not update state after unmount', async () => {
    let resolveMenu: (value: typeof mockMenu) => void = () => undefined;
    const source: MenuSource = {
      getMenu: () =>
        new Promise((resolve) => {
          resolveMenu = resolve;
        }),
    };
    const { result, unmount } = await renderHook(() => useMenu(source));
    expect(result.current.status).toBe('loading');
    unmount();
    await act(async () => {
      resolveMenu(mockMenu);
    });
  });

  it('rejects silently after unmount without errors', async () => {
    let rejectMenu: (reason: unknown) => void = () => undefined;
    const source: MenuSource = {
      getMenu: () =>
        new Promise((_, reject) => {
          rejectMenu = reject;
        }),
    };
    const { unmount } = await renderHook(() => useMenu(source));
    unmount();
    await act(async () => {
      rejectMenu(new Error('late'));
    });
  });
});

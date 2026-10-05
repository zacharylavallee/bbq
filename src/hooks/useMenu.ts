import { useCallback, useEffect, useState } from 'react';
import { defaultMenuSource } from '../data/defaultMenuSource';
import type { MenuSource } from '../data/menuSource';
import type { Menu } from '../types/menu';

export type MenuState =
  { status: 'loading' } | { status: 'ready'; menu: Menu } | { status: 'error'; error: Error };

const menuCache = new WeakMap<MenuSource, Menu>();

export function useMenu(
  source: MenuSource = defaultMenuSource,
  version = 0,
): MenuState & {
  reload: () => void;
} {
  const [requestId, setRequestId] = useState(0);
  const [result, setResult] = useState<{
    requestId: number;
    source: MenuSource;
    state: MenuState;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const settle = (next: MenuState) => {
      if (!cancelled) {
        setResult({ requestId, source, state: next });
      }
    };
    source.getMenu().then(
      (menu) => {
        menuCache.set(source, menu);
        settle({ status: 'ready', menu });
      },
      (reason: unknown) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        settle({ status: 'error', error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source, requestId, version]);

  const cached = menuCache.get(source);
  const state: MenuState =
    result && result.requestId === requestId && result.source === source
      ? result.state
      : cached
        ? { status: 'ready', menu: cached }
        : { status: 'loading' };

  const reload = useCallback(() => {
    menuCache.delete(source);
    setResult(null);
    setRequestId((id) => id + 1);
  }, [source]);

  return { ...state, reload };
}

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { defaultMenuSource } from './defaultMenuSource';
import type { MenuSource } from './menuSource';

interface MenuSourceContextValue {
  source: MenuSource;
  version: number;
  invalidate: () => void;
}

const MenuSourceContext = createContext<MenuSourceContextValue>({
  source: defaultMenuSource,
  version: 0,
  invalidate: () => undefined,
});

export function MenuSourceProvider({
  source = defaultMenuSource,
  children,
}: {
  source?: MenuSource;
  children: ReactNode;
}) {
  const [version, setVersion] = useState(0);
  const invalidate = useCallback(() => setVersion((value) => value + 1), []);
  const value = useMemo(() => ({ source, version, invalidate }), [source, version, invalidate]);
  return <MenuSourceContext.Provider value={value}>{children}</MenuSourceContext.Provider>;
}

export function useMenuSource(): MenuSource {
  return useContext(MenuSourceContext).source;
}

export function useMenuVersion(): number {
  return useContext(MenuSourceContext).version;
}

export function useInvalidateMenu(): () => void {
  return useContext(MenuSourceContext).invalidate;
}

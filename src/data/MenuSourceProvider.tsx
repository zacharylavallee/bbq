import { createContext, useContext, type ReactNode } from 'react';
import { mockMenuSource } from './mockMenu';
import type { MenuSource } from './menuSource';

const MenuSourceContext = createContext<MenuSource>(mockMenuSource);

export function MenuSourceProvider({
  source = mockMenuSource,
  children,
}: {
  source?: MenuSource;
  children: ReactNode;
}) {
  return <MenuSourceContext.Provider value={source}>{children}</MenuSourceContext.Provider>;
}

export function useMenuSource(): MenuSource {
  return useContext(MenuSourceContext);
}

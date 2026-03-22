'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

type DocsSidebarTreeQueryContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const DocsSidebarTreeQueryContext = createContext<DocsSidebarTreeQueryContextValue | null>(null);

export function DocsSidebarTreeQueryProvider({
  value,
  children,
}: {
  value: DocsSidebarTreeQueryContextValue;
  children: ReactNode;
}) {
  return (
    <DocsSidebarTreeQueryContext.Provider value={value}>
      {children}
    </DocsSidebarTreeQueryContext.Provider>
  );
}

export function useDocsSidebarTreeQuery() {
  const context = useContext(DocsSidebarTreeQueryContext);
  if (!context) {
    return {
      query: '',
      setQuery: () => undefined,
    };
  }
  return context;
}

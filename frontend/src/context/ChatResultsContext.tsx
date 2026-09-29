// Holds the products the chat assistant most recently matched, so the website
// (the Products page) can update to show exactly those items. This is the bridge
// between the chat widget and the page: the widget writes matches here, the
// Products page reads them.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductSummary } from "../types";

interface ChatResultsValue {
  products: ProductSummary[];
  query: string;
  active: boolean; // true when the page should show chat matches instead of the full catalogue
  setResults: (products: ProductSummary[], query: string) => void;
  clear: () => void;
}

const ChatResultsContext = createContext<ChatResultsValue | undefined>(undefined);

export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);

  const setResults = useCallback((next: ProductSummary[], q: string) => {
    setProducts(next);
    setQuery(q);
    setActive(true);
  }, []);

  const clear = useCallback(() => {
    setProducts([]);
    setQuery("");
    setActive(false);
  }, []);

  const value = useMemo<ChatResultsValue>(
    () => ({ products, query, active, setResults, clear }),
    [products, query, active, setResults, clear],
  );

  return (
    <ChatResultsContext.Provider value={value}>
      {children}
    </ChatResultsContext.Provider>
  );
}

export function useChatResults(): ChatResultsValue {
  const ctx = useContext(ChatResultsContext);
  if (!ctx)
    throw new Error("useChatResults must be used within a ChatResultsProvider");
  return ctx;
}

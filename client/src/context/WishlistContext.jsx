import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Saved pieces live in this browser, so shoppers can save without signing in.
const KEY = "hush_wishlist";
const WishlistContext = createContext(null);

function read() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      // storage full or blocked: the list still works for this visit
    }
  }, [ids]);

  // keep several open tabs in step
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setIds(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((id) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id) => setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [id, ...list])),
    []
  );
  const remove = useCallback((id) => setIds((list) => list.filter((x) => x !== id)), []);

  return <WishlistContext.Provider value={{ ids, has, toggle, remove }}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { api } from "../api/client";

// Caches every product we've fetched (from the paginated list or by id) so
// product detail pages can reuse them without re-fetching.
const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const cache = useRef(new Map());
  const [version, setVersion] = useState(0);

  const fetchPage = useCallback(async (page = 1) => {
    const res = await api.getProducts(page);
    const { products, totalPages, currentPage } = res.data;
    products.forEach((p) => cache.current.set(p._id, p));
    setVersion((v) => v + 1);
    return { products, totalPages, currentPage };
  }, []);

  const getById = useCallback(
    async (id) => {
      if (cache.current.has(id)) return cache.current.get(id);
      try {
        const { data } = await api.getProduct(id);
        cache.current.set(data.product._id, data.product);
        setVersion((v) => v + 1);
        return data.product;
      } catch {
        return null;
      }
    },
    []
  );

  return (
    <ProductsContext.Provider value={{ fetchPage, getById, cacheVersion: version }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}

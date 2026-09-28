const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function getToken() {
  return localStorage.getItem("hush_token");
}

async function request(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (networkErr) {
    throw new Error(
      `Could not reach the backend at ${BASE_URL}. Is the server running? (${networkErr.message})`
    );
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const message =
      (data && Array.isArray(data.errors) && data.errors.join(", ")) ||
      (data && Array.isArray(data.message) && data.message.map((m) => m.message || m).join(", ")) ||
      (data && data.message) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: () => request("/auth/me"),

  getProducts: (page = 1) => request(`/products?page=${page}`),
  getProduct: (id) => request(`/products/${id}`),
  getSellerProducts: (page = 1) => request(`/products/seller?page=${page}`),
  createProduct: (formData) => request("/products/create", { method: "POST", body: formData, isFormData: true }),
  updateProduct: (id, formData) => request(`/products/update/${id}`, { method: "PATCH", body: formData, isFormData: true }),
  togglePublish: (id) => request(`/products/publish/${id}`, { method: "PATCH" }),
  deleteImage: (id, imageId) => request(`/products/image/${id}/${imageId}`, { method: "DELETE" }),

  getCart: () => request("/cart"),
  addToCart: (productId, size, quantity = 1) =>
    request(`/cart/add/product/${productId}`, { method: "POST", body: { size, quantity } }),
  removeFromCart: (productId, size, quantity = 1) =>
    request(`/cart/remove/product/${productId}`, { method: "DELETE", body: { size, quantity } }),

  createOrder: (address) => request("/orders", { method: "POST", body: { address } }),
  getOrders: () => request("/orders"),
  cancelOrder: (orderId) => request(`/orders/cancel/${orderId}`, { method: "PATCH" }),
};

export function setToken(token) {
  if (token) localStorage.setItem("hush_token", token);
  else localStorage.removeItem("hush_token");
}

export function hasToken() {
  return Boolean(getToken());
}

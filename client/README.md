# HUSH — Frontend

A React (Vite) storefront for the HUSH fashion backend, matching the provided
UI mockups: home, product listing, product detail, cart & checkout, and
authentication/profile with orders.

## Setup

```bash
npm install
cp .env.example .env   # edit VITE_API_BASE_URL if your backend isn't on :3000
npm run dev
```

The app expects the backend (`server/`, `npm start`) running on port 3000.
`VITE_API_BASE_URL` defaults to `/api`, which the Vite dev server proxies to
`http://localhost:3000` (see `vite.config.js`), so no CORS setup is needed in
development.

## What's wired up to the real API

- **Auth** — register, login, `GET /api/auth/me` (JWT stored in
  `localStorage`, sent as `Authorization: Bearer <token>`; tokens expire
  after 7 days).
- **Products** — `GET /api/products` (paginated). The Shop page walks every
  page once, then filters/sorts/searches client-side, because the backend
  doesn't support query-string filters.
- **Product detail** — `GET /api/products/:id`, cached in `ProductsContext`.
- **Cart** — `GET /api/cart`, add/remove via
  `POST /cart/add/product/:id` and `DELETE /cart/remove/product/:id`.
- **Checkout/Orders** — `POST /api/orders`, `GET /api/orders` and
  `PATCH /api/orders/cancel/:id`.

## Design notes

- Palette, type (Archivo for display / Inter for body) and layout follow the
  provided HUSH mockups. Hero/category imagery is CSS-only (no stock photos
  bundled), since the backend has no CMS/banner content — swap in real
  photography via the `images` array pattern already used for products.
- Wishlist, saved addresses and account settings are UI-only placeholders:
  the backend doesn't have endpoints for them yet.

## Structure

```
src/
  api/client.js          fetch wrapper + typed API calls
  context/                Auth, Cart, Products (React Context)
  components/              Navbar, Footer, ProductCard
  pages/                   Home, Shop, ProductDetail, Cart, Checkout,
                           Login, Register, Profile, About, Contact
```

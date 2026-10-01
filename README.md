# HUSH

Menswear store: a React storefront (`client/`) and an Express + MongoDB API
(`server/`) with Razorpay checkout and ImageKit product photos.

## Run locally

```bash
cp server/.env.example server/.env    # fill in the values
npm install --prefix server
npm install --prefix client
npm run dev --prefix server           # API on http://localhost:3000
npm run dev --prefix client           # shop on http://localhost:5173
```

## Accounts

Customers create their own accounts on the site. Seller accounts can only be
made from the command line:

```bash
npm run create-seller -- --email you@example.com --name "HUSH Studio"
```

A strong password is generated and printed once; change it after signing in
(My account → Settings). The seller manages products, orders and messages at
`/seller`.

To wipe test data before launch (keeps only the accounts you name and writes a
backup to `server/backups/` first):

```bash
npm run reset-store -- --keep you@example.com          # dry run
npm run reset-store -- --keep you@example.com --yes    # delete
```

## Deploy

### Option A: one service on Render (simplest)

The server serves the built client, so one web service runs the whole shop.
`render.yaml` describes it:

1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → choose the repo.
3. Enter the five secrets it asks for (`MONGODB_URI`, `JWT_SECRET`,
   `IMAGEKIT_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and apply.

Setting it up by hand instead (New → Web Service) uses the same values:
build command `npm run build`, start command `npm start`, health check path
`/api/health`, plus `NODE_ENV=production`. Leave `CLIENT_URL` empty.

After the first deploy, open the service's logs and load the site once: each
request line should start with your own public IP. If it shows a `10.x.x.x`
address instead, set `TRUST_PROXY` to the number of proxies in front of the
app (Render: 3) so rate limits apply per visitor.

### Option B: client and API on separate hosts

- API (e.g. Render): root directory `server`, build `npm ci`, start
  `npm start`, set `CLIENT_URL` to the client's URL (e.g.
  `https://hush.vercel.app`).
- Client (e.g. Vercel): root directory `client`, build `npm run build`,
  output `dist`, and set `VITE_API_BASE_URL` to the API URL ending in `/api`.
  `client/vercel.json` already routes every page to the app.

### Before going live

- MongoDB Atlas → Network Access: allow your host's outbound IPs
  (Render lists them under the service's **Connect → Outbound**), or
  `0.0.0.0/0`.
- Use a fresh, long `JWT_SECRET` in production.
- Razorpay: switch from `rzp_test_` to live keys once your account is
  activated. Checkout, refunds and stock holds work the same in both modes.
- The API keeps rate limits and the unpaid-checkout sweeper in memory, so run
  a single instance.

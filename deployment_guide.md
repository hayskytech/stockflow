# Deployment Guide — cPanel

## Domain layout

- `southcenter.in` — separate static site, not touched here.
- `wholesale.southcenter.in` — StockFlow app. Single subdomain, split by path:
  - `/` → frontend static build (served directly by Apache/LiteSpeed)
  - `/api` → backend Node app (proxied via cPanel Node.js Selector)

Same-origin, so no CORS/cookie cross-subdomain headaches, and matches what the code already assumes (`vite.config.js` proxy comment: "in production the frontend and API share an origin"). No code changes needed.

## 1. Create the subdomain

cPanel → **Domains** → create subdomain `wholesale.southcenter.in`, document root e.g. `wholesale.southcenter.in`.

## 2. Build locally

```bash
# frontend
cd frontend
echo "VITE_API_URL=https://wholesale.southcenter.in/api" > .env.production
npm run build          # → frontend/dist
```

Backend needs no build step (plain Node/JS), just upload source + install deps on the server.

## 3. Upload — which folders

| Local | Upload to |
|---|---|
| `frontend/dist/*` (contents, not the folder itself) | `~/wholesale.southcenter.in/` (subdomain doc root) |
| `backend/src`, `backend/package.json`, `backend/package-lock.json` | e.g. `~/stockflow-backend/` (**outside** public web root, e.g. sibling of `wholesale.southcenter.in`) |
| `backend/uploads` | same backend app folder, keep writable |

Do **not** upload `node_modules` from either side — install fresh on the server. Do not upload `.env` via File Manager if avoidable — create it directly on the server (see step 5).

## 4. Set up the Node app (backend)

cPanel → **Setup Node.js App** → Create:
- Node version: match your dev version
- Application mode: Production
- Application root: `stockflow-backend` (the folder from step 3)
- Application URL: `wholesale.southcenter.in` with path `/api`
- Application startup file: `src/index.js`

Create the app, then use its "Run NPM Install" button (installs into the app root using cPanel's bundled Node/npm — do this from the Node app UI, not a stray SSH node version).

## 5. Backend `.env`

Create `~/stockflow-backend/.env` (via File Manager or terminal), based on `.env.example`:

```
NODE_ENV=production
APP_PORT=<whatever the Node Selector assigned/expects — check the app's "Detected configuration">
FRONTEND_URL=https://wholesale.southcenter.in
DB_HOST=127.0.0.1
DB_NAME=<cpanel db name>
DB_USER=<cpanel db user>
DB_PASSWORD=<...>
JWT_ACCESS_SECRET=<generate strong random>
JWT_REFRESH_SECRET=<generate strong random>
CORS_ALLOWED_ORIGINS=https://wholesale.southcenter.in
MEDIA_UPLOAD_DIR=uploads/media
MEDIA_PUBLIC_PATH=/media-files
```

Note: `npm start` runs with `--env-file=.env`, so the `.env` file must sit in the app root next to `package.json`.

## 6. Database

Create the MySQL DB + user in cPanel → **MySQL Databases**, assign user to DB with full privileges. Import schema via **phpMyAdmin** (`database/` folder in repo has the schema/migrations — import in order).

## 7. Media uploads path

`/media-files` on the same subdomain is served by Express as static files (see `app.js`) — since backend is mounted at `/api`, requests to `wholesale.southcenter.in/media-files/...` won't reach it unless the Node app URL path also covers it. Two options:
- Simplest: change `MEDIA_PUBLIC_PATH` to `/api/media-files` in `.env` (no code change, since it's just a mount path) so it falls under the same `/api` proxy.
- Frontend already builds URLs from what the API returns, so as long as `MEDIA_PUBLIC_PATH` is consistent between what's stored/returned and what's proxied, images will resolve.

## 8. Restart & verify

- Node Selector → **Restart** the app after any `.env` or code change.
- Hit `https://wholesale.southcenter.in/api/...` (a known GET route) to confirm the API proxy works.
- Hit `https://wholesale.southcenter.in/` to confirm the SPA loads and routes client-side (check `.htaccess` in doc root — if deep-linking to routes like `/store/orders` 404s, add an SPA fallback rewrite to `index.html`).

## Updates later

- Frontend: rebuild, re-upload `dist/*` contents, overwrite.
- Backend: re-upload changed `src/` files (or the whole folder), run NPM install again only if `package.json` changed, restart the Node app.

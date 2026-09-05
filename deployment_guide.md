# Deployment Guide — cPanel

Placeholders used throughout — substitute your own values:

| Placeholder | Meaning |
|---|---|
| `<app-domain>` | The (sub)domain that hosts StockFlow, e.g. `app.example.com` |
| `<cpanel-user>` | The cPanel account username |
| `<cpanel-api-host>` | The real cPanel server hostname:port for the API/CGI endpoint (not the vanity domain), e.g. `server123.provider.example.net:2083` |
| `<ftp-server-id>` | The name of the "Publish over FTP" server entry configured in Jenkins |

## Domain layout

StockFlow runs on a single (sub)domain, `<app-domain>`, split by path:

- `/` → frontend static build (served directly by Apache/LiteSpeed)
- `/api` → backend Node app (proxied via cPanel Node.js Selector)

Same-origin, so no CORS/cookie cross-subdomain headaches, and matches what the code already assumes (`vite.config.js` proxy comment: "in production the frontend and API share an origin"). No code changes needed.

## 1. Create the (sub)domain

cPanel → **Domains** → create `<app-domain>`, document root e.g. `<app-domain>`.

## 2. Build locally

```bash
# frontend
cd frontend
echo "VITE_API_URL=https://<app-domain>/api" > .env.production
npm run build          # → frontend/dist
```

Backend needs no build step (plain Node/JS), just upload source + install deps on the server.

## 3. Upload — which folders

| Local | Upload to |
|---|---|
| `frontend/dist/*` (contents, not the folder itself) | `~/<app-domain>/` (subdomain doc root) |
| `backend/src`, `backend/package.json`, `backend/package-lock.json` | `~/<app-domain>/api/` (**nested inside** the frontend doc root, not a sibling folder) |
| `backend/uploads` | same backend app folder, keep writable |

Do **not** upload `node_modules` from either side — install fresh on the server. Do not upload `.env` via File Manager if avoidable — create it directly on the server (see step 5).

The backend's Application root is nested inside the public doc root (`<app-domain>/api`) rather than a sibling directory. cPanel's Node.js Selector writes a `.htaccess` into that path when the app is created, which is what makes it proxy to Node instead of serving files statically — **verify this once** by hitting `https://<app-domain>/api/package.json` in a browser after setup; if it returns raw JSON instead of a 404/proxied response, source files are being served directly and that needs fixing before going live.

## 4. Set up the Node app (backend)

cPanel → **Setup Node.js App** → Create:
- Node version: match your dev version
- Application mode: Production
- Application root: `<app-domain>/api` (the folder from step 3, relative to the account home)
- Application URL: `<app-domain>` with path `/api`
- Application startup file: `src/index.js`

Create the app, then use its "Run NPM Install" button (installs into the app root using cPanel's bundled Node/npm — do this from the Node app UI, not a stray SSH node version).

## 5. Backend `.env`

Create `~/<app-domain>/api/.env` (via File Manager or terminal), based on `.env.example`:

```
NODE_ENV=production
APP_PORT=<whatever the Node Selector assigned/expects — check the app's "Detected configuration">
FRONTEND_URL=https://<app-domain>
DB_HOST=127.0.0.1
DB_NAME=<cpanel db name>
DB_USER=<cpanel db user>
DB_PASSWORD=<...>
JWT_ACCESS_SECRET=<generate strong random>
JWT_REFRESH_SECRET=<generate strong random>
CORS_ALLOWED_ORIGINS=https://<app-domain>
MEDIA_UPLOAD_DIR=uploads/media
MEDIA_PUBLIC_PATH=/media-files
```

Note: `npm start` runs with `--env-file=.env`, so the `.env` file must sit in the app root next to `package.json`.

## 6. Database

Create the MySQL DB + user in cPanel → **MySQL Databases**, assign user to DB with full privileges. Import schema via **phpMyAdmin** (`database/` folder in repo has the schema/migrations — import in order).

## 7. Media uploads path

`/media-files` on the same subdomain is served by Express as static files (see `app.js`) — since backend is mounted at `/api`, requests to `<app-domain>/media-files/...` won't reach it unless the Node app URL path also covers it. Two options:
- Simplest: change `MEDIA_PUBLIC_PATH` to `/api/media-files` in `.env` (no code change, since it's just a mount path) so it falls under the same `/api` proxy.
- Frontend already builds URLs from what the API returns, so as long as `MEDIA_PUBLIC_PATH` is consistent between what's stored/returned and what's proxied, images will resolve.

## 8. Restart & verify

- Node Selector → **Restart** the app after any `.env` or code change.
- Hit `https://<app-domain>/api/...` (a known GET route) to confirm the API proxy works.
- Hit `https://<app-domain>/` to confirm the SPA loads and routes client-side. The app uses hash routing (`/#/b/:businessId/...`), so no `.htaccess` SPA fallback rewrite is needed — deep links and reloads always hit `index.html` since everything after `#` is client-only.

## Updates later

- Frontend: rebuild, re-upload `dist/*` contents, overwrite.
- Backend: re-upload changed `src/` files (or the whole folder), run NPM install again only if `package.json` changed, restart the Node app.

## CI/CD — Jenkins pipeline

`Jenkinsfile` (repo root) automates the steps above: build frontend → FTP-upload `frontend/dist` →
FTP-upload `backend/src` + manifest → SSH in and `npm install` inside cPanel's per-app nodevenv →
restart the Node app via the cPanel API. It's manual-trigger only ("Build Now") — no webhook, so a
deploy never happens without someone deliberately starting it. It never touches `.env` or
`backend/uploads/` — those stay server-only.

Every environment-specific value is a **build parameter** (see the header comment block in the
`Jenkinsfile` for the full list). The job is run via "Build with Parameters"; nothing about a
particular hosting account is hard-coded in the pipeline. The parameters an operator fills in:

| Parameter | Value for this deployment |
|---|---|
| `VITE_API_URL` | `https://<app-domain>/api` |
| `FTP_SERVER_ID` | `<ftp-server-id>` (the Jenkins "Publish over FTP" entry name) |
| `FRONTEND_REMOTE_DIR` | `<app-domain>` |
| `BACKEND_REMOTE_DIR` | `<app-domain>/api` |
| `CPANEL_SSH_HOST` | the host that accepts SSH for this account |
| `CPANEL_SSH_PORT` | the SSH port (often non-standard on shared hosting) |
| `CPANEL_USER` | `<cpanel-user>` |
| `CPANEL_API_HOST` | `<cpanel-api-host>` |
| `CPANEL_APP_NAME` | `<app-domain>/api` |
| `NODE_VERSION` | the Node major version selected in Setup Node.js App |

The Jenkins controller/agent runs on Windows directly, so the Jenkinsfile uses `bat`/`powershell`
steps instead of `sh`. It needs `node`/`npm` on PATH for the build, and either the Windows OpenSSH
Client feature or Git for Windows (both provide `ssh.exe`) on PATH for the deploy step — check with
`where ssh` from a Jenkins "Execute Windows batch command" test build if unsure. `curl` isn't
required; the restart stage uses PowerShell's `Invoke-RestMethod` instead.

### One-time Jenkins setup

1. Install plugins: **Publish Over FTP**. (SSH auth uses the `sshUserPrivateKey` credential binding,
   which comes from the SSH Credentials + Credentials Binding plugins — both included in Jenkins'
   default plugin set, so no separate SSH plugin install should be needed.)
2. **Manage Jenkins → System → Publish over FTP** — add a server entry whose name you will pass as
   the `FTP_SERVER_ID` parameter (must match exactly): cPanel FTP hostname + an FTP account's
   username/password. Leave its "Remote Directory" **blank** — the Jenkinsfile passes the full
   per-stage path (from `FRONTEND_REMOTE_DIR` / `BACKEND_REMOTE_DIR`) relative to the FTP home.
3. **Manage Jenkins → Credentials** — add (referenced by id, not parameterised):
   - `cpanel-ssh-key` — "SSH Username with private key", for the user you pass as `CPANEL_USER`. If
     the key has a passphrase, the Jenkinsfile's `withCredentials` block also needs a
     `passphraseVariable` added — it currently assumes a passphrase-less key.
   - `cpanel-api-token` — "Secret text", the token from step 5 below.
4. cPanel → **Security → SSH Access → Manage SSH Keys** — generate or import a key pair, authorize
   the public key, and note the cPanel username — pass it as the `CPANEL_USER` parameter and use
   the matching private key for the `cpanel-ssh-key` credential.
5. cPanel → **Security → Manage API Tokens** — create a token, put it in the `cpanel-api-token`
   credential. Confirm the `NodeJSSelector::restart_app` parameter name and expected `app_name` value
   for a nested app root, for your cPanel version (Manage → API Shell, or api.docs.cpanel.net) before
   trusting the restart stage in production — it's assumed to be `app_name=<app-domain>/api`
   (the `CPANEL_APP_NAME` parameter) but that's worth double-checking once against your account.
6. Double-check the remaining parameters against your account before the first real deploy:
   `CPANEL_SSH_HOST` (confirm it actually accepts SSH for this account), `CPANEL_SSH_PORT` (many
   shared cPanel hosts use a non-standard port, not 22), `CPANEL_API_HOST` (the real cPanel server
   hostname:port, `<cpanel-api-host>`, found via browser DevTools — not the vanity domain), and
   `NODE_VERSION` (must match what's selected in Setup Node.js App).
7. Create the Jenkins pipeline job pointing at this repo, using this `Jenkinsfile`. Run it manually
   once end-to-end ("Build with Parameters") before trusting it for routine deploys.

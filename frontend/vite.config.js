import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  // Where the dev server forwards API traffic. VITE_API_URL is root-relative (/api) so the app
  // works from any host, which leaves nothing to derive the backend from — hence the explicit
  // VITE_DEV_BACKEND_ORIGIN, falling back to stripping /api off an absolute VITE_API_URL.
  const backendOrigin =
    env.VITE_DEV_BACKEND_ORIGIN ||
    (env.VITE_API_URL ?? "").replace(/\/api\/?$/, "") ||
    "http://localhost:4000"

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Listen on every interface (not just localhost) so the dev server is reachable at the
      // machine's LAN IP from another device on the same network.
      host: true,
      proxy: {
        // The app calls the API at the root-relative /api, which the dev server forwards to the
        // backend. This keeps every request same-origin, so opening the app at a LAN IP needs no
        // per-machine API URL and triggers no CORS preflight — mirroring production, where the
        // frontend and API already share an origin.
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
        },
        // Uploaded media is served by the backend as static files under /media-files, and the
        // media API returns root-relative URLs (/media-files/ab/cd/<hash>.webp). Forward that
        // path to the backend so <img src="/media-files/..."> resolves during local dev — in
        // production the frontend and API share an origin, so the relative URL already works.
        "/media-files": {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  }
})

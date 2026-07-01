import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  // Backend origin, derived from the API URL by stripping the trailing /api.
  const backendOrigin = (env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/api\/?$/, "")

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
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

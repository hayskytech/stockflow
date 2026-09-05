import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Providers } from "@/app/providers"
import { App } from "./App"
import "@uppy/core/css/style.min.css"
import "@uppy/dashboard/css/style.min.css"
import "./index.css"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element #root not found in index.html")

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
)

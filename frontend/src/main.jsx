import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Providers } from "@/app/providers"
import { App } from "./App"
import "@uppy/core/css/style.min.css"
import "@uppy/dashboard/css/style.min.css"
import "./index.css"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element #root not found in index.html")

// One-time cleanup: barcode scan sessions from before the barcode concept was removed —
// dead keys otherwise left sitting in operators' browsers indefinitely.
localStorage.removeItem("stockflow-scan-session")
localStorage.removeItem("stockflow-dispatch-scan-session")

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
)

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ENV } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { catalogRouter } from "./modules/catalog/catalog.router.js";
import { dispatchesRouter } from "./modules/dispatches/dispatches.router.js";
import { heroSlidesRouter } from "./modules/heroSlides/heroSlides.router.js";
import { mediaRouter } from "./modules/media/media.router.js";
import { noticeRouter } from "./modules/notice/notice.router.js";
import { ordersRouter } from "./modules/orders/orders.router.js";
import { productsRouter } from "./modules/products/products.router.js";
import { reportsRouter } from "./modules/reports/reports.router.js";
import { settingsRouter } from "./modules/settings/settings.router.js";
import { sizesRouter } from "./modules/sizes/sizes.router.js";
import { stockRouter } from "./modules/stock/stock.router.js";
import { stockLedgerRouter } from "./modules/stockLedger/stockLedger.router.js";
import { adminSessionsRouter, usersRouter } from "./modules/users/users.router.js";
import { warehouseRouter } from "./modules/warehouse/warehouse.router.js";

const app = express();

app.set("trust proxy", 1);

const CORS_ALLOWED_ORIGINS = ENV.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim());

// Loopback + RFC1918 private ranges. A dev machine's LAN IP changes with the network, so it can
// never be pinned in CORS_ALLOWED_ORIGINS — outside production any private origin is accepted so
// the app can be opened from a phone or another machine on the same wifi.
const PRIVATE_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

/** Decides whether one request Origin may read responses from this API. */
function isOriginAllowed(origin) {
  if (!origin) return true; // non-browser clients (curl, server-to-server) send no Origin header
  if (CORS_ALLOWED_ORIGINS.includes(origin)) return true;
  return ENV.NODE_ENV !== "production" && PRIVATE_ORIGIN_PATTERN.test(origin);
}

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: true,
    exposedHeaders: ["X-WP-Total", "X-WP-TotalPages"],
  }),
);
app.use(generalLimiter);
app.use(express.json());
app.use(cookieParser());

// Uploaded media is served as plain static files (referenced directly in <img src>, which can't
// send an Authorization header) — cross-origin-resource-policy is relaxed only for this path.
app.use(
  ENV.MEDIA_PUBLIC_PATH,
  (_req, res, next) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(ENV.MEDIA_UPLOAD_DIR),
);

app.use("/api/auth", authRouter);
app.use("/api", catalogRouter);
app.use("/api/products", productsRouter);
app.use("/api/sizes", sizesRouter);
app.use("/api/stock", stockRouter);
app.use("/api/stock-ledger", stockLedgerRouter);
app.use("/api/media", mediaRouter);
app.use("/api/hero-slides", heroSlidesRouter);
app.use("/api/notice", noticeRouter);
app.use("/api/users", usersRouter);
app.use("/api/admin", adminSessionsRouter);
app.use("/api/warehouse", warehouseRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/dispatches", dispatchesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);

app.use(errorHandler);

export default app;

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ENV } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { catalogRouter } from "./modules/catalog/catalog.router.js";
import { mediaRouter } from "./modules/media/media.router.js";
import { ordersRouter } from "./modules/orders/orders.router.js";
import { productsRouter } from "./modules/products/products.router.js";
import { reportsRouter } from "./modules/reports/reports.router.js";
import { settingsRouter } from "./modules/settings/settings.router.js";
import { stockRouter } from "./modules/stock/stock.router.js";
import { usersRouter } from "./modules/users/users.router.js";
import { warehouseRouter } from "./modules/warehouse/warehouse.router.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: ENV.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
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
app.use("/api/stock", stockRouter);
app.use("/api/media", mediaRouter);
app.use("/api/users", usersRouter);
app.use("/api/warehouse", warehouseRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);

app.use(errorHandler);

export default app;

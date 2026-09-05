// Storefront routes (/store/*, /register) are unmounted — storefront on hold, see multitenant_plan.md Phase 1.
// Back-office routes are nested under /b/:businessId (multi-tenant — see multitenant_plan.md Phase 6).
import { createHashRouter } from "react-router-dom"
import { RouteErrorPage } from "@/components/common/RouteErrorPage"
import { NotFoundPage } from "@/components/common/error-pages"
import { ProtectedRoute } from "@/app/ProtectedRoute"
import { BusinessGate } from "@/app/BusinessGate"
import { RootRedirect } from "@/app/RootRedirect"
import { ROUTES } from "@/constants/routes"
import { ROLES } from "@/constants/app"
import { CRUMBS } from "@/constants/breadcrumbs"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage"
import { ProfilePage } from "@/features/auth/pages/ProfilePage"
import { BusinessPickerPage } from "@/features/business-picker/pages/BusinessPickerPage"
import { ProductDetailPage as AdminProductDetailPage } from "@/features/products/pages/ProductDetailPage"
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage"
import { BusinessSettingsPage } from "@/features/business-settings/pages/BusinessSettingsPage"
import { CategoriesPage } from "@/features/catalog/pages/CategoriesPage"
import { CategoryDetailPage } from "@/features/catalog/pages/CategoryDetailPage"
import { ProductsPage } from "@/features/products/pages/ProductsPage"
import { ProductFormPage } from "@/features/products/pages/ProductFormPage"
import { StockPage } from "@/features/stock/pages/StockPage"
import { StockLedgerPage } from "@/features/stock-ledger/pages/StockLedgerPage"
import { MediaLibraryPage } from "@/features/media/pages/MediaLibraryPage"
import { MediaDetailPage } from "@/features/media/pages/MediaDetailPage"
import { OrdersPage } from "@/features/orders/pages/OrdersPage"
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage"
import { NewOrderPage } from "@/features/orders/pages/NewOrderPage"
import { DispatchesPage } from "@/features/dispatches/pages/DispatchesPage"
import { DispatchDetailPage } from "@/features/dispatches/pages/DispatchDetailPage"
import { DispatchOrderPage } from "@/features/dispatches/pages/DispatchOrderPage"
import { ReportsPage } from "@/features/reports/pages/ReportsPage"
import { UsersPage } from "@/features/users/pages/UsersPage"
import { UserViewPage } from "@/features/users/pages/UserViewPage"
import { AdminSessionsPage } from "@/features/users/pages/AdminSessionsPage"
import { SettingsPage } from "@/features/settings/pages/SettingsPage"
import { HeroSlidesPage } from "@/features/heroSlides/pages/HeroSlidesPage"
import { NoticePage } from "@/features/notice/pages/NoticePage"
import { SizesPage } from "@/features/sizes/pages/SizesPage"

/** Back-office ROUTES.* values are written absolute (`/products`); as children of `/b/:businessId`
 *  they must be relative. */
const rel = (path) => path.replace(/^\//, "")

export const router = createHashRouter([
  {
    path: ROUTES.AUTH.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.AUTH.CHANGE_PASSWORD,
    element: (
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    // Global/flat for now — /auth/me based, no business context (see multitenant_plan.md Phase 6).
    path: ROUTES.PROFILE,
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: ROUTES.BUSINESSES,
    element: (
      <ProtectedRoute>
        <BusinessPickerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/b/:businessId",
    element: (
      <ProtectedRoute allow={[ROLES.ADMIN, ROLES.STAFF]}>
        <BusinessGate />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage />, handle: { crumb: CRUMBS.DASHBOARD } },
      { path: rel(ROUTES.DASHBOARD), element: <DashboardPage />, handle: { crumb: CRUMBS.DASHBOARD } },
      { path: rel(ROUTES.WAREHOUSE), element: <BusinessSettingsPage />, handle: { crumb: CRUMBS.WAREHOUSE } },
      { path: rel(ROUTES.CATALOG.CATEGORIES), element: <CategoriesPage />, handle: { crumb: CRUMBS.CATEGORIES } },
      { path: "catalog/categories/:id", element: <CategoryDetailPage />, handle: { crumb: CRUMBS.CATEGORY_DETAIL } },
      { path: rel(ROUTES.SIZES), element: <SizesPage />, handle: { crumb: CRUMBS.SIZES } },
      { path: rel(ROUTES.PRODUCTS.LIST), element: <ProductsPage />, handle: { crumb: CRUMBS.PRODUCTS_LIST } },
      { path: rel(ROUTES.PRODUCTS.NEW), element: <ProductFormPage />, handle: { crumb: CRUMBS.PRODUCTS_NEW } },
      { path: "products/:id", element: <AdminProductDetailPage />, handle: { crumb: CRUMBS.PRODUCTS_DETAIL } },
      { path: "products/:id/edit", element: <ProductFormPage />, handle: { crumb: CRUMBS.PRODUCTS_EDIT } },
      { path: rel(ROUTES.STOCK.LIST), element: <StockPage />, handle: { crumb: CRUMBS.STOCK_LIST } },
      { path: rel(ROUTES.STOCK_LEDGER), element: <StockLedgerPage />, handle: { crumb: CRUMBS.STOCK_LEDGER } },
      { path: rel(ROUTES.MEDIA_LIBRARY.LIST), element: <MediaLibraryPage />, handle: { crumb: CRUMBS.MEDIA_LIST } },
      { path: "media-library/:id", element: <MediaDetailPage />, handle: { crumb: CRUMBS.MEDIA_DETAIL } },
      {
        path: rel(ROUTES.HERO_SLIDES),
        element: (
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <HeroSlidesPage />
          </ProtectedRoute>
        ),
        handle: { crumb: CRUMBS.HERO_SLIDES },
      },
      {
        path: rel(ROUTES.NOTICE),
        element: (
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <NoticePage />
          </ProtectedRoute>
        ),
        handle: { crumb: CRUMBS.NOTICE },
      },
      { path: rel(ROUTES.ORDERS.LIST), element: <OrdersPage />, handle: { crumb: CRUMBS.ORDERS_LIST } },
      { path: rel(ROUTES.ORDERS.NEW), element: <NewOrderPage />, handle: { crumb: CRUMBS.ORDERS_NEW } },
      { path: "orders/:id", element: <OrderDetailPage />, handle: { crumb: CRUMBS.ORDERS_DETAIL } },
      { path: "orders/:id/dispatch", element: <DispatchOrderPage />, handle: { crumb: CRUMBS.ORDERS_DISPATCH } },
      { path: rel(ROUTES.DISPATCHES.LIST), element: <DispatchesPage />, handle: { crumb: CRUMBS.DISPATCHES_LIST } },
      { path: "dispatches/:id", element: <DispatchDetailPage />, handle: { crumb: CRUMBS.DISPATCHES_DETAIL } },
      { path: rel(ROUTES.REPORTS), element: <ReportsPage />, handle: { crumb: CRUMBS.REPORTS } },
      { path: rel(ROUTES.USERS.LIST), element: <UsersPage />, handle: { crumb: CRUMBS.USERS } },
      {
        path: rel(ROUTES.USERS.SESSIONS),
        element: (
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <AdminSessionsPage />
          </ProtectedRoute>
        ),
        handle: { crumb: CRUMBS.USERS_SESSIONS },
      },
      { path: "users/:id", element: <UserViewPage />, handle: { crumb: CRUMBS.USERS_DETAIL } },
      {
        path: rel(ROUTES.SETTINGS),
        element: (
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <SettingsPage />
          </ProtectedRoute>
        ),
        handle: { crumb: CRUMBS.SETTINGS },
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
])

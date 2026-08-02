import { createHashRouter, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { StoreShell } from "@/components/layout/StoreShell"
import { RouteErrorPage } from "@/components/common/RouteErrorPage"
import { ProtectedRoute } from "@/app/ProtectedRoute"
import { ROUTES } from "@/constants/routes"
import { ROLES } from "@/constants/app"
import { CRUMBS } from "@/constants/breadcrumbs"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { RegisterPage } from "@/features/auth/pages/RegisterPage"
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage"
import { ProfilePage } from "@/features/auth/pages/ProfilePage"
import { HomePage } from "@/features/home/pages/HomePage"
import { ProductDetailPage } from "@/features/product-detail/pages/ProductDetailPage"
import { ProductDetailPage as AdminProductDetailPage } from "@/features/products/pages/ProductDetailPage"
import { CartPage } from "@/features/cart/pages/CartPage"
import { CheckoutPage } from "@/features/checkout/pages/CheckoutPage"
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage"
import { WarehousePage } from "@/features/warehouse/pages/WarehousePage"
import { DivisionsPage } from "@/features/catalog/pages/DivisionsPage"
import { CategoriesPage } from "@/features/catalog/pages/CategoriesPage"
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
import { MyOrdersPage } from "@/features/my-orders/pages/MyOrdersPage"
import { MyOrderDetailPage } from "@/features/my-orders/pages/MyOrderDetailPage"
import { ReportsPage } from "@/features/reports/pages/ReportsPage"
import { UsersPage } from "@/features/users/pages/UsersPage"
import { UserViewPage } from "@/features/users/pages/UserViewPage"
import { SettingsPage } from "@/features/settings/pages/SettingsPage"
import { HeroSlidesPage } from "@/features/heroSlides/pages/HeroSlidesPage"
import { NoticePage } from "@/features/notice/pages/NoticePage"
import { SizesPage } from "@/features/sizes/pages/SizesPage"
import { UppyUploader } from "@/components/common/UppyUploader"

export const router = createHashRouter([
  {
    path: "/__debug-upload",
    element: <UppyUploader onUploaded={() => {}} allowMultiple={false} />,
  },
  {
    path: ROUTES.AUTH.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.AUTH.REGISTER,
    element: <RegisterPage />,
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
    // Public storefront layout — browsing (home + product detail) needs no login;
    // cart/checkout/order-history are gated per-child below since they're account-owned.
    path: ROUTES.STORE.HOME,
    element: <StoreShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "products/:id",
        element: <ProductDetailPage />,
      },
      {
        path: "cart",
        element: (
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "checkout",
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders",
        element: (
          <ProtectedRoute>
            <MyOrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders/:id",
        element: (
          <ProtectedRoute>
            <MyOrderDetailPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    // Home URL always lands on the public store — dashboard is reached via the
    // account dropdown (admin/staff only), never the default landing page.
    path: "/",
    element: <Navigate to={ROUTES.STORE.HOME} replace />,
  },
  {
    element: (
      <ProtectedRoute allow={[ROLES.ADMIN, ROLES.STAFF]}>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: <DashboardPage />,
        handle: { crumb: CRUMBS.DASHBOARD },
      },
      {
        path: ROUTES.WAREHOUSE,
        element: <WarehousePage />,
        handle: { crumb: CRUMBS.WAREHOUSE },
      },
      {
        path: ROUTES.CATALOG.DIVISIONS,
        element: <DivisionsPage />,
        handle: { crumb: CRUMBS.DIVISIONS },
      },
      {
        path: ROUTES.CATALOG.CATEGORIES,
        element: <CategoriesPage />,
        handle: { crumb: CRUMBS.CATEGORIES },
      },
      {
        path: ROUTES.SIZES,
        element: <SizesPage />,
        handle: { crumb: CRUMBS.SIZES },
      },
      {
        path: ROUTES.PRODUCTS.LIST,
        element: <ProductsPage />,
        handle: { crumb: CRUMBS.PRODUCTS_LIST },
      },
      {
        path: ROUTES.PRODUCTS.NEW,
        element: <ProductFormPage />,
        handle: { crumb: CRUMBS.PRODUCTS_NEW },
      },
      {
        path: "/products/:id",
        element: <AdminProductDetailPage />,
        handle: { crumb: CRUMBS.PRODUCTS_DETAIL },
      },
      {
        path: "/products/:id/edit",
        element: <ProductFormPage />,
        handle: { crumb: CRUMBS.PRODUCTS_EDIT },
      },
      {
        path: ROUTES.STOCK.LIST,
        element: <StockPage />,
        handle: { crumb: CRUMBS.STOCK_LIST },
      },
      {
        path: ROUTES.STOCK_LEDGER,
        element: <StockLedgerPage />,
        handle: { crumb: CRUMBS.STOCK_LEDGER },
      },
      {
        path: ROUTES.MEDIA_LIBRARY.LIST,
        element: <MediaLibraryPage />,
        handle: { crumb: CRUMBS.MEDIA_LIST },
      },
      {
        path: "/media-library/:id",
        element: <MediaDetailPage />,
        handle: { crumb: CRUMBS.MEDIA_DETAIL },
      },
      {
        path: ROUTES.HERO_SLIDES,
        element: (
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <HeroSlidesPage />
          </ProtectedRoute>
        ),
        handle: { crumb: CRUMBS.HERO_SLIDES },
      },
      {
        path: ROUTES.NOTICE,
        element: (
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <NoticePage />
          </ProtectedRoute>
        ),
        handle: { crumb: CRUMBS.NOTICE },
      },
      {
        path: ROUTES.ORDERS.LIST,
        element: <OrdersPage />,
        handle: { crumb: CRUMBS.ORDERS_LIST },
      },
      {
        path: ROUTES.ORDERS.NEW,
        element: <NewOrderPage />,
        handle: { crumb: CRUMBS.ORDERS_NEW },
      },
      {
        path: "/orders/:id",
        element: <OrderDetailPage />,
        handle: { crumb: CRUMBS.ORDERS_DETAIL },
      },
      {
        path: "/orders/:id/dispatch",
        element: <DispatchOrderPage />,
        handle: { crumb: CRUMBS.ORDERS_DISPATCH },
      },
      {
        path: ROUTES.DISPATCHES.LIST,
        element: <DispatchesPage />,
        handle: { crumb: CRUMBS.DISPATCHES_LIST },
      },
      {
        path: "/dispatches/:id",
        element: <DispatchDetailPage />,
        handle: { crumb: CRUMBS.DISPATCHES_DETAIL },
      },
      {
        path: ROUTES.REPORTS,
        element: <ReportsPage />,
        handle: { crumb: CRUMBS.REPORTS },
      },
      {
        path: ROUTES.USERS.LIST,
        element: <UsersPage />,
        handle: { crumb: CRUMBS.USERS },
      },
      {
        path: "/users/:id",
        element: <UserViewPage />,
        handle: { crumb: CRUMBS.USERS_DETAIL },
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <SettingsPage />
          </ProtectedRoute>
        ),
        handle: { crumb: CRUMBS.SETTINGS },
      },
      {
        path: ROUTES.PROFILE,
        element: <ProfilePage />,
        handle: { crumb: CRUMBS.PROFILE },
      },
    ],
  },
])

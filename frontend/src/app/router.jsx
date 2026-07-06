import { createHashRouter, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { StoreShell } from "@/components/layout/StoreShell"
import { RouteErrorPage } from "@/components/common/RouteErrorPage"
import { ProtectedRoute } from "@/app/ProtectedRoute"
import { ROUTES } from "@/constants/routes"
import { ROLES } from "@/constants/app"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { RegisterPage } from "@/features/auth/pages/RegisterPage"
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage"
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
import { ScanStockPage } from "@/features/stock/pages/ScanStockPage"
import { StockLedgerPage } from "@/features/stock-ledger/pages/StockLedgerPage"
import { MediaLibraryPage } from "@/features/media/pages/MediaLibraryPage"
import { MediaDetailPage } from "@/features/media/pages/MediaDetailPage"
import { OrdersPage } from "@/features/orders/pages/OrdersPage"
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage"
import { MyOrdersPage } from "@/features/my-orders/pages/MyOrdersPage"
import { MyOrderDetailPage } from "@/features/my-orders/pages/MyOrderDetailPage"
import { ReportsPage } from "@/features/reports/pages/ReportsPage"
import { UsersPage } from "@/features/users/pages/UsersPage"
import { SettingsPage } from "@/features/settings/pages/SettingsPage"
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
    path: ROUTES.STORE.HOME,
    element: (
      <ProtectedRoute allow={[ROLES.CUSTOMER, ROLES.ADMIN, ROLES.STAFF]}>
        <StoreShell />
      </ProtectedRoute>
    ),
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
        element: <CartPage />,
      },
      {
        path: "checkout",
        element: <CheckoutPage />,
      },
      {
        path: "orders",
        element: <MyOrdersPage />,
      },
      {
        path: "orders/:id",
        element: <MyOrderDetailPage />,
      },
    ],
  },
  {
    path: "/",
    element: (
      <ProtectedRoute allow={[ROLES.ADMIN, ROLES.STAFF]}>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.DASHBOARD,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.WAREHOUSE,
        element: <WarehousePage />,
      },
      {
        path: ROUTES.CATALOG.DIVISIONS,
        element: <DivisionsPage />,
      },
      {
        path: ROUTES.CATALOG.CATEGORIES,
        element: <CategoriesPage />,
      },
      {
        path: ROUTES.PRODUCTS.LIST,
        element: <ProductsPage />,
      },
      {
        path: ROUTES.PRODUCTS.NEW,
        element: <ProductFormPage />,
      },
      {
        path: "/products/:id",
        element: <AdminProductDetailPage />,
      },
      {
        path: "/products/:id/edit",
        element: <ProductFormPage />,
      },
      {
        path: ROUTES.STOCK.LIST,
        element: <StockPage />,
      },
      {
        path: ROUTES.STOCK.SCAN,
        element: <ScanStockPage />,
      },
      {
        path: ROUTES.STOCK_LEDGER,
        element: <StockLedgerPage />,
      },
      {
        path: ROUTES.MEDIA_LIBRARY.LIST,
        element: <MediaLibraryPage />,
      },
      {
        path: "/media-library/:id",
        element: <MediaDetailPage />,
      },
      {
        path: ROUTES.ORDERS.LIST,
        element: <OrdersPage />,
      },
      {
        path: "/orders/:id",
        element: <OrderDetailPage />,
      },
      {
        path: ROUTES.REPORTS,
        element: <ReportsPage />,
      },
      {
        path: ROUTES.USERS.LIST,
        element: <UsersPage />,
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

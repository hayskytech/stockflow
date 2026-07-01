import { createBrowserRouter, Navigate } from "react-router-dom"
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
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage"
import { WarehousePage } from "@/features/warehouse/pages/WarehousePage"
import { DivisionsPage } from "@/features/catalog/pages/DivisionsPage"
import { CategoriesPage } from "@/features/catalog/pages/CategoriesPage"
import { ProductsPage } from "@/features/products/pages/ProductsPage"
import { ProductFormPage } from "@/features/products/pages/ProductFormPage"
import { StockLedgerPage } from "@/features/stock-ledger/pages/StockLedgerPage"
import { MediaLibraryPage } from "@/features/media/pages/MediaLibraryPage"
import { OrdersPage } from "@/features/orders/pages/OrdersPage"
import { DispatchesPage } from "@/features/dispatches/pages/DispatchesPage"
import { ReportsPage } from "@/features/reports/pages/ReportsPage"
import { UsersPage } from "@/features/users/pages/UsersPage"
import { UppyUploader } from "@/components/common/UppyUploader"

export const router = createBrowserRouter([
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
      <ProtectedRoute allow={[ROLES.CUSTOMER]}>
        <StoreShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
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
        path: "/products/:id/edit",
        element: <ProductFormPage />,
      },
      {
        path: ROUTES.STOCK_LEDGER,
        element: <StockLedgerPage />,
      },
      {
        path: ROUTES.MEDIA_LIBRARY,
        element: <MediaLibraryPage />,
      },
      {
        path: ROUTES.ORDERS.LIST,
        element: <OrdersPage />,
      },
      {
        path: ROUTES.DISPATCHES,
        element: <DispatchesPage />,
      },
      {
        path: ROUTES.REPORTS,
        element: <ReportsPage />,
      },
      {
        path: ROUTES.USERS.LIST,
        element: <UsersPage />,
      },
    ],
  },
])

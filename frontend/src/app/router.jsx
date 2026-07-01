import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { RouteErrorPage } from "@/components/common/RouteErrorPage"
import { ProtectedRoute } from "@/app/ProtectedRoute"
import { ROUTES } from "@/constants/routes"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage"
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
    path: ROUTES.AUTH.CHANGE_PASSWORD,
    element: (
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
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

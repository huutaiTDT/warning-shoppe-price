/** @format */

import { ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";

import Toast from "@/components/toast";
import { useAppToastListener } from "@/components/toast/hook";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AdminAccountBrandManager from "@/pages/AdminAccountBrandManager";
import BrandManager from "@/pages/BrandManager";
import ChangePasswordPage from "@/pages/ChangePassword";
import CrawlHistory from "@/pages/CrawlHistory";
import Dashboard from "@/pages/Dashboard";
import DashboardLayout from "@/pages/Layout";
import Login from "@/pages/Login";
import MasterProductsPage from "@/pages/Product";
import ProductDetail from "@/pages/ProductDetail";
import Settings from "@/pages/Settings";
import ShopForm from "@/pages/ShopForm";
import Shops from "@/pages/Shops";
import ProductForm from "./pages/ProductForm";
// Private Route Component
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to='/login' />;
}

// Admin Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, type } = useAuth();

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || type !== "ADMIN") {
    return <Navigate to='/dashboard' />;
  }

  return children;
}

export default function App() {
  useAppToastListener();

  const theme = {
    token: {
      colorBgBase: "#101828",
      colorPrimary: "#10b981",
      colorBgContainer: "#1f2937",
      colorBorder: "#1f2937",
      colorOutline: "#1f2937",
      colorRing: "#10b981",
      colorTextBase: "#fff",
      colorBgElevated: "#374151",
      colorBgHover: "#1f2937",
      borderRadius: 0,
      outline: "none",
      borderSize: 1,
      fontSize: 13,
      fontSizeHeading1: 24,
      fontSizeHeading2: 22,
      fontSizeHeading3: 20,
      fontSizeHeading4: 18,
      fontSizeHeading5: 16,
      fontSizeHeading6: 14,
      controlHeight: 40,
      innerHeight: 32,
      itemActiveColor: "#10b981",
      itemHoverColor: "#1f2937",
      itemSelectedColor: "#10b981",
      itemSelectedHoverColor: "#1f2937",
      itemDisabledColor: "#374151",
      itemDisabledHoverColor: "#374151",
      itemHoverBgColor: "#1f2937",
      itemActiveBgColor: "#10b981",
      itemSelectedBgColor: "#10b981",
      itemSelectedHoverBgColor: "#1f2937",
      itemDisabledBgColor: "#374151",
      itemDisabledHoverBgColor: "#374151",
      outerHeight: 40,
      controlWidth: 40,
      controlHeightLG: 40,
      controlHeightSM: 32,
      controlHeightXS: 24,
      fontSizeLG: 14,
      fontSizeSM: 12,
      fontSizeXS: 10,
      lineHeight: 1.5,
      colorItemHover: "#1f2937",
      colorItemActive: "#10b981",
      colorItemSelected: "#10b981",
    },

    components: {
      Input: {
        colorBgHover: "#1f2937",
        colorBorderHover: "#10b981",
        colorBorderFocus: "#10b981",
        colorBgFocus: "#1f2937",
        colorBgActive: "#1f2937",
      },
      Select: {
        optionSelectedBg: "#22c55e20",
        optionActiveBg: "#22c55e10",
        optionSelectedColor: "#22c55e",
        optionActiveColor: "#22c55e",
        optionHoverBg: "#22c55e10",
        optionHoverColor: "#22c55e",
        optionDisabledColor: "#374151",
        optionDisabledBg: "#374151",
        colorBorderHover: "#22c55e",
        colorBorderFocus: "#22c55e",
      },
      Button: {
        boxShadow: "0 4px 12px rgba(34,197,94,0.4)",
        primaryShadow: "0 4px 12px rgba(34,197,94,0.5)",
        dangerShadow: "0 4px 12px rgba(255,0,0,0.4)",
      },
    },
  };

  return (
    <ConfigProvider locale={viVN} theme={theme as any}>
      <AuthProvider>
        <Toast />
        <Router>
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/change-password' element={<ChangePasswordPage />} />

            <Route
              path='/dashboard'
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }>
              <Route index element={<Dashboard />} />
              <Route path='shops' element={<Shops />} />
              <Route path='shops/new' element={<ShopForm />} />
              <Route path='shops/:id' element={<ShopForm />} />
              <Route path='products/new' element={<ProductForm />} />
              <Route path='products/:id' element={<ProductDetail />} />
              <Route path='products/:id/edit' element={<ProductForm />} />
              <Route path='crawl-history' element={<CrawlHistory />} />
              <Route path='brands' element={<BrandManager />} />
              <Route path='master-products' element={<MasterProductsPage />} />
              <Route
                path='admin/accounts'
                element={
                  <AdminRoute>
                    <AdminAccountBrandManager />
                  </AdminRoute>
                }
              />
              <Route path='settings' element={<Settings />} />
            </Route>

            <Route path='/' element={<Navigate to='/dashboard' />} />
            <Route path='*' element={<Navigate to='/dashboard' />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

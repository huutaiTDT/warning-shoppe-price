/** @format */

import { ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";

import CrawlHistory from "@/pages/CrawlHistory";
import Dashboard from "@/pages/Dashboard";
import DashboardLayout from "@/pages/Layout";
import Login from "@/pages/Login";
import Products from "@/pages/Products";
import Shops from "@/pages/Shops";

// Private Route Component
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className='flex items-center justify-center h-screen'>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to='/login' />;
}

export default function App() {
  const theme = {
    token: {
      colorBgBase: "#101828",
      colorPrimary: "#10b981",
      colorBgContainer: "#1f2937",
      colorBorder: "#374151",
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
    },
    algorithm: undefined, // Will add dark theme
  };

  return (
    <ConfigProvider locale={viVN} theme={theme}>
      <Router>
        <Routes>
          <Route path='/login' element={<Login />} />

          <Route
            path='/dashboard'
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }>
            <Route index element={<Dashboard />} />
            <Route path='shops' element={<Shops />} />
            <Route path='products' element={<Products />} />
            <Route path='crawl-history' element={<CrawlHistory />} />
            <Route
              path='settings'
              element={<div className='text-white'>Settings Page</div>}
            />
          </Route>

          <Route path='/' element={<Navigate to='/dashboard' />} />
          <Route path='*' element={<Navigate to='/dashboard' />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

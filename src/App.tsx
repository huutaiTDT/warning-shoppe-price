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
    alert(token);
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
      colorPrimary: "#10b981",
      colorBgContainer: "#1f2937",
      colorBorder: "#374151",
      colorTextBase: "#e5e7eb",
      borderRadius: 6,
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

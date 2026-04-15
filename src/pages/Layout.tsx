/** @format */

import {
  DashboardOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  ShoppingOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Layout, Menu, message } from "antd";
import { Package } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";

const { Header, Sider, Content } = Layout;

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem("auth_token");
      message.success("Đã đăng xuất");
      navigate("/login");
    } catch (error) {
      localStorage.removeItem("auth_token");
      navigate("/login");
    }
  };

  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Dashboard</Link>,
    },
    {
      key: "/dashboard/shops",
      icon: <ShopOutlined />,
      label: <Link to="/dashboard/shops">Cửa hàng</Link>,
    },
    {
      key: "/dashboard/products",
      icon: <ShoppingOutlined />,
      label: <Link to="/dashboard/products">Sản phẩm</Link>,
    },
    {
      key: "/dashboard/crawl-history",
      icon: <HistoryOutlined />,
      label: <Link to="/dashboard/crawl-history">Lịch sử quét</Link>,
    },
    {
      key: "/dashboard/settings",
      icon: <SettingOutlined />,
      label: <Link to="/dashboard/settings">Cài đặt</Link>,
    },
  ];

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Đăng xuất",
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout className="h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}>
        <div className="p-6 flex items-center gap-3 mb-8">
          <Package size={28} className="text-emerald-500" />
          {!collapsed && (
            <span className="font-bold text-white text-lg">Quản lý</span>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header className="flex items-center justify-between px-6">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-white"
          />

          <Dropdown menu={userMenu}>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
              <Avatar size="large" style={{ backgroundColor: "#10b981" }}>
                A
              </Avatar>
              <span className="text-white">Admin</span>
            </div>
          </Dropdown>
        </Header>

        <Content className="p-6 overflow-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

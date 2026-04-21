/** @format */

import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/services/api";
import {
  DashboardOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TagsOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Layout,
  Menu,
  message,
} from "antd";
import { Package } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, type, clearAuthSession } = useAuth();

  const breadcrumbItems = useMemo(() => {
    const path = location.pathname;

    if (path === "/dashboard") {
      return [{ title: "Tổng quan" }];
    }

    if (path === "/dashboard/brands") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Quản lý thương hiệu" },
      ];
    }

    if (path === "/dashboard/shops") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Cửa hàng" },
      ];
    }

    if (path === "/dashboard/shops/new") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: <Link to='/dashboard/shops'>Cửa hàng</Link> },
        { title: "Thêm cửa hàng" },
      ];
    }

    if (/^\/dashboard\/shops\/[^/]+$/.test(path)) {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: <Link to='/dashboard/shops'>Cửa hàng</Link> },
        { title: "Cập nhật cửa hàng" },
      ];
    }

    if (path === "/dashboard/products") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Sản phẩm" },
      ];
    }

    if (path === "/dashboard/master-products") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Master Products" },
      ];
    }

    if (path === "/dashboard/user-brand-permissions") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Phân quyền User-Brand" },
      ];
    }

    if (path === "/dashboard/products/new") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: <Link to='/dashboard/products'>Sản phẩm</Link> },
        { title: "Thêm sản phẩm" },
      ];
    }

    if (/^\/dashboard\/products\/[^/]+\/edit$/.test(path)) {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: <Link to='/dashboard/products'>Sản phẩm</Link> },
        { title: "Cập nhật sản phẩm" },
      ];
    }

    if (/^\/dashboard\/products\/[^/]+$/.test(path)) {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: <Link to='/dashboard/products'>Sản phẩm</Link> },
        { title: "Chi tiết sản phẩm" },
      ];
    }

    if (path === "/dashboard/crawl-history") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Lịch sử quét" },
      ];
    }

    if (path === "/dashboard/settings") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Cài đặt" },
      ];
    }

    if (path === "/dashboard/account-settings") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Account Settings" },
      ];
    }

    if (path === "/dashboard/admin/accounts") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Quản lý tài khoản" },
      ];
    }

    if (path === "/dashboard/post-schedules") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: "Lịch bài viết" },
      ];
    }

    if (path === "/dashboard/post-schedules/new") {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: <Link to='/dashboard/post-schedules'>Lịch bài viết</Link> },
        { title: "Tạo lịch bài viết" },
      ];
    }

    if (/^\/dashboard\/post-schedules\/[^/]+\/edit$/.test(path)) {
      return [
        { title: <Link to='/dashboard'>Tổng quan</Link> },
        { title: <Link to='/dashboard/post-schedules'>Lịch bài viết</Link> },
        { title: "Cập nhật lịch bài viết" },
      ];
    }

    return [{ title: "Tổng quan" }];
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      clearAuthSession();
      message.success("Đã đăng xuất");
      navigate("/login");
    } catch (error) {
      clearAuthSession();
      navigate("/login");
    }
  };

  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: <Link to='/dashboard'>Dashboard</Link>,
    },
    {
      key: "/dashboard/brands",
      icon: <TagsOutlined />,
      label: <Link to='/dashboard/brands'>Thương hiệu</Link>,
    },
    {
      key: "/dashboard/shops",
      icon: <ShopOutlined />,
      label: <Link to='/dashboard/shops'>Cửa hàng</Link>,
    },
    {
      key: "/dashboard/master-products",
      icon: <ShoppingOutlined />,
      label: <Link to='/dashboard/master-products'>Sản phẩm</Link>,
    },
    {
      key: "/dashboard/crawl-history",
      icon: <HistoryOutlined />,
      label: <Link to='/dashboard/crawl-history'>Lịch sử quét</Link>,
    },
    ...(type === "ADMIN" ?
      [
        {
          key: "/dashboard/admin/accounts",
          icon: <UserOutlined />,
          label: <Link to='/dashboard/admin/accounts'>Quản lý tài khoản</Link>,
        },
      ]
    : []),
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
    <Layout className='h-screen'>
      <Sider trigger={null} collapsible collapsed={collapsed} width={250}>
        <div className='h-16 flex items-center justify-center bg-emerald-600/20 border-b border-emerald-600/30'>
          <div className='flex justify-center items-center'>
            <Package className='text-emerald-500' />
            {!collapsed && (
              <span className='font-bold text-white text-lg'>Quản lý</span>
            )}
          </div>
        </div>

        <Menu
          theme='dark'
          mode='inline'
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            height: "4rem ",
          }}
          className=' bg-emerald-600/20 border-b border-emerald-600/30 flex items-center justify-between '>
          <div className='flex items-center gap-3 min-w-0'>
            <Button
              type='text'
              icon={
                collapsed ?
                  <MenuUnfoldOutlined className='h-8 w-8' />
                : <MenuFoldOutlined className='h-8 w-8' />
              }
              onClick={() => setCollapsed(!collapsed)}
              className='text-white'
            />

            <Breadcrumb
              items={breadcrumbItems}
              separator='/'
              className='text-xs md:text-sm'
            />
          </div>

          <Dropdown menu={userMenu}>
            <div className='flex items-center gap-3 cursor-pointer hover:opacity-80'>
              <Avatar size='large' style={{ backgroundColor: "#10b981" }}>
                {user?.username?.charAt(0)?.toUpperCase() || "A"}
              </Avatar>
              <span className='text-white'>{user?.username || "Admin"}</span>
            </div>
          </Dropdown>
        </Header>

        <Content className='overflow-auto'>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

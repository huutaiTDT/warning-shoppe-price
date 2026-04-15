/** @format */

import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  Layout,
  Menu,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
} from "antd";
import axios from "axios";
import { useState } from "react";

const { Sider, Content, Header } = Layout;

const API_BASE_URL = "http://localhost:3001/api";

// API Functions
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

const fetchShops = async (page = 1, limit = 100) => {
  const { data } = await apiClient.get("/shops", { params: { page, limit } });
  return data.shops || [];
};

const fetchProducts = async (page = 1, limit = 100) => {
  const { data } = await apiClient.get("/products", {
    params: { page, limit },
  });
  return data.products || [];
};

const deleteShop = async (id) => {
  await apiClient.delete(`/shops/${id}`);
};

const deleteProduct = async (id) => {
  await apiClient.delete(`/products/${id}`);
};

const TABLES = [
  { key: "shops", label: "🏪 Shops", icon: "🏪" },
  { key: "products_aff", label: "🛍️ Products", icon: "🛍️" },
  { key: "crawl_history", label: "📊 Crawl History", icon: "📊" },
  { key: "users", label: "👤 Users", icon: "👤" },
];

export default function AdminPage() {
  const [selectedTable, setSelectedTable] = useState("shops");
  const [searchText, setSearchText] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // React Query Hooks
  const {
    data: shopsData = [],
    isLoading: shopsLoading,
    isFetching: shopsFetching,
  } = useQuery({
    queryKey: ["shops"],
    queryFn: () => fetchShops(),
    enabled: selectedTable === "shops",
  });

  const {
    data: productsData = [],
    isLoading: productsLoading,
    isFetching: productsFetching,
  } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    enabled: selectedTable === "products_aff",
  });

  const deleteShopMutation = useMutation({
    mutationFn: deleteShop,
    onSuccess: () => {
      message.success("Shop deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["shops"] });
    },
    onError: () => {
      message.error("Failed to delete shop");
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      message.success("Product deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => {
      message.error("Failed to delete product");
    },
  });

  // Handle Edit
  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  // Handle Delete
  const handleDelete = (id) => {
    if (selectedTable === "shops") {
      deleteShopMutation.mutate(id);
    } else if (selectedTable === "products_aff") {
      deleteProductMutation.mutate(id);
    }
  };

  // Handle Copy
  const handleCopy = (record) => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    message.success("Copied to clipboard");
  };

  // Table Columns
  const getColumns = () => {
    const baseColumns = [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        render: (text) => (
          <span className='font-mono text-xs text-slate-400'>
            {text?.substring(0, 8)}...
          </span>
        ),
        width: 120,
      },
    ];

    const actionColumn = {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 120,
      render: (_, record) => (
        <Space size='small'>
          <Button
            type='text'
            size='small'
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title='Delete'
            description='Are you sure?'
            onConfirm={() => handleDelete(record.id)}
            okText='Yes'
            cancelText='No'>
            <Button type='text' danger size='small' icon={<DeleteOutlined />} />
          </Popconfirm>
          <Button
            type='text'
            size='small'
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
          />
        </Space>
      ),
    };

    if (selectedTable === "shops") {
      return [
        ...baseColumns,
        {
          title: "Name",
          dataIndex: "name",
          key: "name",
          render: (text) => <span className='text-slate-200'>{text}</span>,
          width: 200,
        },
        {
          title: "URL",
          dataIndex: "url",
          key: "url",
          render: (text) => (
            <a
              href={text}
              target='_blank'
              rel='noopener noreferrer'
              className='text-emerald-400 text-xs'>
              {text?.substring(0, 30)}...
            </a>
          ),
          width: 200,
        },
        {
          title: "Platform",
          dataIndex: "platform",
          key: "platform",
          width: 100,
        },
        {
          title: "Sys Product",
          dataIndex: "is_sys_product_by_link",
          key: "is_sys_product_by_link",
          render: (value) => (
            <Badge
              status={value ? "success" : "default"}
              text={value ? "Yes" : "No"}
            />
          ),
          width: 100,
        },
        actionColumn,
      ];
    }

    if (selectedTable === "products_aff") {
      return [
        ...baseColumns,
        {
          title: "Name",
          dataIndex: "name",
          key: "name",
          render: (text) => (
            <span className='text-slate-200 truncate'>{text}</span>
          ),
          width: 250,
        },
        {
          title: "Price Min",
          dataIndex: "price_min",
          key: "price_min",
          render: (text) => (
            <span className='font-mono text-sm'>{text?.toLocaleString()}</span>
          ),
          width: 100,
        },
        {
          title: "Price Max",
          dataIndex: "price_max",
          key: "price_max",
          render: (text) => (
            <span className='font-mono text-sm'>{text?.toLocaleString()}</span>
          ),
          width: 100,
        },
        {
          title: "Original Price",
          dataIndex: "original_price",
          key: "original_price",
          render: (text) => (
            <span className='font-mono text-sm'>{text?.toLocaleString()}</span>
          ),
          width: 100,
        },
        {
          title: "Rating",
          dataIndex: "rating",
          key: "rating",
          render: (text) => <span>⭐ {text || 0}</span>,
          width: 80,
        },
        {
          title: "Shop",
          dataIndex: "shop_id",
          key: "shop_id",
          render: (text) => (
            <span className='font-mono text-xs text-slate-400'>
              {text?.substring(0, 8)}...
            </span>
          ),
          width: 120,
        },
        actionColumn,
      ];
    }

    return baseColumns;
  };

  const isLoading =
    selectedTable === "shops" ? shopsLoading || shopsFetching
    : selectedTable === "products_aff" ? productsLoading || productsFetching
    : false;

  const tableData =
    selectedTable === "shops" ? shopsData
    : selectedTable === "products_aff" ? productsData
    : [];

  const filteredData = tableData.filter((record) => {
    return Object.values(record).some((value) =>
      String(value).toLowerCase().includes(searchText.toLowerCase()),
    );
  });

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: "#0f172a" }}>
      {/* Sidebar */}
      <Sider
        width={240}
        style={{ backgroundColor: "#1e293b", borderRight: "1px solid #334155" }}
        theme='dark'>
        <div style={{ padding: "24px", borderBottom: "1px solid #334155" }}>
          <h2
            style={{
              color: "#10b981",
              marginBottom: 0,
              fontSize: "16px",
              fontWeight: "bold",
            }}>
            📋 Table Editor
          </h2>
        </div>

        <Menu
          theme='dark'
          defaultSelectedKeys={["shops"]}
          selectedKeys={[selectedTable]}
          onClick={(e) => setSelectedTable(e.key)}
          style={{ backgroundColor: "#1e293b", borderRight: "none" }}
          items={TABLES.map((table) => ({
            key: table.key,
            label: table.label,
          }))}
        />

        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #334155",
            marginTop: "auto",
          }}>
          <Button block icon={<PlusOutlined />}>
            New Table
          </Button>
        </div>
      </Sider>

      {/* Main Content */}
      <Layout style={{ backgroundColor: "#0f172a" }}>
        {/* Header */}
        <Header
          style={{
            backgroundColor: "#1e293b",
            borderBottom: "1px solid #334155",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
          <Tabs
            activeKey={selectedTable}
            onChange={setSelectedTable}
            items={TABLES.map((table) => ({
              key: table.key,
              label: `🔒 ${table.label}`,
            }))}
            style={{ margin: 0 }}
          />

          <Space>
            <Button icon={<ReloadOutlined />} loading={isLoading} />
            <Button icon={<SettingOutlined />} />
          </Space>
        </Header>

        {/* Toolbar */}
        <div
          style={{
            padding: "16px 24px",
            backgroundColor: "#1e293b",
            borderBottom: "1px solid #334155",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}>
          <Input
            placeholder='Filter by id, name, url... or ask AI'
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1, minWidth: "300px" }}
          />

          <Button icon={<FilterOutlined />}>Sort</Button>
          <Button>RLS policy</Button>
          <Button>Index Advisor</Button>
          <Button>Enable Realtime</Button>

          <Select
            value='postgres'
            style={{ width: "120px" }}
            options={[{ label: "🐘 postgres", value: "postgres" }]}
          />

          <Button type='primary' icon={<PlusOutlined />}>
            Insert
          </Button>

          <Button icon={<DownloadOutlined />}>Export</Button>
          <Button icon={<UploadOutlined />}>Import</Button>
        </div>

        {/* Table Content */}
        <Content style={{ padding: "24px", overflow: "auto" }}>
          <Card
            style={{
              backgroundColor: "#1e293b",
              borderColor: "#334155",
            }}
            bodyStyle={{ padding: 0 }}>
            <Table
              columns={getColumns()}
              dataSource={filteredData.map((item) => ({
                ...item,
                key: item.id,
              }))}
              loading={isLoading}
              pagination={{
                pageSize: 10,
                total: filteredData.length,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} items`,
              }}
              scroll={{ x: 1200 }}
              style={{
                backgroundColor: "#1e293b",
              }}
              rowClassName={() => "dark-table-row"}
            />
          </Card>
        </Content>
      </Layout>

      {/* Edit Modal */}
      <Modal
        title='Edit Record'
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        okText='Update'>
        <Form form={form} layout='vertical'>
          {Object.entries(editingRecord || {}).map(([key, value]) => (
            <Form.Item key={key} label={key} name={key}>
              <Input value={String(value)} readOnly />
            </Form.Item>
          ))}
        </Form>
      </Modal>

      <style>{`
        .dark-table-row {
          background-color: #1e293b !important;
        }

        .dark-table-row:hover {
          background-color: #334155 !important;
        }

        .ant-table {
          background-color: #1e293b;
          color: #e2e8f0;
        }

        .ant-table-thead > tr > th {
          background-color: #334155;
          color: #94a3b8;
          border-color: #334155;
        }

        .ant-table-tbody > tr > td {
          border-color: #334155;
          color: #cbd5e1;
        }

        .ant-input,
        .ant-select-selector {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }

        .ant-input::placeholder {
          color: #64748b;
        }

        .ant-btn {
          border-color: #334155;
          color: #cbd5e1;
        }

        .ant-btn-primary {
          background-color: #10b981;
          border-color: #10b981;
        }

        .ant-menu-dark {
          background-color: #1e293b;
        }

        .ant-menu-dark-item-selected {
          background-color: #10b981 !important;
        }

        .ant-tabs-tab {
          color: #94a3b8 !important;
        }

        .ant-tabs-tab-active {
          color: #10b981 !important;
        }

        .ant-modal-content {
          background-color: #1e293b;
        }

        .ant-modal-header {
          background-color: #1e293b;
          border-color: #334155;
        }

        .ant-modal-title {
          color: #e2e8f0;
        }

        .ant-form-item-label > label {
          color: #cbd5e1;
        }
      `}</style>
    </Layout>
  );
}

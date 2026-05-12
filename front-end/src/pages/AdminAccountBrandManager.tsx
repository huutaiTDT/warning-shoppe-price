/** @format */

import {
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { useEffect, useState } from "react";
import { accountsAPI, brandsAPI } from "../services/api";

interface Brand {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
}

interface Account {
  id: string;
  username: string;
  email: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

interface AccountWithBrands extends Account {
  assigned_brands: Brand[];
}

interface NewAccount {
  username: string;
  email: string;
}

export default function AdminAccountBrandManager() {
  const [accounts, setAccounts] = useState<AccountWithBrands[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<AccountWithBrands | null>(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [newAccount, setNewAccount] = useState<NewAccount>({
    username: "",
    email: "",
  });
  const [tempPassword, setTempPassword] = useState<string>("");
  const [createdAccountUsername, setCreatedAccountUsername] =
    useState<string>("");

  // Fetch all accounts and brands
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch all accounts (STAFF users)
      const { data: accountsResponse } = await accountsAPI.list(1, 100);
      const staffAccounts = (
        accountsResponse?.items ||
        accountsResponse ||
        []
      ).filter((account: Account) => account.type === "STAFF");

      // Fetch all brands
      const { data: brandsData } = await brandsAPI.list(1, 1000);
      const brands = (
        brandsData?.brands ||
        brandsData?.items ||
        brandsData?.data ||
        []
      ).filter((brand: any) => brand?.id && typeof brand.id === "string");

      // Fetch assigned brands for each account
      const accountsWithBrands = await Promise.all(
        staffAccounts.map(async (account: Account) => {
          try {
            const { data: brandsResponse } = await accountsAPI.getBrands(
              account.id,
            );
            const assignedBrands = brandsResponse?.brands || [];
            return {
              ...account,
              assigned_brands: assignedBrands,
            };
          } catch {
            return {
              ...account,
              assigned_brands: [],
            };
          }
        }),
      );

      setAccounts(accountsWithBrands);
      setAllBrands(brands || []);
    } catch (error) {
      message.error("Failed to load accounts and brands");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBrands = (account: AccountWithBrands) => {
    setSelectedAccount(account);
    setSelectedBrandIds(account.assigned_brands.map((b) => b.id));
    setModalVisible(true);
  };

  const handleSaveBrands = async () => {
    if (!selectedAccount) return;

    try {
      setSaving(true);
      await accountsAPI.assignBrands(selectedAccount.id, selectedBrandIds);

      message.success(
        `Assigned ${selectedBrandIds.length} brand(s) to ${selectedAccount.username}`,
      );
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error("Failed to save brands");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBrand = async (
    account: AccountWithBrands,
    brand: Brand,
  ) => {
    Modal.confirm({
      title: "Remove Brand",
      content: `Remove "${brand.name}" from ${account.username}?`,
      okText: "Remove",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setLoading(true);
          await accountsAPI.removeBrand(account.id, brand.id);
          message.success(`Removed "${brand.name}" from ${account.username}`);
          loadData();
        } catch (error) {
          message.error("Failed to remove brand");
          console.error(error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleCreateAccount = async () => {
    if (!newAccount.username.trim() || !newAccount.email.trim()) {
      message.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      const { data } = await accountsAPI.create({
        username: newAccount.username,
        email: newAccount.email,
        type: "STAFF",
      });

      setTempPassword(data.temporaryPassword || "123456");
      setCreatedAccountUsername(newAccount.username);
      setPasswordModalVisible(true);
      setNewAccount({ username: "", email: "" });
      setCreateModalVisible(false);
      loadData();
    } catch (error) {
      message.error("Failed to create account");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (account: AccountWithBrands) => {
    Modal.confirm({
      title: "Delete Account",
      content: `Are you sure you want to delete account "${account.username}"? This action cannot be undone.`,
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setLoading(true);
          await accountsAPI.delete(account.id);
          message.success(`Account "${account.username}" has been deleted`);
          loadData();
        } catch (error) {
          message.error("Failed to delete account");
          console.error(error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success("Copied to clipboard");
  };

  const filteredAccounts = accounts.filter(
    (account) =>
      account.username.toLowerCase().includes(searchText.toLowerCase()) ||
      account.email.toLowerCase().includes(searchText.toLowerCase()),
  );

  const columns = [
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      render: (text: string) => <strong>{text}</strong>,
      width: 150,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
      width: 100,
    },
    {
      title: "Assigned Brands",
      dataIndex: "assigned_brands",
      key: "assigned_brands",
      render: (brands: Brand[], record: AccountWithBrands) => {
        if (brands.length === 0) {
          return <span style={{ color: "#ccc" }}>No brands assigned</span>;
        }
        return (
          <Space size='small' wrap>
            {brands.map((brand) => (
              <Tooltip key={brand.id} title={`Click to remove`}>
                <Tag
                  color='blue'
                  closable
                  onClose={() => handleRemoveBrand(record, brand)}
                  style={{ cursor: "pointer" }}>
                  {brand.name}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
      width: 350,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: AccountWithBrands) => (
        <Space size='small'>
          <Button
            type='primary'
            size='small'
            icon={<EditOutlined />}
            onClick={() => handleEditBrands(record)}>
            Brands
          </Button>
          <Button
            type='primary'
            danger
            size='small'
            onClick={() => handleDeleteAccount(record)}>
            Delete
          </Button>
        </Space>
      ),
      width: 150,
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}>
        <Space>
          <Button
            type='primary'
            onClick={() => setCreateModalVisible(true)}
            disabled={loading}>
            + Tạo tài khoản
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            disabled={loading}>
            Làm mới
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <Input
          placeholder='Search accounts by username or email...'
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: "300px" }}
        />
      </div>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={filteredAccounts}
          rowKey='id'
          pagination={{
            pageSize: 10,
            total: filteredAccounts.length,
          }}
          bordered
          scroll={{ x: 1200 }}
        />
      </Spin>

      {/* Edit Brands Modal */}
      <Modal
        title={`Assign Brands to ${selectedAccount?.username}`}
        open={modalVisible}
        onOk={handleSaveBrands}
        onCancel={() => setModalVisible(false)}
        loading={saving}
        okText='Save'
        cancelText='Cancel'
        width={600}>
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "500",
            }}>
            Select Brands
          </label>
          <Select
            mode='multiple'
            placeholder='Select brands to assign'
            value={selectedBrandIds}
            onChange={setSelectedBrandIds}
            options={(allBrands || [])?.map((brand) => ({
              label: brand.name,
              value: brand.id,
            }))}
            style={{ width: "100%" }}
          />
          <p style={{ color: "#666", fontSize: "12px", marginTop: "8px" }}>
            The user will be able to see products associated with these brands.
          </p>
        </div>

        {selectedBrandIds.length > 0 && (
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
              }}>
              Selected Brands ({selectedBrandIds.length})
            </label>
            <Space wrap>
              {allBrands
                .filter((b) => selectedBrandIds.includes(b.id))
                .map((brand) => (
                  <Tag key={brand.id} color='blue'>
                    {brand.name}
                  </Tag>
                ))}
            </Space>
          </div>
        )}
      </Modal>

      {/* Create Account Modal */}
      <Modal
        title='Create New STAFF Account'
        open={createModalVisible}
        onOk={handleCreateAccount}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewAccount({ username: "", email: "" });
        }}
        loading={saving}
        okText='Create'
        cancelText='Cancel'
        width={500}>
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontWeight: "500",
            }}>
            Username *
          </label>
          <Input
            placeholder='Enter username (e.g., john_staff)'
            value={newAccount.username}
            onChange={(e) =>
              setNewAccount({ ...newAccount, username: e.target.value })
            }
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontWeight: "500",
            }}>
            Email *
          </label>
          <Input
            type='email'
            placeholder='Enter email address'
            value={newAccount.email}
            onChange={(e) =>
              setNewAccount({ ...newAccount, email: e.target.value })
            }
          />
        </div>

        <div
          style={{
            padding: "12px",
            backgroundColor: "#f0f5ff",
            borderRadius: "4px",
            borderLeft: "4px solid #1890ff",
          }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            <strong>ℹ️ Default Settings:</strong>
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>
            • Account type: <strong>STAFF</strong>
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>
            • Temporary password: <strong>123456</strong>
          </p>
          <p
            style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#ff4d4f" }}>
            • User must change password on first login
          </p>
        </div>
      </Modal>

      {/* Temporary Password Modal */}
      <Modal
        title='Account Created Successfully ✓'
        open={passwordModalVisible}
        onOk={() => setPasswordModalVisible(false)}
        onCancel={() => setPasswordModalVisible(false)}
        okText='Done'
        cancelText={null}
        width={500}>
        <div
          style={{
            padding: "16px",
            backgroundColor: "#f6ffed",
            borderRadius: "4px",
            borderLeft: "4px solid #52c41a",
            marginBottom: "16px",
          }}>
          <p style={{ margin: "0 0 8px 0", color: "#333" }}>
            <strong>Account created:</strong>{" "}
            <code>{createdAccountUsername}</code>
          </p>
          <p style={{ margin: "8px 0 0 0", color: "#333" }}>
            <strong>Temporary Password:</strong>
          </p>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px",
              alignItems: "center",
            }}>
            <code
              style={{
                padding: "8px 12px",
                backgroundColor: "#fff",
                borderRadius: "4px",
                border: "1px solid #d9d9d9",
                flex: 1,
                fontWeight: "bold",
                fontSize: "14px",
              }}>
              {tempPassword}
            </code>
            <Button
              type='primary'
              size='small'
              onClick={() => copyToClipboard(tempPassword)}>
              Copy
            </Button>
          </div>
        </div>

        <div
          style={{
            padding: "12px",
            backgroundColor: "#fff7e6",
            borderRadius: "4px",
            borderLeft: "4px solid #faad14",
          }}>
          <p style={{ margin: "0 0 8px 0", fontWeight: "500", color: "#333" }}>
            Important Steps:
          </p>
          <ol
            style={{
              margin: "8px 0 0 16px",
              paddingLeft: 0,
              fontSize: "12px",
            }}>
            <li>Share the username and temporary password with the user</li>
            <li>User must login with these credentials</li>
            <li>User will be forced to change password on first login</li>
            <li>Assign brand permissions in the table above</li>
          </ol>
        </div>
      </Modal>
    </div>
  );
}

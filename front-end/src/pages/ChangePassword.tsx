/** @format */

import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/services/api";
import { Alert, Button, Card, Form, Input, message } from "antd";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { setAuthSession, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await authAPI.changePassword(
        values.currentPassword,
        values.newPassword,
      );

      if (res.data.token && user) {
        // Update session with new token
        setAuthSession({ ...user, mustChangePassword: false }, res.data.token);
        message.success("Password changed successfully");
        navigate("/dashboard");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to change password";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4'>
      <Card className='w-full max-w-md bg-slate-900 border-slate-700'>
        <div className='mb-8 flex flex-col gap-4 text-center'>
          <div className='flex justify-center items-center mb-4'>
            <LockKeyhole size={40} className='text-emerald-400' />
          </div>
          <h1 className='text-2xl font-bold text-white'>Change Password</h1>
          <p className='text-slate-400 text-sm'>
            You must change your password before continuing
          </p>
        </div>

        {error && <Alert message={error} type='error' className='mb-4' />}

        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          autoComplete='off'
          className='gap-4 flex flex-col'>
          <Form.Item
            name='currentPassword'
            label={<span className='text-white'>Current Password</span>}
            rules={[
              { required: true, message: "Please enter current password" },
            ]}
            labelCol={{ style: { color: "#fff" } }}>
            <Input.Password
              placeholder='Enter current password'
              size='large'
              autoFocus
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name='newPassword'
            label={<span className='text-white'>New Password</span>}
            rules={[
              { required: true, message: "Please enter new password" },
              {
                min: 6,
                message: "Password must be at least 6 characters",
              },
            ]}
            labelCol={{ style: { color: "#fff" } }}>
            <Input.Password
              placeholder='Enter new password'
              size='large'
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name='confirmPassword'
            label={<span className='text-white'>Confirm Password</span>}
            rules={[{ required: true, message: "Please confirm password" }]}
            labelCol={{ style: { color: "#fff" } }}>
            <Input.Password
              placeholder='Confirm new password'
              size='large'
              disabled={loading}
            />
          </Form.Item>

          <Button
            type='primary'
            htmlType='submit'
            loading={loading}
            size='large'
            className='mt-4'
            block>
            Change Password
          </Button>
        </Form>
      </Card>
    </div>
  );
}

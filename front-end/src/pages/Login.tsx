/** @format */

import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/services/api";
import { Alert, Button, Card, Form, Input, message } from "antd";
import { LogIn, Package } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    setError("");
    setLoading(true);

    try {
      const res = await authAPI.login(values.username, values.password);
      const data = res.data;

      if (data.user && data.token) {
        setAuthSession(data.user, data.token);
        message.success("Đăng nhập thành công");

        // If must change password, redirect to change password page
        if (data.user.mustChangePassword) {
          navigate("/change-password");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Đăng nhập thất bại";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 px-4'>
      <div
        className='w-full max-w-md bg-slate-900 border border-slate-700'
        style={{
          padding: "10px",
        }}>
        <div className='mb-8 flex flex-col gap-4 text-center'>
          <div className='flex justify-center items-center mb-4 p-3  rounded-full border border-emerald-600/30'>
            <Package size={40} className='text-emerald-400' />
          </div>
          <h1 className='text-3xl font-bold text-white mb-2'>
            Quản lý Cảnh báo giá
          </h1>
          <p className='text-slate-400'>
            Hệ thống quản lý sản phẩm chuyên nghiệp
          </p>
        </div>

        <Card>
          {error && (
            <Alert message={error} type='error' showIcon className='mb-4' />
          )}

          <Form
            layout='vertical'
            form={form}
            onFinish={handleSubmit}
            className='space-y-4'>
            <Form.Item
              label={<span className='text-slate-300'>Tên đăng nhập</span>}
              name='username'
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập" },
              ]}>
              <Input
                placeholder='admin'
                disabled={loading}
                className='bg-slate-800 border-slate-700 text-white'
              />
            </Form.Item>

            <Form.Item
              label={<span className='text-slate-300'>Mật khẩu</span>}
              name='password'
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}>
              <Input.Password
                placeholder='••••••'
                disabled={loading}
                className='bg-slate-800 border-slate-700'
              />
            </Form.Item>

            <Button
              type='primary'
              htmlType='submit'
              block
              size='large'
              loading={loading}
              className='bg-emerald-600 hover:bg-emerald-700'>
              <LogIn size={16} className='mr-2' />
              Đăng nhập
            </Button>
          </Form>
        </Card>

        <div className='mt-10 text-center text-xs text-slate-400 bg-slate-900/50 border border-slate-700 rounded-lg p-4'>
          <p className='font-semibold text-slate-300 mb-2'>Demo Info:</p>
          <p className='font-mono text-slate-400'>admin / 123123</p>
        </div>
      </div>
    </div>
  );
}

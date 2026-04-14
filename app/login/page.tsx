'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogIn, AlertCircle, Loader } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đăng nhập thất bại');
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4 p-3 bg-emerald-600/20 rounded-full border border-emerald-600/30">
            <Package size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Quản lý Tiếp thị Liên kết
          </h1>
          <p className="text-slate-500">
            Hệ thống quản lý sản phẩm chuyên nghiệp
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
              disabled={loading}
              className="w-full h-10 bg-slate-800 border border-slate-700 rounded px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              disabled={loading}
              className="w-full h-10 bg-slate-800 border border-slate-700 rounded px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
            />
          </div>

          {error && (
            <div className="rounded bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            disabled={loading}>
            {loading ? (
              <>
                <Loader size={16} className="animate-spin mr-2" />
                Đang đăng nhập...
              </>
            ) : (
              <>
                <LogIn size={16} className="mr-2" />
                Đăng nhập
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <p className="font-semibold text-slate-400 mb-2">Thông tin đăng nhập mẫu:</p>
          <p className="font-mono text-slate-400">admin / 123123</p>
        </div>
      </div>
    </div>
  );
}

import { Package } from 'lucide-react';

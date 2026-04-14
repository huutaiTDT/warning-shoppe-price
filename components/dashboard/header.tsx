'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, LogOut } from 'lucide-react';

export function DashboardHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950 px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-300">Bảng điều khiển quản trị</span>
          <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">PRODUCTION</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 w-48"
          />
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-200">admin</p>
            <p className="text-xs text-slate-500">quản trị viên</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs h-8 text-slate-400 hover:text-slate-200">
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}

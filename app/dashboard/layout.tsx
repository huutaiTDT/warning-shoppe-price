/** @format */

import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex h-screen bg-slate-950 text-slate-50'>
      <Sidebar />
      <div className='flex-1 flex flex-col overflow-hidden'>
        <DashboardHeader />
        <main className='flex-1 overflow-auto bg-slate-950'>
          <div className='p-4'>{children}</div>
        </main>
      </div>
    </div>
  );
}

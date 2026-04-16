/** @format */

import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Toaster } from "sonner";
export default function Toast() {
  return (
    <Toaster
      position='top-right'
      theme='dark'
      toastOptions={{
        duration: 3000,
        style: {
          background: "#111111",
          color: "#e5e5e5",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(8px)",
        },
        classNames: {
          toast: "rounded-xl shadow-lg flex items-center gap-3 px-4 py-3",
          title: "text-sm font-semibold",
          description: "text-xs text-white/50",
          icon: "flex items-center justify-center",
          success: "bg-green-500/10",
          error: "bg-red-500/10",
          warning: "bg-yellow-500/10",
          info: "bg-blue-500/10",
        },
      }}
      icons={{
        success: <CheckCircle size={20} color='#22c55e' />,
        error: <AlertCircle size={20} color='#ef4444' />,
        warning: <AlertTriangle size={20} color='#f59e0b' />,
        info: <Info size={20} color='#3b82f6' />,
      }}
      expand
    />
  );
}

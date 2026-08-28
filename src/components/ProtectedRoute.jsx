"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export default function ProtectedRoute({ children }) {
  const user = useAppStore((state) => state.user);
  const loading = useAppStore((state) => state.authLoading);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7f8] px-6 dark:bg-[#0b1210]">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-black/5 bg-white px-10 py-8 shadow-xl shadow-emerald-950/5 dark:border-white/10 dark:bg-[#111b17]">
        <div className="size-10 animate-spin rounded-full border-[3px] border-emerald-900/15 border-t-[#176b4f] dark:border-white/10 dark:border-t-[#62c39d]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Preparing your workspace</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Verifying secure access…</p>
        </div>
      </div>
    </div>
  );

  return user ? children : null;
}

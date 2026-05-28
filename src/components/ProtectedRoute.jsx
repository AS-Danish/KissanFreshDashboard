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
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        {/* Circular spinner */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-green-600" />

        <p className="text-sm text-gray-600">Checking authentication...</p>
      </div>
    </div>
  );

  return user ? children : null;
}
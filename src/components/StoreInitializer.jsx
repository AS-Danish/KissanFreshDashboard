"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Toaster } from "sonner";

export function StoreInitializer({ children }) {
  const initAuth = useAppStore((state) => state.initAuth);

  useEffect(() => {
    const unsubscribeAuth = initAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [initAuth]);

  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton visibleToasts={4} />
    </>
  );
}

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Toaster } from "sonner";

export function StoreInitializer({ children }) {
  const initAuth = useAppStore((state) => state.initAuth);
  const fetchCategoriesAndSections = useAppStore((state) => state.fetchCategoriesAndSections);

  useEffect(() => {
    const unsubscribeAuth = initAuth();
    fetchCategoriesAndSections();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [initAuth, fetchCategoriesAndSections]);

  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  );
}

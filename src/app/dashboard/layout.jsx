"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useFCM } from "@/hooks/useFCM";
import { useAppStore } from "@/store/useAppStore";

export default function DashboardLayout({ children }) {
    const user = useAppStore((state) => state.user);
    useFCM(user?.uid);
    
    return <ProtectedRoute>{children}</ProtectedRoute>;
}
"use client";

import { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useFCM } from "@/hooks/useFCM";
import { useAppStore } from "@/store/useAppStore";

export default function DashboardLayout({ children }) {
    const user = useAppStore((state) => state.user);
    const fetchCategoriesAndSections = useAppStore((state) => state.fetchCategoriesAndSections);

    useEffect(() => {
        if (user?.uid) fetchCategoriesAndSections();
    }, [user?.uid, fetchCategoriesAndSections]);

    useFCM(user?.uid);
    
    return (
        <ProtectedRoute>
            <SidebarProvider
                className="dashboard-shell"
                style={{
                    "--sidebar-width": "18rem",
                    "--header-height": "4rem",
                }}
            >
                <AppSidebar variant="inset" />
                <SidebarInset className="dashboard-main">
                    <SiteHeader />
                    <main id="dashboard-content" className="dashboard-content">
                        {children}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    );
}

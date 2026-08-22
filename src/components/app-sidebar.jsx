"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconCalendarTime,
  IconBell,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { useAppStore } from "@/store/useAppStore"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const staticData = {
  user: {
    name: "Admin",
    email: "admin@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Product Management",
      url: "/dashboard/product-management",
      icon: IconFolder,
      items: [
        {
          title: "Kissan Fresh Products",
          url: "/dashboard/product-management/kissan-fresh",
        },
        {
          title: "Home Food Products",
          url: "/dashboard/product-management/home-food",
        },
        {
          title: "Today's Special",
          url: "/dashboard/product-management/todays-special",
        },
      ]
    },
    {
      title: "Stock Management",
      url: "/dashboard/stock-management",
      icon: IconDatabase,
      items: [
        {
          title: "Kissan Fresh Stock",
          url: "/dashboard/stock-management/kissan-fresh",
        },
        {
          title: "Home Food Stock",
          url: "/dashboard/stock-management/home-food",
        },
      ]
    },
    {
      title: "Order Management",
      url: "/dashboard/order-management",
      icon: IconListDetails,
    },
    {
      title: "Rider Management",
      url: "/dashboard/rider-management",
      icon: IconUsers,
    },
    {
      title: "Slot Management",
      url: "/dashboard/slots-management",
      icon: IconCalendarTime,
    },
    {
      title: "Manage Categories",
      url: "/dashboard/category-management",
      icon: IconListDetails,
    },
    {
      title: "Offers Notification",
      url: "/dashboard/offers",
      icon: IconBell,
    },
    {
      title: "Coupon Management",
      url: "/dashboard/coupon-management",
      icon: IconReport,
      items: [
        {
          title: "Kissan Fresh Coupons",
          url: "/dashboard/coupon-management/kissan-fresh",
        },
        {
          title: "Home Food Coupons",
          url: "/dashboard/coupon-management/home-food",
        },
      ]
    },
    {
      title: "Theme Management",
      url: "/dashboard/theme-management",
      icon: IconCamera,
    },
    {
      title: "User Management",
      url: "/dashboard/user-management",
      icon: IconUsers,
      adminOnly: true,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
  ],
  documents: [
    {
      name: "Sales Report",
      url: "/dashboard/reports/sales",
      icon: IconReport,
    },
    {
      name: "Audit Logs",
      url: "/dashboard/reports/audit",
      icon: IconListDetails,
    },
  ],
}

export function AppSidebar({
  ...props
}) {
  const { user, userRole, userPermissions } = useAppStore();

  const isManagement = userRole === "MANAGEMENT";

  // Filter navigation based on permissions
  const filteredNavMain = staticData.navMain.filter((item) => {
    if (item.adminOnly && userRole !== "ADMIN") return false;
    if (item.title === "Dashboard") return true; // Always show dashboard
    if (isManagement) {
      return !!userPermissions?.[item.title];
    }
    return true; // Admin sees everything
  });

  const filteredDocuments = staticData.documents.filter((item) => {
    if (isManagement) {
      return !!userPermissions?.[item.name];
    }
    return true;
  });

  const userData = {
    name: user?.displayName || userRole || "Admin",
    email: user?.email || "",
    avatar: staticData.user.avatar,
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Kissan Fresh</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        <NavDocuments items={filteredDocuments} />
        <NavSecondary items={staticData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}

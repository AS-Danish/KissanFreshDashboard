"use client"

import Link from "next/link"
import {
  IconBell,
  IconCalendarTime,
  IconClipboardList,
  IconDashboard,
  IconDatabase,
  IconFolders,
  IconLeaf,
  IconListDetails,
  IconPalette,
  IconReportAnalytics,
  IconSettings,
  IconShoppingBag,
  IconTags,
  IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
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

const navigationGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        title: "Product Management",
        url: "/dashboard/product-management",
        icon: IconShoppingBag,
        items: [
          { title: "Kissan Fresh", url: "/dashboard/product-management/kissan-fresh" },
          { title: "Home Food", url: "/dashboard/product-management/home-food" },
          { title: "Today's Special", url: "/dashboard/product-management/todays-special" },
        ],
      },
      {
        title: "Stock Management",
        url: "/dashboard/stock-management",
        icon: IconDatabase,
        items: [
          { title: "Kissan Fresh", url: "/dashboard/stock-management/kissan-fresh" },
          { title: "Home Food", url: "/dashboard/stock-management/home-food" },
        ],
      },
      { title: "Categories", permission: "Manage Categories", url: "/dashboard/category-management", icon: IconFolders },
      {
        title: "Coupons",
        permission: "Coupon Management",
        url: "/dashboard/coupon-management",
        icon: IconTags,
        items: [
          { title: "Kissan Fresh", url: "/dashboard/coupon-management/kissan-fresh" },
          { title: "Home Food", url: "/dashboard/coupon-management/home-food" },
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Order Management", url: "/dashboard/order-management", icon: IconClipboardList },
      { title: "Rider Management", url: "/dashboard/rider-management", icon: IconUsers },
      { title: "Slot Management", url: "/dashboard/slots-management", icon: IconCalendarTime },
      { title: "Offer Notifications", permission: "Offers Notification", url: "/dashboard/offers", icon: IconBell },
    ],
  },
  {
    label: "Experience",
    items: [
      { title: "Theme Management", url: "/dashboard/theme-management", icon: IconPalette },
      { title: "Settings", url: "/dashboard/settings", icon: IconSettings },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "User Management", url: "/dashboard/user-management", icon: IconUsers, adminOnly: true },
    ],
  },
]

const reports = [
  { name: "Sales Report", url: "/dashboard/reports/sales", icon: IconReportAnalytics },
  { name: "Audit Logs", url: "/dashboard/reports/audit", icon: IconListDetails },
]

export function AppSidebar(props) {
  const { userRole, userPermissions } = useAppStore()
  const isManagement = userRole === "MANAGEMENT"

  const canAccess = (item) => {
    if (item.adminOnly) return userRole === "ADMIN"
    if (!isManagement || item.title === "Dashboard") return true
    return Boolean(userPermissions?.[item.permission || item.title])
  }

  const visibleGroups = navigationGroups
    .map((group) => ({ ...group, items: group.items.filter(canAccess) }))
    .filter((group) => group.items.length > 0)

  const visibleReports = reports.filter((item) =>
    !isManagement || Boolean(userPermissions?.[item.name]),
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="h-12 px-2 hover:bg-sidebar-accent">
              <Link href="/dashboard" aria-label="Kissan Fresh dashboard home">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white text-[#176b4f] shadow-sm">
                  <IconLeaf className="size-5" stroke={2.2} />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-[15px] font-bold tracking-tight">Kissan Fresh</span>
                  <span className="truncate text-[11px] text-sidebar-foreground/60">Commerce operations</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0 px-2 py-2">
        {visibleGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
        {visibleReports.length > 0 && <NavDocuments items={visibleReports} />}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

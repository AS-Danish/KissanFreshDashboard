"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconChevronRight, IconHome } from "@tabler/icons-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const titleOverrides = {
  dashboard: "Dashboard",
  "product-management": "Products",
  "stock-management": "Inventory",
  "order-management": "Orders",
  "rider-management": "Riders",
  "slots-management": "Delivery slots",
  "category-management": "Categories",
  "coupon-management": "Coupons",
  offers: "Notifications",
  "theme-management": "App themes",
  "user-management": "Team access",
  reports: "Reports",
}

const moduleLandingPaths = {
  "product-management": "/dashboard/product-management/kissan-fresh",
  "stock-management": "/dashboard/stock-management/kissan-fresh",
  "coupon-management": "/dashboard/coupon-management/kissan-fresh",
  "order-management": "/dashboard/order-management",
  "user-management": "/dashboard/user-management",
  reports: "/dashboard/reports/sales",
}

function segmentTitle(segment) {
  return titleOverrides[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function currentPageTitle(segments) {
  const last = segments.at(-1) || "dashboard"
  const previous = segments.at(-2)
  if (last === "new") return "Create new"
  if (last === "permissions") return "Permissions"
  if (previous === "edit") return "Edit"
  if (segments.includes("order-management") && previous === "order-management") return "Order details"
  if (segments.includes("product-management") && !titleOverrides[last] && !["kissan-fresh", "home-food"].includes(last)) return "Product details"
  return segmentTitle(last)
}

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const pageTitle = currentPageTitle(segments)

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center border-b border-border/80 bg-background/88 backdrop-blur-xl">
      <div className="flex w-full min-w-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <SidebarTrigger className="-ml-1 size-9 rounded-lg border border-border bg-card shadow-sm hover:bg-accent" />
        <div className="min-w-0 flex-1">
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" aria-label="Breadcrumb">
            <Link href="/dashboard" className="rounded-sm hover:text-foreground" aria-label="Dashboard home">
              <IconHome className="size-3.5" />
            </Link>
            {segments.slice(1).map((segment, index) => {
              const href = `/${segments.slice(0, index + 2).join("/")}`
              const isLast = index === segments.length - 2
              const previousSegment = segments[index]
              const isProductType = ["kissan-fresh", "home-food"].includes(segment)
                && ["product-management", "stock-management", "coupon-management"].includes(previousSegment)
              const navigableHref = moduleLandingPaths[segment] || (isProductType ? href : null)
              return (
                <Fragment key={href}>
                  <IconChevronRight className="size-3 text-muted-foreground/55" />
                  {isLast ? (
                    <span className="max-w-48 truncate font-medium text-foreground">{segmentTitle(segment)}</span>
                  ) : navigableHref ? (
                    <Link href={navigableHref} className="max-w-36 truncate hover:text-foreground">{segmentTitle(segment)}</Link>
                  ) : (
                    <span className="max-w-36 truncate">{segmentTitle(segment)}</span>
                  )}
                </Fragment>
              )
            })}
          </div>
          <h1 className="truncate text-sm font-semibold text-foreground sm:hidden">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

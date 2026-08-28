"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavDocuments({ items }) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="py-2 group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/45">
        Reports
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.url}
              className="h-10 rounded-lg px-3 font-medium data-[active=true]:bg-white data-[active=true]:text-[#15543f] data-[active=true]:shadow-sm"
            >
              <Link href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

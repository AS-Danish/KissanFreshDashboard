"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronRight } from "@tabler/icons-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  label,
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="py-2">
      {label && <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/45">{label}</SidebarGroupLabel>}
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => {
            // Determine active state: exact match for /dashboard, startsWith for others
            const isActive = item.url === '/dashboard'
              ? pathname === item.url
              : pathname.startsWith(item.url);

            if (item.items && item.items.length > 0) {
              return (
                <Collapsible
                  key={`${item.title}-${isActive}`}
                  asChild
                  defaultOpen={isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isActive} className="h-10 rounded-lg px-3 font-medium data-[active=true]:bg-white data-[active=true]:text-[#15543f] data-[active=true]:shadow-sm">
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem
                            key={subItem.title}
                            className="group/subitem"
                          >
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                              className="h-9 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-white"
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild className="h-10 rounded-lg px-3 font-medium data-[active=true]:bg-white data-[active=true]:text-[#15543f] data-[active=true]:shadow-sm">
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

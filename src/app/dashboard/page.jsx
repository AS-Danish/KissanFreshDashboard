"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getOrderStats, getPaginatedOrders, getChartData } from "@/services/orderService"
import { db } from "@/firebase/config"
import { doc, getDoc } from "firebase/firestore"

export default function Page() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [statsData, ordersData, chartDataRes] = await Promise.all([
          getOrderStats(),
          getPaginatedOrders(10), // Fetch top 10 recent orders
          getChartData(90)
        ]);
        setStats(statsData);
        setChartData(chartDataRes);
        
        // Fetch users map for customer names
        const userIds = [...new Set(ordersData.orders.map(o => o.userId).filter(Boolean))];
        const userPromises = userIds.map(id => getDoc(doc(db, "users", id)));
        const userSnaps = await Promise.all(userPromises);
        const usersMap = {};
        userSnaps.forEach(snap => {
            if (snap.exists()) {
                usersMap[snap.id] = snap.data().name || snap.data().displayName || "Unknown User";
            }
        });

        // Format the recent orders for the DataTable
        const formattedOrders = ordersData.orders.map(order => {
          let formattedStatus = "Pending";
          if (order.status) {
            formattedStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase();
          }

          let formattedDate = "Unknown";
          if (order.orderDate) {
             const dateObj = typeof order.orderDate === 'string' ? new Date(order.orderDate) : 
                            (order.orderDate.toDate ? order.orderDate.toDate() : new Date());
             formattedDate = dateObj.toLocaleString();
          } else if (order.createdAt) {
             const dateObj = typeof order.createdAt === 'string' ? new Date(order.createdAt) : 
                            (order.createdAt.toDate ? order.createdAt.toDate() : new Date());
             formattedDate = dateObj.toLocaleString();
          }

          return {
            id: order.id,
            status: formattedStatus,
            orderTime: formattedDate,
            customerName: usersMap[order.userId] || order.customerName || order.userName || "Guest"
          };
        });
        
        setRecentOrders(formattedOrders);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)"
        }
      }>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards stats={stats} loading={loading} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive chartData={chartData} loading={loading} />
              </div>
              <DataTable data={recentOrders} loading={loading} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

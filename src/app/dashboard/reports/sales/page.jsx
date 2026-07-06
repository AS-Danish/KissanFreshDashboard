"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOrdersByDateRange } from "@/services/orderService";
import * as XLSX from "xlsx";
import { IconDownload, IconSearch } from "@tabler/icons-react";
import { toast } from "sonner";

export default function SalesReportPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    // Default to last 30 days
    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        
        setEndDate(end.toISOString().split("T")[0]);
        setStartDate(start.toISOString().split("T")[0]);
    }, []);

    const fetchReport = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        try {
            // Add time to cover full day of endDate
            const endOfDay = `${endDate}T23:59:59.999Z`;
            const startOfDay = `${startDate}T00:00:00.000Z`;
            const data = await getOrdersByDateRange(startOfDay, endOfDay);
            setOrders(data);
            if (data.length === 0) {
                toast.info("No orders found in this date range.");
            }
        } catch (error) {
            console.error("Error fetching report:", error);
            toast.error("Failed to fetch report.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (orders.length === 0) {
            toast.error("No data to export.");
            return;
        }

        const excelData = [];

        orders.forEach(order => {
            const baseRow = {
                "Order ID": order.id,
                "Order Number": order.orderNumber,
                "Order Date": new Date(order.orderDate).toLocaleString(),
                "Status": order.status,
                "Customer ID": order.userId,
                "Total Items Quantity": order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0,
                "Subtotal (₹)": order.subtotal || 0,
                "Delivery Fee (₹)": order.deliveryFee || 0,
                "Order Discount (₹)": order.discount || 0,
                "Coupon Discount (₹)": order.couponDiscount || 0,
                "Total Amount (₹)": order.totalAmount || 0,
                "Payment Method": order.paymentMethod || order.orderType || "N/A",
                "Slot": order.slotId || "N/A",
                "Rider": order.riderId || "N/A"
            };

            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    excelData.push({
                        ...baseRow,
                        "Product ID": item.id || item.productId,
                        "Product Name": item.name,
                        "Product Origin": item.productOrigin || "N/A",
                        "Item Quantity": item.quantity,
                        "Item MRP (₹)": item.mrp || item.price,
                        "Item Discount (%)": item.discountPercentage || 0,
                        "Item Selling Price (₹)": item.price,
                        "Item Total (₹)": (item.price * item.quantity).toFixed(2)
                    });
                });
            } else {
                excelData.push(baseRow);
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

        XLSX.writeFile(workbook, `Sales_Report_${startDate}_to_${endDate}.xlsx`);
    };

    // Aggregate summary for UI display
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const totalDelivered = orders.filter(o => o.status === "DELIVERED").length;

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-7xl mx-auto w-full">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Sales Report</h2>
                        <Button onClick={handleExportExcel} disabled={orders.length === 0} className="flex items-center gap-2">
                            <IconDownload className="h-4 w-4" />
                            Export Excel
                        </Button>
                    </div>

                    <Card className="border-0 shadow-sm relative overflow-hidden">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle>Filter Report</CardTitle>
                            <CardDescription>Select a date range to generate the sales report.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Start Date</label>
                                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">End Date</label>
                                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                                <Button onClick={fetchReport} disabled={loading} className="flex items-center gap-2">
                                    {loading ? <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : <IconSearch className="h-4 w-4" />}
                                    Generate Report
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {orders.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{orders.length}</div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Delivered Orders</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalDelivered}</div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Gross Revenue</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <Card className="border-0 shadow-sm relative overflow-hidden flex-1 flex flex-col min-h-[400px]">
                        <CardHeader className="border-b border-border/50">
                            <CardTitle>Report Preview</CardTitle>
                            <CardDescription>Showing recent orders from the generated report.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-auto flex-1">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead>Order Number</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead className="text-right">Total Amount (₹)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                                No data available. Please generate a report.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.slice(0, 50).map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                                <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                                                <TableCell>{order.status}</TableCell>
                                                <TableCell>{order.items?.length || 0}</TableCell>
                                                <TableCell className="text-right font-bold">{order.totalAmount?.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {orders.length > 50 && (
                                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                                    Showing first 50 orders. Export to Excel to see all {orders.length} orders.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

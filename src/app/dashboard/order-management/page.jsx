"use client"

import { useState, useMemo, useEffect } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
    IconSearch, 
    IconChevronLeft, 
    IconChevronRight, 
    IconExternalLink, 
    IconPackage, 
    IconTruck, 
    IconCheck, 
    IconX, 
    IconFilter,
    IconRefresh,
    IconClipboard,
    IconClipboardCheck,
    IconCoin,
    IconCalendar,
    IconClock
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ITEMS_PER_PAGE = 10;

function formatSlotDisplay(slotId) {
    if (!slotId) return { date: "No Slot", time: "Unassigned" };
    try {
        const [datePart, hourPart] = slotId.split('_');
        const [year, month, day] = datePart.split('-');
        const hourObj = parseInt(hourPart, 10);
        const ampmStart = hourObj >= 12 ? 'PM' : 'AM';
        const startH = hourObj % 12 || 12;
        const nextHourObj = hourObj + 1;
        const ampmEnd = nextHourObj >= 12 && nextHourObj < 24 ? 'PM' : 'AM';
        const endH = nextHourObj % 12 || 12;
        return {
            date: `${day}-${month}-${year}`,
            time: `${startH}:00 ${ampmStart} - ${endH}:00 ${ampmEnd}`
        }
    } catch {
        return { date: slotId, time: "" }
    }
}

const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
        case "ASSIGNED":
            return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800"
        case "PROCESSING":
            return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
        case "OUT FOR DELIVERY":
            return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
        case "SHIPPED":
            return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
        case "DELIVERED":
            return "bg-secondary/10 text-secondary border-secondary/20 dark:bg-secondary/20 dark:text-secondary-foreground"
        case "CANCELLED":
            return "bg-destructive/10 text-destructive border-destructive/20"
        default:
            return "bg-muted text-muted-foreground border-border"
    }
}

const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
        case "ASSIGNED":
            return <IconCheck className="h-3.5 w-3.5" />
        case "PROCESSING":
            return <IconPackage className="h-3.5 w-3.5" />
        case "OUT FOR DELIVERY":
            return <IconTruck className="h-3.5 w-3.5" />
        case "SHIPPED":
            return <IconTruck className="h-3.5 w-3.5" />
        case "DELIVERED":
            return <IconCheck className="h-3.5 w-3.5" />
        case "CANCELLED":
            return <IconX className="h-3.5 w-3.5" />
        default:
            return null
    }
}

export default function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalOrders: 0, processingOrders: 0, shippedOrders: 0, grossRevenue: 0 });
    const router = useRouter();
    const [ridersMap, setRidersMap] = useState({});
    const [usersMap, setUsersMap] = useState({});
    
    // Pagination states
    const [cursorHistory, setCursorHistory] = useState([null]);
    const [hasMore, setHasMore] = useState(true);
    const [algoliaTotalPages, setAlgoliaTotalPages] = useState(1);
    const [algoliaTotalHits, setAlgoliaTotalHits] = useState(0);

    const loadStats = async () => {
        const { getOrderStats } = await import("@/services/orderService");
        const newStats = await getOrderStats();
        setStats(newStats);
    };

    const fetchRelatedData = async (ordersList) => {
        const userIds = [...new Set(ordersList.map(o => o.userId).filter(Boolean))];
        const riderIds = [...new Set(ordersList.map(o => o.riderId).filter(Boolean))];
        
        // Fetch only needed users/riders (could be optimized with batched getDocs, using basic Promise.all for simplicity)
        const { getDoc, doc } = await import("firebase/firestore");
        
        const newUsersMap = { ...usersMap };
        const newRidersMap = { ...ridersMap };
        
        const userPromises = userIds.filter(id => !newUsersMap[id]).map(id => getDoc(doc(db, "users", id)));
        const riderPromises = riderIds.filter(id => !newRidersMap[id]).map(id => getDoc(doc(db, "riders", id)));
        
        const userSnaps = await Promise.all(userPromises);
        const riderSnaps = await Promise.all(riderPromises);
        
        userSnaps.forEach(snap => {
            if (snap.exists()) {
                newUsersMap[snap.id] = snap.data().name || snap.data().displayName || "Unknown User";
            }
        });
        
        riderSnaps.forEach(snap => {
            if (snap.exists()) {
                newRidersMap[snap.id] = snap.data().name;
                if (snap.data().riderId) newRidersMap[snap.data().riderId] = snap.data().name;
            }
        });
        
        setUsersMap(newUsersMap);
        setRidersMap(newRidersMap);
    };

    const loadOrders = async (pageIndex, reset = false) => {
        setLoading(true);
        try {
            if (searchQuery.trim() !== "") {
                const { performSearch } = await import("@/lib/algolia");
                
                let facetFilters = [];
                if (statusFilter !== "all") facetFilters.push(`status:${statusFilter}`);

                const options = {
                    page: pageIndex - 1,
                    hitsPerPage: ITEMS_PER_PAGE,
                    facetFilters
                };

                const { hits, nbPages, nbHits } = await performSearch("orders", searchQuery, options);
                const mappedOrders = hits.map(hit => ({ ...hit, id: hit.objectID }));
                
                setOrders(mappedOrders);
                setAlgoliaTotalPages(nbPages);
                setAlgoliaTotalHits(nbHits);
                setHasMore(pageIndex < nbPages);
                await fetchRelatedData(mappedOrders);
            } else {
                const { getPaginatedOrders } = await import("@/services/orderService");
                const currentCursor = reset ? null : cursorHistory[pageIndex - 1];
                
                const { orders: fetchedOrders, lastVisible, hasMore: more } = await getPaginatedOrders(
                    ITEMS_PER_PAGE, 
                    currentCursor, 
                    statusFilter
                );
                
                setOrders(fetchedOrders);
                setHasMore(more);
                await fetchRelatedData(fetchedOrders);
                
                if (reset) {
                    setCursorHistory([null, lastVisible]);
                } else if (pageIndex === cursorHistory.length && more) {
                    setCursorHistory(prev => [...prev, lastVisible]);
                }
            }
        } catch (error) {
            console.error("Error loading orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        loadOrders(1, true);
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        if (currentPage > 1) {
            loadOrders(currentPage, false);
        }
    }, [currentPage]);

    const isAlgoliaMode = searchQuery.trim() !== "";
    const totalPages = isAlgoliaMode ? algoliaTotalPages : (hasMore ? currentPage + 1 : currentPage);
    const paginatedOrders = orders;

    const handleViewDetails = (order) => {
        router.push(`/dashboard/order-management/${order.id}`);
    };

    const handleQuickStatusUpdate = async (e, orderId, newStatus) => {
        e.stopPropagation();
        try {
            const orderRef = doc(db, "orders", orderId)
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: new Date().toISOString()
            })
            toast.success(`Order status: ${newStatus}`)
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error("Process failed")
        }
    };

    const copyToClipboard = (e, text, id) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast.info("ID Copied");
    }

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}>
            <AppSidebar variant="inset" />
            <SidebarInset className="bg-background">
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-8 p-6 md:p-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase">
                            Order Management
                        </h2>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Orders</p>
                                    <h3 className="text-2xl font-bold text-foreground">{stats.totalOrders}</h3>
                                </div>
                                <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                                    <IconPackage className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Processing</p>
                                    <h3 className="text-2xl font-bold text-foreground">{stats.processingOrders}</h3>
                                </div>
                                <div className="h-10 w-10 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center">
                                    <IconRefresh className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Transit</p>
                                    <h3 className="text-2xl font-bold text-foreground">{stats.shippedOrders}</h3>
                                </div>
                                <div className="h-10 w-10 bg-purple-500/10 text-purple-600 rounded-lg flex items-center justify-center">
                                    <IconTruck className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross Revenue</p>
                                    <h3 className="text-2xl font-bold text-foreground">₹{stats.grossRevenue.toLocaleString()}</h3>
                                </div>
                                <div className="h-10 w-10 bg-secondary/10 text-secondary rounded-lg flex items-center justify-center">
                                    <IconCoin className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                            <div className="relative w-full md:w-2/3 lg:w-1/2">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                                <Input
                                    type="search"
                                    placeholder="Search orders..."
                                    className="w-full pl-10 h-12 bg-background border-border/50 shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-1/3 lg:w-1/4">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-12 bg-background border-border/50 shadow-sm">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs font-semibold uppercase">All Status</SelectItem>
                                        <SelectItem value="ASSIGNED" className="text-xs font-semibold uppercase text-indigo-600">Assigned</SelectItem>
                                        <SelectItem value="PROCESSING" className="text-xs font-semibold uppercase text-blue-600">Processing</SelectItem>
                                        <SelectItem value="OUT FOR DELIVERY" className="text-xs font-semibold uppercase text-amber-600">Out for Delivery</SelectItem>
                                        <SelectItem value="SHIPPED" className="text-xs font-semibold uppercase text-purple-600">In Transit</SelectItem>
                                        <SelectItem value="DELIVERED" className="text-xs font-semibold uppercase text-secondary">Delivered</SelectItem>
                                        <SelectItem value="CANCELLED" className="text-xs font-semibold uppercase text-destructive">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-foreground px-6 py-4">Order ID</TableHead>
                                        <TableHead className="font-semibold text-foreground">Date & Time</TableHead>
                                        <TableHead className="font-semibold text-foreground">Customer</TableHead>
                                        <TableHead className="font-semibold text-foreground">Method</TableHead>
                                        <TableHead className="font-semibold text-foreground">Assignment</TableHead>
                                        <TableHead className="font-semibold text-foreground">Amount</TableHead>
                                        <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground px-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-32">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center animate-pulse">
                                                        <IconRefresh className="h-8 w-8 text-primary animate-spin" />
                                                    </div>
                                                    <span className="text-xs font-black tracking-[0.2em] text-primary uppercase">Synchronizing Records...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : paginatedOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-32">
                                                <div className="flex flex-col items-center gap-6">
                                                    <div className="h-24 w-24 bg-muted/50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-border">
                                                        <IconSearch className="h-10 w-10 text-muted-foreground/30" />
                                                    </div>
                                                    <div className="text-center space-y-2">
                                                        <p className="text-xl font-black uppercase text-primary tracking-tight">Zero Results Found</p>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">No matching order entries in the manifest.</p>
                                                    </div>
                                                    <Button variant="outline" onClick={() => {setSearchQuery(""); setStatusFilter("all")}} className="rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] h-11 px-8">
                                                        Purge Filters
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedOrders.map((order) => (
                                            <TableRow 
                                                key={order.id} 
                                                className="group cursor-pointer hover:bg-primary/[0.01] transition-all border-b last:border-0" 
                                                onClick={() => handleViewDetails(order)}
                                            >
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm">{order.orderNumber}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter opacity-60">ID: {order.id.substring(0, 10)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col whitespace-nowrap">
                                                        <span className="font-medium text-sm">{new Date(order.orderDate).toLocaleDateString()}</span>
                                                        <span className="text-[10px] text-muted-foreground">{new Date(order.orderDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                            {(usersMap[order.userId] || 'U')?.substring(0, 1).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden max-w-[140px]">
                                                            <span className="text-sm font-medium truncate">{usersMap[order.userId] || 'Guest User'}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate uppercase font-mono tracking-tighter opacity-60">ID: {order.userId?.substring(0, 10)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${(order.orderType || order.paymentMethod)?.toUpperCase() === 'COD' || (order.orderType || order.paymentMethod)?.toUpperCase() === 'CASH' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                        {(order.orderType || order.paymentMethod)?.toUpperCase() === 'COD' || (order.orderType || order.paymentMethod)?.toUpperCase() === 'CASH' ? 'COD' : 'Online'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        {order.slotId ? (
                                                            <div className="flex flex-col gap-0.5 mb-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <IconCalendar className="h-3.5 w-3.5 text-primary" />
                                                                    <span className="text-xs font-semibold whitespace-nowrap text-primary">{formatSlotDisplay(order.slotId).date}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <IconClock className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{formatSlotDisplay(order.slotId).time}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground uppercase opacity-60">No Slot</span>
                                                        )}
                                                        {order.riderId ? (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <IconTruck className="h-3.5 w-3.5 text-blue-600" />
                                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-400 max-w-[100px] truncate">{ridersMap[order.riderId] || 'Unknown Rider'}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground uppercase opacity-60">Unassigned</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-bold text-sm text-primary tracking-tight">₹{Number(order.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={`${getStatusColor(order.status)} px-3 py-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider justify-center w-[130px] mx-auto`}>
                                                        {getStatusIcon(order.status)}
                                                        {order.status?.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right px-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {order.status?.toUpperCase() === 'ASSIGNED' && (
                                                            <Button 
                                                                size="sm" 
                                                                className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 text-[11px] uppercase font-black tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                                                onClick={(e) => handleQuickStatusUpdate(e, order.id, 'OUT FOR DELIVERY')}
                                                            >
                                                                <IconTruck className="h-4 w-4 mr-2" />
                                                                Dispatch
                                                            </Button>
                                                        )}
                                                        {order.status?.toUpperCase() === 'OUT FOR DELIVERY' && (
                                                            <Button 
                                                                size="sm" 
                                                                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 text-[11px] uppercase font-black tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                                                                onClick={(e) => handleQuickStatusUpdate(e, order.id, 'DELIVERED')}
                                                            >
                                                                <IconCheck className="h-4 w-4 mr-2" />
                                                                Delivered
                                                            </Button>
                                                        )}
                                                        {(order.status?.toUpperCase() !== 'ASSIGNED' && order.status?.toUpperCase() !== 'OUT FOR DELIVERY' && order.status?.toUpperCase() !== 'DELIVERED') && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="default"
                                                                className="h-9 rounded-xl px-4 text-[11px] uppercase font-black tracking-widest shadow-lg active:scale-95 transition-all"
                                                                onClick={(e) => { e.stopPropagation(); handleViewDetails(order); }}
                                                            >
                                                                Process Order
                                                            </Button>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 border-2 rounded-xl text-primary hover:bg-primary/5 hover:border-primary/20 transition-all shadow-sm"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <IconRefresh className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-[200px] rounded-2xl shadow-2xl border-2 p-2 bg-white dark:bg-card">
                                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground p-3">Lifecycle Control</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={(e) => handleQuickStatusUpdate(e, order.id, 'PROCESSING')} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-blue-900/20">
                                                                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                                        <IconPackage className="h-4 w-4 text-blue-600" />
                                                                    </div>
                                                                    Processing
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => handleQuickStatusUpdate(e, order.id, 'OUT FOR DELIVERY')} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight focus:bg-amber-50 focus:text-amber-700 dark:focus:bg-amber-900/20">
                                                                    <div className="h-8 w-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                                                        <IconTruck className="h-4 w-4 text-amber-600" />
                                                                    </div>
                                                                    Out for Delivery
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => handleQuickStatusUpdate(e, order.id, 'SHIPPED')} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight focus:bg-purple-50 focus:text-purple-700 dark:focus:bg-purple-900/20">
                                                                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                                                        <IconTruck className="h-4 w-4 text-purple-600" />
                                                                    </div>
                                                                    In Transit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => handleQuickStatusUpdate(e, order.id, 'DELIVERED')} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight focus:bg-secondary/10 focus:text-secondary dark:focus:bg-secondary/20">
                                                                    <div className="h-8 w-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                                                                        <IconCheck className="h-4 w-4 text-secondary" />
                                                                    </div>
                                                                    Delivered
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={(e) => handleQuickStatusUpdate(e, order.id, 'CANCELLED')} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight focus:bg-red-50 focus:text-destructive text-destructive dark:focus:bg-red-900/20">
                                                                    <div className="h-8 w-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                                                        <IconX className="h-4 w-4" />
                                                                    </div>
                                                                    Void Order
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-10 w-10 border-2 rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDetails(order);
                                                            }}
                                                        >
                                                            <IconExternalLink className="h-4 w-4" />
                                                            <span className="sr-only">Inspect Brief</span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border bg-card rounded-xl py-3 px-4 shadow-sm">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-medium text-foreground">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, isAlgoliaMode ? algoliaTotalHits : ((currentPage - 1) * ITEMS_PER_PAGE) + orders.length)}</span> of <span className="font-medium text-foreground">{isAlgoliaMode ? algoliaTotalHits : 'Many'}</span> orders
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="border-border/50 hover:bg-muted/50"
                                >
                                    <IconChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="text-sm font-medium px-2">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="border-border/50 hover:bg-muted/50"
                                >
                                    Next
                                    <IconChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

            </SidebarInset>
        </SidebarProvider>
    );
}

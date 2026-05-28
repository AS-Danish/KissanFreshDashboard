"use client"

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore"
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
import { Skeleton } from "@/components/ui/skeleton"
import { IconEdit, IconTrash, IconSearch, IconChevronLeft, IconChevronRight, IconCheck, IconX } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"

const ITEMS_PER_PAGE = 10;

export default function CouponManagement() {
    const params = useParams();
    const productType = params.productType; // "kissan-fresh" or "home-food"

    const [coupons, setCoupons] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "coupons"), (snapshot) => {
            let couponData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter to include only coupons matching the current type
            couponData = couponData.filter(c => c.productType === productType);

            couponData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setCoupons(couponData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [productType]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this coupon?")) {
            try {
                await deleteDoc(doc(db, "coupons", id));
            } catch (error) {
                console.error("Error deleting coupon: ", error);
                alert("Failed to delete coupon.");
            }
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await updateDoc(doc(db, "coupons", id), {
                isActive: !currentStatus
            });
        } catch (error) {
            console.error("Error updating coupon status: ", error);
            alert("Failed to update status.");
        }
    };

    const filteredCoupons = useMemo(() => {
        return coupons.filter((coupon) => {
            const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase());
            let matchesStatus = true;
            if (statusFilter === "active") matchesStatus = coupon.isActive === true;
            if (statusFilter === "inactive") matchesStatus = coupon.isActive === false;
            
            return matchesSearch && matchesStatus;
        });
    }, [coupons, searchQuery, statusFilter]);

    const totalPages = Math.ceil(filteredCoupons.length / ITEMS_PER_PAGE) || 1;
    const paginatedCoupons = filteredCoupons.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useMemo(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            {productType === "home-food" ? "Home Food Coupons" : "Kissan Fresh Coupons"}
                        </h2>
                        <Link href={`/dashboard/coupon-management/${productType}/new`}>
                            <Button shadow="md">Create New Coupon</Button>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                        <div className="relative w-full md:w-1/3">
                            <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search coupon code..."
                                className="w-full pl-8 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-1/4">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-semibold text-foreground/80">Code</TableHead>
                                    <TableHead className="font-semibold text-foreground/80">Discount</TableHead>
                                    <TableHead className="font-semibold text-foreground/80">Applies To</TableHead>
                                    <TableHead className="font-semibold text-foreground/80">Usage</TableHead>
                                    <TableHead className="font-semibold text-foreground/80">Status</TableHead>
                                    <TableHead className="text-right font-semibold text-foreground/80">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedCoupons.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <IconSearch className="size-8 opacity-20" />
                                                <p className="font-medium">No coupons found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedCoupons.map((coupon) => (
                                        <TableRow key={coupon.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="inline-block px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md font-mono tracking-wider font-bold uppercase">
                                                    {coupon.code}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-foreground/80">
                                                {coupon.discountType === "percentage" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                                                {coupon.minOrderValue > 0 && <span className="block text-[10px] text-muted-foreground font-normal uppercase">Min: ₹{coupon.minOrderValue}</span>}
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-0.5 rounded-md bg-muted/50 text-xs font-medium text-muted-foreground">
                                                    {coupon.applyTo === "all" ? "All Products" : coupon.applyTo === "category" ? `Category: ${coupon.applicableCategory}` : `Product: ${coupon.applicableProductName || coupon.applicableProduct}`}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-foreground/80">
                                                        {coupon.currentUsageCount || 0} / {coupon.totalUsageLimit || "∞"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Redemptions</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch 
                                                        checked={coupon.isActive} 
                                                        onCheckedChange={() => toggleStatus(coupon.id, coupon.isActive)} 
                                                    />
                                                    <span className={`text-xs font-semibold uppercase ${coupon.isActive ? "text-green-500" : "text-muted-foreground"}`}>
                                                        {coupon.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link href={`/dashboard/coupon-management/${productType}/edit/${coupon.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                                                            <IconEdit className="h-4 w-4" />
                                                            <span className="sr-only">Edit</span>
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                                        onClick={() => handleDelete(coupon.id)}
                                                    >
                                                        <IconTrash className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-b py-4 px-2 mt-2">
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCoupons.length)} of {filteredCoupons.length} entries
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 shadow-sm"
                                >
                                    <IconChevronLeft className="h-4 w-4 mr-1.5" />
                                    Previous
                                </Button>
                                <div className="text-xs font-bold bg-muted/50 px-3 py-1.5 rounded-md border text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 shadow-sm"
                                >
                                    Next
                                    <IconChevronRight className="h-4 w-4 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

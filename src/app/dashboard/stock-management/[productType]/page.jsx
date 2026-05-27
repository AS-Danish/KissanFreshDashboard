"use client"

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore"
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
import { IconSearch, IconChevronLeft, IconChevronRight, IconEdit, IconCheck, IconX } from "@tabler/icons-react"

import { useAppStore } from "@/store/useAppStore";
import { updateCatalogVersion } from "@/services/appConfigService";

const ITEMS_PER_PAGE = 5;

// Custom hook for debouncing search query
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function StockManagement() {
    const params = useParams();
    const productType = params.productType; // "kissan-fresh" or "home-food"

    const { categories } = useAppStore();
    const availableCategories = categories[productType === 'home-food' ? 'home-food' : 'kissan-fresh'] || [];

    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms debounce

    const [categoryFilter, setCategoryFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // Inline Editing states
    const [editingProductId, setEditingProductId] = useState(null);
    const [editStockValue, setEditStockValue] = useState("");
    const [updatingStock, setUpdatingStock] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
            let productData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter to include only products matching the current origin type
            productData = productData.filter(p => {
                const origin = p.productOrigin || "kissan-fresh";
                return productType === "home-food" ? origin === "home-food" : origin === "kissan-fresh";
            });

            productData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setProducts(productData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [productType]);

    const handleEditClick = (product) => {
        setEditingProductId(product.id);
        setEditStockValue(product.stockCount !== undefined ? product.stockCount.toString() : "0");
    };

    const handleCancelEdit = () => {
        setEditingProductId(null);
        setEditStockValue("");
    };

    const handleSaveStock = async (productId) => {
        if (editStockValue === "" || isNaN(Number(editStockValue)) || Number(editStockValue) < 0) {
            alert("Please enter a valid stock count (0 or above).");
            return;
        }

        setUpdatingStock(true);
        try {
            await updateDoc(doc(db, "products", productId), {
                stockCount: Number(editStockValue),
                inStock: Number(editStockValue) > 0, // optionally derive inStock flag here
                updatedAt: new Date().toISOString()
            });
            
            // Update catalog version for cache busting
            await updateCatalogVersion();
            
            setEditingProductId(null);
        } catch (error) {
            console.error("Error updating stock: ", error);
            alert("Failed to update stock.");
        } finally {
            setUpdatingStock(false);
        }
    };


    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch = product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            const matchesCategory = categoryFilter === "all" || product.category?.toLowerCase() === categoryFilter.toLowerCase();
            return matchesSearch && matchesCategory;
        });
    }, [products, debouncedSearchQuery, categoryFilter]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset pagination when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, categoryFilter]);

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
                            {productType === "home-food" ? "Home Food Stock Management" : "Kissan Fresh Stock Management"}
                        </h2>
                        <Link href={`/dashboard/stock-management/${productType}/add`}>
                            <Button className="font-semibold px-6 shadow-md hover:-translate-y-0.5 transition-all">Add Bulk Stock +</Button>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                        <div className="relative w-full md:w-2/3 lg:w-1/2">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                            <Input
                                type="search"
                                placeholder="Search products..."
                                className="w-full pl-10 h-12 bg-background border-border/50 shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-1/3 lg:w-1/4">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="h-12 bg-background border-border/50 shadow-sm">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {availableCategories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.name.toLowerCase()}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead className="font-semibold text-foreground">Product Name</TableHead>
                                    <TableHead className="font-semibold text-foreground">Category</TableHead>
                                    <TableHead className="font-semibold text-foreground">Price</TableHead>
                                    <TableHead className="font-semibold text-foreground text-center">Current Stock</TableHead>
                                    <TableHead className="text-right font-semibold text-foreground w-[120px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell><Skeleton className="h-12 w-12 rounded-lg" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-6 w-12 mx-auto rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            No products found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProducts.map((product) => {
                                        const isEditing = editingProductId === product.id;
                                        const stock = product.stockCount !== undefined ? product.stockCount : 0;

                                        return (
                                            <TableRow key={product.id} className="group/row transition-colors hover:bg-muted/30">
                                                <TableCell>
                                                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border flex items-center justify-center bg-muted/50">
                                                        {product.images && product.images.length > 0 ? (
                                                            <Image
                                                                src={product.images[0]}
                                                                alt={product.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground w-full text-center">No Img</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-foreground">
                                                    {product.name}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{product.category}</TableCell>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    ₹{Number(product.price).toFixed(2)}
                                                    <span className="text-[10px] text-muted-foreground ml-1 font-normal italic uppercase">
                                                        {product.unitValue && Number(product.unitValue) > 1 ? ` for ${product.unitValue}${product.unit}` : ` / ${product.unit || 'pc'}`}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                className="w-20 h-8 text-center"
                                                                value={editStockValue}
                                                                onChange={(e) => setEditStockValue(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${stock > 10 ? 'bg-primary/10 text-primary' : stock > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive'}`}>
                                                            {stock}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    {isEditing ? (
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-primary hover:bg-primary/20 hover:text-primary transition-colors rounded-full"
                                                                onClick={() => handleSaveStock(product.id)}
                                                                disabled={updatingStock}
                                                                title="Save"
                                                            >
                                                                <IconCheck className="h-5 w-5" />
                                                                <span className="sr-only">Save</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive transition-colors rounded-full"
                                                                onClick={handleCancelEdit}
                                                                disabled={updatingStock}
                                                                title="Cancel"
                                                            >
                                                                <IconX className="h-5 w-5" />
                                                                <span className="sr-only">Cancel</span>
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover/row:opacity-100 transition-all rounded-full"
                                                            onClick={() => handleEditClick(product)}
                                                            title="Edit Stock"
                                                        >
                                                            <IconEdit className="h-4 w-4" />
                                                            <span className="sr-only">Edit Stock</span>
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border bg-card rounded-xl py-3 px-4 shadow-sm">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-medium text-foreground">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> of <span className="font-medium text-foreground">{filteredProducts.length}</span> products
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

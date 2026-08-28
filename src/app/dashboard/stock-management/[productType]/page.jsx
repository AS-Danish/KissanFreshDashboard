"use client"

import { toast } from "sonner";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore"
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

    const handleEditClick = (productRow) => {
        setEditingProductId(productRow.rowId);
        setEditStockValue(productRow.stockCount !== undefined ? productRow.stockCount.toString() : "0");
    };

    const handleCancelEdit = () => {
        setEditingProductId(null);
        setEditStockValue("");
    };

    const handleSaveStock = async (productRow) => {
        if (editStockValue === "" || isNaN(Number(editStockValue)) || Number(editStockValue) < 0) {
            toast.error("Enter a valid stock count of zero or more");
            return;
        }

        setUpdatingStock(true);
        try {
            if (productRow.isVariation) {
                const product = products.find(p => p.id === productRow.id);
                if (product) {
                    const newVariations = [...product.variations];
                    const vIndex = productRow.variationIndex;
                    newVariations[vIndex].stockCount = Number(editStockValue);
                    newVariations[vIndex].inStock = Number(editStockValue) > 0;
                    
                    const anyInStock = newVariations.some(v => v.inStock);

                    await updateDoc(doc(db, "products", productRow.id), {
                        variations: newVariations,
                        inStock: anyInStock,
                        updatedAt: new Date().toISOString()
                    });
                }
            } else {
                await updateDoc(doc(db, "products", productRow.id), {
                    stockCount: Number(editStockValue),
                    inStock: Number(editStockValue) > 0,
                    updatedAt: new Date().toISOString()
                });
            }
            
            // Update catalog version for cache busting
            await updateCatalogVersion();
            
            setEditingProductId(null);
        } catch (error) {
            console.error("Error updating stock: ", error);
            toast.error("Failed to update stock");
        } finally {
            setUpdatingStock(false);
        }
    };


    const filteredProducts = useMemo(() => {
        const result = products.filter((product) => {
            const matchesSearch = product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            const matchesCategory = categoryFilter === "all" || product.category?.toLowerCase() === categoryFilter.toLowerCase();
            return matchesSearch && matchesCategory;
        });

        const flat = [];
        for (const p of result) {
            if (p.hasVariations && p.variations && p.variations.length > 0) {
                p.variations.forEach((v, index) => {
                    flat.push({
                        ...p,
                        isVariation: true,
                        variationId: v.id,
                        variationIndex: index,
                        name: `${p.name} - ${v.unitValue} ${v.unit}`,
                        price: v.price,
                        stockCount: v.stockCount !== undefined ? v.stockCount : 0,
                        rowId: `${p.id}_${v.id}`
                    });
                });
            } else {
                flat.push({
                    ...p,
                    isVariation: false,
                    rowId: p.id
                });
            }
        }
        return flat;
    }, [products, debouncedSearchQuery, categoryFilter]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, categoryFilter]);

    return (
        <>
                <div className="dashboard-page dashboard-page-wide">
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
                                    paginatedProducts.map((productRow) => {
                                        const isEditing = editingProductId === productRow.rowId;
                                        const stock = productRow.stockCount !== undefined ? productRow.stockCount : 0;

                                        return (
                                            <TableRow key={productRow.rowId} className={`group/row transition-colors hover:bg-muted/30 ${productRow.isVariation ? 'bg-muted/5' : ''}`}>
                                                <TableCell>
                                                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border flex items-center justify-center bg-muted/50">
                                                        {productRow.images && productRow.images.length > 0 ? (
                                                            <Image
                                                                src={productRow.images[0]}
                                                                alt={productRow.name}
                                                                fill
                                                                sizes="48px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground w-full text-center">No Img</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-foreground">
                                                    {productRow.name}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{productRow.category}</TableCell>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    ₹{Number(productRow.price).toFixed(2)}
                                                    {!productRow.isVariation && (
                                                        <span className="text-[10px] text-muted-foreground ml-1 font-normal italic uppercase">
                                                            {productRow.unitValue && Number(productRow.unitValue) > 1 ? ` for ${productRow.unitValue}${productRow.unit}` : ` / ${productRow.unit || 'pc'}`}
                                                        </span>
                                                    )}
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
                                                                onClick={() => handleSaveStock(productRow)}
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
                                                            onClick={() => handleEditClick(productRow)}
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
            </>
    );
}

"use client"

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox"
import { IconSearch, IconArrowLeft, IconCheck } from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { useCategory } from "@/context/CategoryContext";
import { updateCatalogVersion } from "@/services/appConfigService";

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

export default function BulkAddStock() {
    const params = useParams();
    const router = useRouter();
    const productType = params.productType; // "kissan-fresh" or "home-food"

    const { categories } = useCategory();
    const availableCategories = categories[productType === 'home-food' ? 'home-food' : 'kissan-fresh'] || [];

    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms debounce
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    // Selected products mapping: { productId: amountToAdd }
    const [selectedProducts, setSelectedProducts] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
            let productData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter by productType origin
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

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch = product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            const matchesCategory = categoryFilter === "all" || product.category?.toLowerCase() === categoryFilter.toLowerCase();
            return matchesSearch && matchesCategory;
        });
    }, [products, debouncedSearchQuery, categoryFilter]);

    const toggleProductSelection = (product) => {
        setSelectedProducts(prev => {
            const newSelection = { ...prev };
            if (newSelection[product.id]) {
                delete newSelection[product.id];
            } else {
                newSelection[product.id] = { product, amountToAdd: 1 };
            }
            return newSelection;
        });
    };

    const updateAmountToAdd = (productId, amount) => {
        setSelectedProducts(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                amountToAdd: Number(amount)
            }
        }));
    };

    const handleSaveBulkStock = async () => {
        const productIds = Object.keys(selectedProducts);
        if (productIds.length === 0) {
            alert("Please select at least one product to add stock.");
            return;
        }

        setSaving(true);
        try {
            // Note: In a production app, a Firebase complete batch write would be more robust here.
            // Using promise.all for simplicity.
            const updatePromises = productIds.map(async (id) => {
                const entry = selectedProducts[id];
                if (entry.amountToAdd <= 0 || isNaN(entry.amountToAdd)) return; // Skip invalid entries

                const currentStockCount = entry.product.stockCount !== undefined ? entry.product.stockCount : 0;
                const newStockCount = currentStockCount + entry.amountToAdd;

                const docRef = doc(db, "products", id);
                await updateDoc(docRef, {
                    stockCount: newStockCount,
                    inStock: newStockCount > 0,
                    updatedAt: new Date().toISOString()
                });
            });

            await Promise.all(updatePromises);
            
            // Update catalog version for cache busting
            await updateCatalogVersion();
            
            alert(`Successfully added stock to ${productIds.length} products!`);
            router.push(`/dashboard/stock-management/${productType}`);
        } catch (error) {
            console.error("Error updating bulk stock: ", error);
            alert("Failed to update all stocks.");
        } finally {
            setSaving(false);
        }
    };


    const selectedCount = Object.keys(selectedProducts).length;

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-[1400px] mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <Link href={`/dashboard/stock-management/${productType}`}>
                            <Button variant="outline" size="icon">
                                <IconArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">Add Bulk Stock</h2>
                            <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                                {productType === "home-food" ? "Home Food" : "Kissan Fresh"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start relative pb-20">
                        {/* Left Side: Search & Selection List */}
                        <div className="xl:col-span-2 space-y-6">
                            <Card className="border-0 shadow-sm border-border">
                                <CardHeader className="bg-muted/30 pb-4 border-b">
                                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                                        <div className="relative w-full md:w-2/3">
                                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                                            <Input
                                                type="text"
                                                placeholder="Search products to add stock..."
                                                className="w-full pl-9 bg-background shadow-sm"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full md:w-1/3">
                                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                                <SelectTrigger className="bg-background shadow-sm">
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
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loading ? (
                                        <div className="py-12 flex items-center justify-center text-muted-foreground">
                                            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin mr-3" />
                                            Loading catalog...
                                        </div>
                                    ) : filteredProducts.length === 0 ? (
                                        <div className="py-12 text-center text-muted-foreground">
                                            No products found matching your search.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-h-[600px] overflow-y-auto min-h-[400px] content-start">
                                            {filteredProducts.map(product => {
                                                const isSelected = !!selectedProducts[product.id];
                                                const currentStock = product.stockCount !== undefined ? product.stockCount : 0;
                                                return (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => toggleProductSelection(product)}
                                                        className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/20 scale-[1.02]' : 'border-border hover:border-border/80 hover:bg-muted/30'}`}
                                                    >
                                                        <div className="absolute top-3 right-3 z-10">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleProductSelection(product)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                            />
                                                        </div>
                                                        <div className="h-14 w-14 rounded-lg bg-muted flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                                                            {product.images && product.images.length > 0 ? (
                                                                <Image
                                                                    src={product.images[0]}
                                                                    alt={product.name}
                                                                    fill
                                                                    className={`object-cover transition-transform ${isSelected ? 'scale-110' : ''}`}
                                                                />
                                                            ) : (
                                                                <span className="text-[10px] text-muted-foreground">No Img</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 pr-6 min-w-0">
                                                            <h4 className="font-semibold text-sm truncate text-foreground">{product.name}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <p className="text-xs text-muted-foreground truncate max-w-[80px]">{product.category}</p>
                                                                <span className="text-xs font-medium text-foreground py-0.5 px-2 bg-muted rounded-full">
                                                                    Stock: {currentStock}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Side: Execution Tray */}
                        <div className="xl:col-span-1 sticky top-8">
                            <Card className="border-0 shadow-lg relative overflow-hidden border-border h-[calc(100vh-140px)] flex flex-col">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50 pointer-events-none" />

                                <CardHeader className="border-b bg-muted/20 relative z-10 pb-4 shrink-0">
                                    <CardTitle className="text-lg flex items-center justify-between">
                                        Selected Products
                                        <span className="bg-primary text-primary-foreground text-xs font-bold py-1 px-2.5 rounded-full shadow-sm">
                                            {selectedCount}
                                        </span>
                                    </CardTitle>
                                    <CardDescription>
                                        Define how much stock to ADD to each selected product in bulk.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-0 flex-1 overflow-y-auto relative z-10 bg-background/50 backdrop-blur-sm">
                                    {selectedCount === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border border-border/50 border-dashed">
                                                <IconCheck className="h-6 w-6 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-sm">Click products on the left to add them to your bulk update tray.</p>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-border/50">
                                            {Object.values(selectedProducts).map((entry) => {
                                                const currentStock = entry.product.stockCount !== undefined ? entry.product.stockCount : 0;
                                                return (
                                                    <li key={entry.product.id} className="p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors animate-in fade-in slide-in-from-right-4 duration-300">
                                                        <div className="h-10 w-10 rounded relative mx-auto bg-muted overflow-hidden flex-shrink-0">
                                                            {entry.product.images && entry.product.images.length > 0 ? (
                                                                <Image
                                                                    src={entry.product.images[0]}
                                                                    alt={entry.product.name}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-sm truncate text-foreground">{entry.product.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Current: {currentStock} <span className="italic opacity-70">({entry.product.unitValue && Number(entry.product.unitValue) > 1 ? `${entry.product.unitValue}${entry.product.unit}` : `${entry.product.unit || 'pc'}`})</span>
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-muted-foreground">+</span>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                className="w-16 h-8 text-center text-sm font-semibold border-primary/30 focus-visible:ring-primary shadow-sm"
                                                                value={entry.amountToAdd}
                                                                onChange={(e) => updateAmountToAdd(entry.product.id, e.target.value)}
                                                            />
                                                            <span className="text-xs font-medium text-primary">= {currentStock + (entry.amountToAdd || 0)}</span>
                                                        </div>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    )}
                                </CardContent>

                                <CardFooter className="p-4 border-t bg-muted/40 backdrop-blur-md relative z-10 shrink-0">
                                    <Button
                                        className="w-full h-12 shadow-lg shadow-primary/20 text-md font-semibold hover:-translate-y-0.5 transition-all"
                                        onClick={handleSaveBulkStock}
                                        disabled={selectedCount === 0 || saving}
                                    >
                                        {saving ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                                                Processing Bulk Addition...
                                            </div>
                                        ) : (
                                            `Confirm and Add Stock (${selectedCount} items)`
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

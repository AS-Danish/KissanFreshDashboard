"use client"

import Link from "next/link";
import Image from "next/image"
import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore"
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
import { IconEdit, IconTrash, IconSearch, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { useAppStore } from "@/store/useAppStore";
import { updateCatalogVersion } from "@/services/appConfigService";

const ITEMS_PER_PAGE = 5;

const KISSAN_FRESH_TAGS = ["100% Organic", "Fresh", "Pure", "Farm-to-table", "Locally Sourced", "Vegan", "Gluten-Free"];
const HOME_FOOD_TAGS = ["Homemade", "Preservative-free", "Traditional", "Authentic", "Mom's Recipe", "Spicy", "Healthy"];

export default function ProductManagement() {
    const params = useParams();
    const productType = params.productType; // "kissan-fresh" or "home-food"
    const { categories } = useAppStore();

    const availableCategories = categories[productType === 'home-food' ? 'home-food' : 'kissan-fresh'] || [];
    const availableTags = productType === 'home-food' ? HOME_FOOD_TAGS : KISSAN_FRESH_TAGS;

    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [tagFilter, setTagFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    
    // Pagination states
    const [cursorHistory, setCursorHistory] = useState([null]);
    const [hasMore, setHasMore] = useState(true);
    const [algoliaTotalPages, setAlgoliaTotalPages] = useState(1);
    const [algoliaTotalHits, setAlgoliaTotalHits] = useState(0);

    const loadProducts = async (pageIndex, reset = false) => {
        setLoading(true);
        try {
            if (searchQuery.trim() !== "") {
                const { performSearch } = await import("@/lib/algolia");
                let numericFilters = [];
                if (priceFilter === "under100") numericFilters.push("price < 100");
                else if (priceFilter === "100to500") numericFilters.push("price >= 100", "price <= 500");
                else if (priceFilter === "over500") numericFilters.push("price > 500");
                
                let facetFilters = [`productOrigin:${productType}`];
                if (categoryFilter !== "all") facetFilters.push(`category:${categoryFilter}`);
                if (tagFilter !== "all") facetFilters.push(`tags:${tagFilter}`);

                const options = {
                    page: pageIndex - 1,
                    hitsPerPage: ITEMS_PER_PAGE,
                    facetFilters,
                    numericFilters
                };

                const { hits, nbPages, nbHits } = await performSearch("products", searchQuery, options);
                
                const mappedProducts = hits.map(hit => ({ ...hit, id: hit.objectID }));
                setProducts(mappedProducts);
                setAlgoliaTotalPages(nbPages);
                setAlgoliaTotalHits(nbHits);
                setHasMore(pageIndex < nbPages);
            } else {
                const { getPaginatedProducts } = await import("@/services/productService");
                const currentCursor = reset ? null : cursorHistory[pageIndex - 1];
                const filters = { category: categoryFilter, price: priceFilter, tag: tagFilter };
                
                const { products: fetchedProducts, lastVisible, hasMore: more } = await getPaginatedProducts(
                    productType, 
                    ITEMS_PER_PAGE, 
                    currentCursor, 
                    filters
                );
                
                // Client side filtering fallback for unindexed Firebase queries
                let filtered = fetchedProducts;
                if (priceFilter !== "all") {
                    filtered = filtered.filter(p => {
                        if (priceFilter === "under100") return p.price < 100;
                        if (priceFilter === "100to500") return p.price >= 100 && p.price <= 500;
                        if (priceFilter === "over500") return p.price > 500;
                        return true;
                    });
                }
                if (tagFilter !== "all") {
                    filtered = filtered.filter(p => p.tags && p.tags.includes(tagFilter));
                }

                setProducts(filtered);
                setHasMore(more);
                
                if (reset) {
                    setCursorHistory([null, lastVisible]);
                } else if (pageIndex === cursorHistory.length && more) {
                    setCursorHistory(prev => [...prev, lastVisible]);
                }
            }
        } catch (error) {
            console.error("Error loading products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
        loadProducts(1, true);
    }, [productType, searchQuery, categoryFilter, priceFilter, tagFilter]);

    useEffect(() => {
        if (currentPage > 1) {
            loadProducts(currentPage, false);
        }
    }, [currentPage]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteDoc(doc(db, "products", id));
                await updateCatalogVersion();
                loadProducts(currentPage, false);
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert("Failed to delete product.");
            }
        }
    };

    const isAlgoliaMode = searchQuery.trim() !== "";
    const totalPages = isAlgoliaMode ? algoliaTotalPages : (hasMore ? currentPage + 1 : currentPage);
    const paginatedProducts = products;

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
                            {productType === "home-food" ? "Home Food Products" : "Kissan Fresh Products"}
                        </h2>
                        <Link href={`/dashboard/product-management/${productType}/new`}>
                            <Button shadow="md">Add New Product</Button>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                        <div className="relative w-full md:w-1/3">
                            <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search products..."
                                className="w-full pl-8 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-1/4">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="h-10">
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
                        <div className="w-full md:w-1/4">
                            <Select value={tagFilter} onValueChange={setTagFilter}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Tag" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tags</SelectItem>
                                    {availableTags.map((tag) => (
                                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-1/4">
                            <Select value={priceFilter} onValueChange={setPriceFilter}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Price" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Prices</SelectItem>
                                    <SelectItem value="under100">Under ₹100</SelectItem>
                                    <SelectItem value="100to500">₹100 to ₹500</SelectItem>
                                    <SelectItem value="over500">Over ₹500</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead className="font-semibold text-foreground/80">Product Name</TableHead>
                                    <TableHead className="font-semibold text-foreground/80">Category</TableHead>
                                    <TableHead className="font-semibold text-foreground/80">Description</TableHead>
                                    <TableHead className="font-semibold text-foreground/80">Price</TableHead>
                                    <TableHead className="text-right font-semibold text-foreground/80">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                                <p className="text-sm text-muted-foreground font-medium italic">Loading products...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <IconSearch className="size-8 opacity-20" />
                                                <p className="font-medium">No products found matching your filters.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProducts.map((product) => (
                                        <TableRow key={product.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell>
                                                <div className="relative h-12 w-12 overflow-hidden rounded-lg border flex items-center justify-center bg-muted/30 shadow-inner group-hover:border-primary/30 transition-colors">
                                                    {product.images && product.images.length > 0 ? (
                                                        <Image
                                                            src={product.images[0]}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground w-full text-center font-bold uppercase p-1">No Img</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Link href={`/dashboard/product-management/${productType}/${product.id}`} className="hover:underline text-primary/90 hover:text-primary transition-colors">
                                                    {product.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-0.5 rounded-md bg-muted/50 text-[10px] font-bold uppercase tracking-tight text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary/70 transition-colors">
                                                    {product.category || "Uncategorized"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={product.description}>
                                                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                                                    {product.description?.length > 50 ? `${product.description.substring(0, 50)}...` : product.description}
                                                </p>
                                            </TableCell>
                                            <TableCell className="font-bold text-foreground/80">
                                                ₹{Number(product.price).toFixed(2)}
                                                <span className="text-[10px] text-muted-foreground ml-1 font-normal uppercase italic">
                                                    {product.unitValue && Number(product.unitValue) > 1 ? ` for ${product.unitValue}${product.unit}` : `/ ${product.unit || 'pc'}`}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link href={`/dashboard/product-management/${productType}/edit/${product.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                                                            <IconEdit className="h-4 w-4" />
                                                            <span className="sr-only">Edit</span>
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                                        onClick={() => handleDelete(product.id)}
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-b py-4 px-2 mt-2">
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, isAlgoliaMode ? algoliaTotalHits : ((currentPage - 1) * ITEMS_PER_PAGE) + products.length)} of {isAlgoliaMode ? algoliaTotalHits : 'Many'} entries
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

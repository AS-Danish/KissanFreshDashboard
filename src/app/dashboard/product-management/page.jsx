"use client"

import Link from "next/link";
import Image from "next/image"
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

const ITEMS_PER_PAGE = 5;

export default function ProductManagement() {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
            const productData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            productData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setProducts(productData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteDoc(doc(db, "products", id));
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert("Failed to delete product.");
            }
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            // Search Match
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());

            // Category Match
            const matchesCategory = categoryFilter === "all" || product.category.toLowerCase() === categoryFilter.toLowerCase();

            // Price Match
            let matchesPrice = true;
            if (priceFilter === "under100") matchesPrice = product.price < 100;
            else if (priceFilter === "100to500") matchesPrice = product.price >= 100 && product.price <= 500;
            else if (priceFilter === "over500") matchesPrice = product.price > 500;

            return matchesSearch && matchesCategory && matchesPrice;
        });
    }, [products, searchQuery, categoryFilter, priceFilter]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset pagination when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, priceFilter]);

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
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Product Management</h2>
                        <Link href="/dashboard/product-management/new">
                            <Button>Add New Product</Button>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                        <div className="relative w-full md:w-1/3">
                            <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search products..."
                                className="w-full pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-1/4">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="fruits">Fruits</SelectItem>
                                    <SelectItem value="vegetables">Vegetables</SelectItem>
                                    <SelectItem value="dairy">Dairy</SelectItem>
                                    <SelectItem value="bakery">Bakery</SelectItem>
                                    <SelectItem value="meat & poultry">Meat & Poultry</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-1/4">
                            <Select value={priceFilter} onValueChange={setPriceFilter}>
                                <SelectTrigger>
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

                    <div className="rounded-md border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Loading products...
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No products found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <div className="relative h-12 w-12 overflow-hidden rounded-md border flex items-center justify-center bg-muted">
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
                                            <TableCell className="font-medium">
                                                <Link href={`/dashboard/product-management/${product.id}`} className="hover:underline text-primary">
                                                    {product.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{product.category}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={product.description}>
                                                {product.description?.length > 50 ? `${product.description.substring(0, 50)}...` : product.description}
                                            </TableCell>
                                            <TableCell>₹{Number(product.price).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/dashboard/product-management/edit/${product.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                            <IconEdit className="h-4 w-4" />
                                                            <span className="sr-only">Edit</span>
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
                        <div className="flex items-center justify-between border-t border-b py-3 px-2">
                            <div className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} entries
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <IconChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="text-sm font-medium">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
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

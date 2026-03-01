"use client"

import Link from "next/link";
import Image from "next/image"
import { useState, useMemo } from "react"
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

const initialProducts = [
    { id: "p1", name: "Organic Apples", category: "Fruits", description: "Fresh organic apples from local farms.", price: 4.99 },
    { id: "p2", name: "Whole Wheat Bread", category: "Bakery", description: "Freshly baked whole wheat bread.", price: 3.49 },
    { id: "p3", name: "Almond Milk", category: "Dairy", description: "Unsweetened almond milk, 1L.", price: 5.99 },
    { id: "p4", name: "Free-Range Eggs", category: "Dairy", description: "A dozen free-range farm eggs.", price: 6.49 },
    { id: "p5", name: "Chicken Breast", category: "Meat & Poultry", description: "Boneless, skinless chicken breast.", price: 12.99 },
    { id: "p6", name: "Broccoli", category: "Vegetables", description: "Fresh green broccoli heads.", price: 2.29 },
    { id: "p7", name: "Greek Yogurt", category: "Dairy", description: "Plain greek yogurt, 500g.", price: 4.49 },
    { id: "p8", name: "Ground Beef", category: "Meat & Poultry", description: "Lean ground beef, 1 lb.", price: 8.99 },
    { id: "p9", name: "Carrots", category: "Vegetables", description: "Organic carrots, 2 lbs.", price: 3.99 },
    { id: "p10", name: "Bagels", category: "Bakery", description: "Pack of 6 plain bagels.", price: 4.99 },
    { id: "p11", name: "Bananas", category: "Fruits", description: "Bunch of ripe bananas.", price: 1.99 },
    { id: "p12", name: "Cheddar Cheese", category: "Dairy", description: "Aged sharp cheddar.", price: 7.99 }
];

const ITEMS_PER_PAGE = 5;

export default function ProductManagement() {
    const [products, setProducts] = useState(initialProducts);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            setProducts(products.filter(product => product.id !== id));
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
            if (priceFilter === "under5") matchesPrice = product.price < 5;
            else if (priceFilter === "5to10") matchesPrice = product.price >= 5 && product.price <= 10;
            else if (priceFilter === "over10") matchesPrice = product.price > 10;

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
                                    <SelectItem value="under5">Under $5</SelectItem>
                                    <SelectItem value="5to10">$5 to $10</SelectItem>
                                    <SelectItem value="over10">Over $10</SelectItem>
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
                                {paginatedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No products found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <div className="relative h-12 w-12 overflow-hidden rounded-md border">
                                                    <div className="absolute inset-0 bg-muted flex items-center justify-center text-xs text-muted-foreground object-cover">
                                                        Image
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>{product.category}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={product.description}>{product.description}</TableCell>
                                            <TableCell>${product.price.toFixed(2)}</TableCell>
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

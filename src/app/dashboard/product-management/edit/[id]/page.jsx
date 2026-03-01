"use client"

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IconArrowLeft, IconUpload } from "@tabler/icons-react"
import { useEffect, useState } from "react";

// Mock data (In a real app, you'd fetch this from your database based on the ID)
const initialProducts = [
    {
        id: "p1",
        name: "Organic Apples",
        category: "fruits",
        description: "Fresh organic apples from local farms.",
        price: 4.99
    },
    {
        id: "p2",
        name: "Whole Wheat Bread",
        category: "bakery",
        description: "Freshly baked whole wheat bread.",
        price: 3.49
    }
];

export default function EditProduct() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id;

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        price: ''
    });

    useEffect(() => {
        // Find the product to edit
        const productToEdit = initialProducts.find(p => p.id === productId);
        if (productToEdit) {
            setFormData({
                name: productToEdit.name,
                category: productToEdit.category,
                description: productToEdit.description,
                price: productToEdit.price.toString()
            });
        }
    }, [productId]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleCategoryChange = (val) => {
        setFormData(prev => ({
            ...prev,
            category: val
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Product ${productId} Updated Successfully!`);
        router.push("/dashboard/product-management");
    };

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-4xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/product-management">
                            <Button variant="outline" size="icon">
                                <IconArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </Button>
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Edit Product</h2>
                    </div>

                    <Card>
                        <form onSubmit={handleSubmit}>
                            <CardHeader>
                                <CardTitle>Edit Product Details</CardTitle>
                                <CardDescription>
                                    Update the details for product ID: {productId}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Product Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Organic Tomatoes"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the product..."
                                        rows={4}
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select required value={formData.category} onValueChange={handleCategoryChange}>
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fruits">Fruits</SelectItem>
                                            <SelectItem value="vegetables">Vegetables</SelectItem>
                                            <SelectItem value="dairy">Dairy</SelectItem>
                                            <SelectItem value="bakery">Bakery</SelectItem>
                                            <SelectItem value="meat">Meat & Poultry</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="price">Price (₹)</Label>
                                    <Input
                                        type="number"
                                        id="price"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="images">Product Images</Label>
                                    <div className="border-2 border-dashed border-muted rounded-lg p-8 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer relative">
                                        <IconUpload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm text-foreground font-medium">Click to upload or drag and drop new images</span>
                                        <span className="text-xs text-muted-foreground">Multiple images supported (PNG, JPG)</span>
                                        <Input
                                            id="images"
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
                                <Link href="/dashboard/product-management">
                                    <Button variant="ghost" type="button">Cancel</Button>
                                </Link>
                                <Button type="submit">Update Product</Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

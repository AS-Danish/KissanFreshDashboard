"use client"

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IconArrowLeft, IconUpload, IconX } from "@tabler/icons-react"

import { db, storage } from "@/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const AVAILABLE_TAGS = ["100% Organic", "Fresh", "Pure", "Farm-to-table", "Locally Sourced", "Vegan"];

export default function EditProduct() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id;

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        price: ''
    });
    const [tags, setTags] = useState([]);
    const [existingImages, setExistingImages] = useState([]); // URLs from firestore
    const [newImages, setNewImages] = useState([]); // File objects

    useEffect(() => {
        const fetchProduct = async () => {
            if (!productId) return;
            try {
                const docRef = doc(db, "products", productId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        name: data.name || '',
                        category: data.category || '',
                        description: data.description || '',
                        price: data.price ? data.price.toString() : ''
                    });
                    setTags(data.tags || []);
                    setExistingImages(data.images || []);
                } else {
                    alert("Product not found");
                    router.push("/dashboard/product-management");
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId, router]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleCategoryChange = (val) => {
        setFormData(prev => ({ ...prev, category: val }));
    };

    const handleTagToggle = (tag) => {
        setTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleNewImageChange = (e) => {
        if (e.target.files) {
            setNewImages(Array.from(e.target.files));
        }
    };

    const handleRemoveExistingImage = (indexToRemove) => {
        setExistingImages(existingImages.filter((_, index) => index !== indexToRemove));
    };

    const handleRemoveNewImage = (indexToRemove) => {
        setNewImages(newImages.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (existingImages.length === 0 && newImages.length === 0) {
            alert("Please have at least one image.");
            return;
        }

        setUploading(true);

        try {
            const uploadedUrls = [];
            for (const image of newImages) {
                const storageRef = ref(storage, `products/${Date.now()}_${image.name}`);
                const uploadTask = await uploadBytesResumable(storageRef, image);
                const downloadURL = await getDownloadURL(uploadTask.ref);
                uploadedUrls.push(downloadURL);
            }

            const finalImages = [...existingImages, ...uploadedUrls];

            await updateDoc(doc(db, "products", productId), {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                price: Number(formData.price),
                tags,
                images: finalImages,
                updatedAt: new Date().toISOString()
            });

            alert(`Product ${formData.name} Updated Successfully!`);
            router.push("/dashboard/product-management");
        } catch (error) {
            console.error("Error updating product: ", error);
            alert("Error updating product: " + error.message);
        } finally {
            setUploading(false);
        }
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

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-muted-foreground">Loading product details...</p>
                        </div>
                    ) : (
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
                                                <SelectItem value="Fruits">Fruits</SelectItem>
                                                <SelectItem value="Vegetables">Vegetables</SelectItem>
                                                <SelectItem value="Dairy">Dairy</SelectItem>
                                                <SelectItem value="Bakery">Bakery</SelectItem>
                                                <SelectItem value="Meat & Poultry">Meat & Poultry</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2 mt-2">
                                        <Label>Tags</Label>
                                        <div className="flex flex-wrap gap-4 mt-2">
                                            {AVAILABLE_TAGS.map((tag) => (
                                                <div key={tag} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`tag-${tag}`}
                                                        checked={tags.includes(tag)}
                                                        onCheckedChange={() => handleTagToggle(tag)}
                                                    />
                                                    <label
                                                        htmlFor={`tag-${tag}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {tag}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
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
                                        <Label>Product Images</Label>

                                        {/* Existing Images */}
                                        {existingImages.length > 0 && (
                                            <div className="mb-4">
                                                <Label className="text-xs text-muted-foreground mb-2 block">Current Images:</Label>
                                                <div className="flex flex-wrap gap-4">
                                                    {existingImages.map((imgUrl, idx) => (
                                                        <div key={idx} className="relative h-24 w-24 rounded-md border overflow-hidden group">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={imgUrl} alt="Product" className="object-cover w-full h-full" />
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleRemoveExistingImage(idx)}
                                                                    type="button"
                                                                >
                                                                    <IconX className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Add New Images */}
                                        <div className="border-2 border-dashed border-muted rounded-lg p-8 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer relative mt-2">
                                            <IconUpload className="h-8 w-8 text-muted-foreground" />
                                            <span className="text-sm text-foreground font-medium">Click to upload new images</span>
                                            <span className="text-xs text-muted-foreground">Multiple images supported (PNG, JPG)</span>
                                            <Input
                                                id="images"
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleNewImageChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>

                                        {/* Preview New Images */}
                                        {newImages.length > 0 && (
                                            <div className="mt-4 flex flex-col gap-2">
                                                <Label className="text-xs text-muted-foreground">New Images to Upload:</Label>
                                                <ul className="space-y-2">
                                                    {newImages.map((img, idx) => (
                                                        <li key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded-md border text-sm">
                                                            <span className="truncate max-w-[80%]">{img.name}</span>
                                                            <Button variant="ghost" size="icon" type="button" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveNewImage(idx)}>
                                                                <IconX className="h-4 w-4" />
                                                            </Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
                                    <Link href="/dashboard/product-management">
                                        <Button variant="ghost" type="button" disabled={uploading}>Cancel</Button>
                                    </Link>
                                    <Button type="submit" disabled={uploading}>
                                        {uploading ? "Updating..." : "Update Product"}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

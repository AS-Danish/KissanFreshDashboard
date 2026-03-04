"use client"

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const AVAILABLE_TAGS = ["100% Organic", "Fresh", "Pure", "Farm-to-table", "Locally Sourced", "Vegan"];

export default function AddNewProduct() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [tags, setTags] = useState([]);
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    const router = useRouter();

    const handleTagToggle = (tag) => {
        setTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleImageChange = (e) => {
        if (e.target.files) {
            setImages(Array.from(e.target.files));
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (images.length === 0) {
            alert("Please select at least one image.");
            return;
        }

        setUploading(true);

        try {
            const imageUrls = [];
            for (const image of images) {
                const storageRef = ref(storage, `products/${Date.now()}_${image.name}`);
                const uploadTask = await uploadBytesResumable(storageRef, image);
                const downloadURL = await getDownloadURL(uploadTask.ref);
                imageUrls.push(downloadURL);
            }

            await addDoc(collection(db, "products"), {
                name,
                description,
                category,
                price: Number(price),
                tags,
                images: imageUrls,
                createdAt: new Date().toISOString()
            });

            alert("Product Saved Successfully!");
            router.push("/dashboard/product-management");
        } catch (error) {
            console.error("Error adding product: ", error);
            alert("Error saving product: " + error.message);
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
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Add New Product</h2>
                    </div>

                    <Card>
                        <form onSubmit={handleSubmit}>
                            <CardHeader>
                                <CardTitle>Product Details</CardTitle>
                                <CardDescription>
                                    Enter the details of the new product you want to add.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="product-name">Product Name</Label>
                                    <Input
                                        id="product-name"
                                        placeholder="e.g. Organic Tomatoes"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the product..."
                                        rows={4}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select required value={category} onValueChange={setCategory}>
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
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="images">Product Images</Label>
                                    <div className="border-2 border-dashed border-muted rounded-lg p-8 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer relative">
                                        <IconUpload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm text-foreground font-medium">Click to upload or drag and drop</span>
                                        <span className="text-xs text-muted-foreground">Multiple images supported (PNG, JPG)</span>
                                        <Input
                                            id="images"
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    {images.length > 0 && (
                                        <div className="mt-4 flex flex-col gap-2">
                                            <Label>Selected Images:</Label>
                                            <ul className="space-y-2">
                                                {images.map((img, idx) => (
                                                    <li key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded-md border text-sm">
                                                        <span className="truncate max-w-[80%]">{img.name}</span>
                                                        <Button variant="ghost" size="icon" type="button" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveImage(idx)}>
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
                                    {uploading ? "Saving..." : "Save Product"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

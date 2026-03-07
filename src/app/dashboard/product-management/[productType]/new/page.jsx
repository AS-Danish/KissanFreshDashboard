"use client"

import Link from "next/link";
import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IconArrowLeft, IconUpload, IconX, IconCamera } from "@tabler/icons-react"

import { db, storage } from "@/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const KISSAN_FRESH_CATEGORIES = ["Fruits", "Vegetables", "Dairy", "Bakery", "Meat & Poultry", "Grains"];
const HOME_FOOD_CATEGORIES = ["Pickles", "Spices", "Snacks", "Sweets", "Staples", "Meals"];

const KISSAN_FRESH_TAGS = ["100% Organic", "Fresh", "Pure", "Farm-to-table", "Locally Sourced", "Vegan", "Gluten-Free"];
const HOME_FOOD_TAGS = ["Homemade", "Preservative-free", "Traditional", "Authentic", "Mom's Recipe", "Spicy", "Healthy"];
export default function AddNewProduct() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [tags, setTags] = useState([]);
    const [images, setImages] = useState([]);
    const [inStock, setInStock] = useState(false);
    const [uploading, setUploading] = useState(false);

    const params = useParams();
    const productType = params.productType;
    const router = useRouter();

    const availableCategories = productType === 'home-food' ? HOME_FOOD_CATEGORIES : KISSAN_FRESH_CATEGORIES;
    const availableTags = productType === 'home-food' ? HOME_FOOD_TAGS : KISSAN_FRESH_TAGS;

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
                inStock,
                stockCount: 0,
                productOrigin: productType === 'home-food' ? 'home-food' : 'kissan-fresh',
                createdAt: new Date().toISOString()
            });

            alert("Product Saved Successfully!");
            router.push(`/dashboard/product-management/${productType}`);
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
                        <Link href={`/dashboard/product-management/${productType}`}>
                            <Button variant="outline" size="icon">
                                <IconArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </Button>
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Add New Product</h2>
                    </div>

                    <Card className="border-0 shadow-lg relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <form onSubmit={handleSubmit} className="relative z-10">
                            <CardHeader className="border-b border-border/50 pb-6 mb-6">
                                <CardTitle className="text-2xl">Product Details</CardTitle>
                                <CardDescription className="text-base text-muted-foreground/80">
                                    Enter the details of the new product you want to add.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 px-8">
                                <div className="grid gap-3 group/input">
                                    <Label htmlFor="product-name" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Product Name</Label>
                                    <Input
                                        id="product-name"
                                        placeholder="e.g. Organic Tomatoes"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                    />
                                </div>

                                <div className="grid gap-3 group/input">
                                    <Label htmlFor="description" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the product..."
                                        rows={4}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                        className="bg-background border-border/50 focus-visible:ring-primary/50 resize-none transition-all duration-300 hover:bg-muted/50"
                                    />
                                </div>

                                <div className="grid gap-3 group/input">
                                    <Label htmlFor="category" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Category</Label>
                                    <Select required value={category} onValueChange={setCategory}>
                                        <SelectTrigger id="category" className="bg-background border-border/50 focus:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent className="border-border">
                                            {availableCategories.map((cat) => (
                                                <SelectItem key={cat} value={cat} className="hover:bg-muted focus:bg-muted cursor-pointer">{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-3 group/input mt-2 bg-muted/20 p-4 rounded-xl border border-border/50">
                                    <Label className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Tags</Label>
                                    <div className="flex flex-wrap gap-4 mt-2">
                                        {availableTags.map((tag) => (
                                            <div key={tag} className="flex items-center space-x-2 bg-background px-3 py-2 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                                                <Checkbox
                                                    id={`tag-${tag}`}
                                                    checked={tags.includes(tag)}
                                                    onCheckedChange={() => handleTagToggle(tag)}
                                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                                <label
                                                    htmlFor={`tag-${tag}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground/80"
                                                >
                                                    {tag}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-3 group/input">
                                    <Label htmlFor="price" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Price (₹)</Label>
                                    <Input
                                        type="number"
                                        id="price"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        required
                                        className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50 font-medium"
                                    />
                                </div>

                                <div className="grid gap-3 group/input">
                                    <Label htmlFor="images" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Product Images</Label>
                                    <div className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl p-10 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 cursor-pointer relative group/dropzone">
                                        <div className="p-4 bg-background rounded-full shadow-sm border border-border group-hover/dropzone:scale-110 transition-transform duration-300">
                                            <IconUpload className="h-8 w-8 text-primary" />
                                        </div>
                                        <span className="text-base text-foreground font-semibold mt-2">Click to upload or drag and drop</span>
                                        <span className="text-sm text-muted-foreground">Multiple images supported (PNG, JPG)</span>
                                        <Input
                                            id="images"
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                    </div>
                                    {images.length > 0 && (
                                        <div className="mt-4 flex flex-col gap-2">
                                            <Label>Selected Images:</Label>
                                            <ul className="space-y-3">
                                                {images.map((img, idx) => (
                                                    <li key={idx} className="flex items-center justify-between bg-background p-3 rounded-lg border border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <div className="flex items-center gap-3 truncate">
                                                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                                <IconCamera className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <span className="truncate max-w-[80%] font-medium text-sm">{img.name}</span>
                                                        </div>
                                                        <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors rounded-full" onClick={() => handleRemoveImage(idx)}>
                                                            <IconX className="h-4 w-4" />
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t border-border/50 p-8 bg-muted/20 backdrop-blur-sm -mx-0">
                                <Link href={`/dashboard/product-management/${productType}`}>
                                    <Button variant="outline" type="button" disabled={uploading}>Cancel</Button>
                                </Link>
                                <Button type="submit" disabled={uploading} className="shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 min-w-32 active:translate-y-0">
                                    {uploading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                                            <span>Saving...</span>
                                        </div>
                                    ) : "Save Product"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

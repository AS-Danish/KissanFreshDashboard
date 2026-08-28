"use client"

import { toast } from "sonner";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { IconArrowLeft, IconPlus, IconUpload, IconX, IconSearch } from "@tabler/icons-react"
import { updateCatalogVersion } from "@/services/appConfigService";

import { db, storage } from "@/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { useAppStore } from "@/store/useAppStore";
import imageCompression from "browser-image-compression";
import { logAdminAction } from "@/services/loggerService";
import { ImageFilePreview } from "@/components/dashboard/image-file-preview";

const KISSAN_FRESH_TAGS = ["100% Organic", "Fresh", "Pure", "Farm-to-table", "Locally Sourced", "Vegan", "Gluten-Free"];
const IMAGE_UPLOAD_METADATA = {
    contentType: "image/webp",
    cacheControl: "public,max-age=31536000,immutable",
};
const HOME_FOOD_TAGS = ["Homemade", "Preservative-free", "Traditional", "Authentic", "Mom's Recipe", "Spicy", "Healthy"];
export default function EditProduct() {
    const { categories } = useAppStore();
    const params = useParams();
    const router = useRouter();
    const productId = params.id;
    const productType = params.productType;

    const availableTags = productType === 'home-food' ? HOME_FOOD_TAGS : KISSAN_FRESH_TAGS;

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [categorySearch, setCategorySearch] = useState("");

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        unit: '',
        unitValue: '1',
        description: '',
        price: '',
        mrp: '',
        discountPercentage: ''
    });
    const [tags, setTags] = useState([]);
    const [inStock, setInStock] = useState(false);
    const [existingImages, setExistingImages] = useState([]); // URLs from firestore
    const [newImages, setNewImages] = useState([]); // File objects
    const [hasVariations, setHasVariations] = useState(false);
    const [variations, setVariations] = useState([]);

    const availableUnits = productType === 'home-food' 
        ? ["Plate", "Bowl", "Piece", "Box", "Pack", "Portion"] 
        : ["gm", "kg", "Piece", "Bunch", "Litre", "ml", "Pack", "Dozen"];

    const availableCategories = categories[productType === 'home-food' ? 'home-food' : 'kissan-fresh'] || [];
    const filteredCategories = availableCategories.filter(cat => 
        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );

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
                        unit: data.unit || '',
                        unitValue: data.unitValue ? data.unitValue.toString() : '1',
                        description: data.description || '',
                        price: data.price ? data.price.toString() : '',
                        mrp: data.mrp ? data.mrp.toString() : (data.price ? data.price.toString() : ''),
                        discountPercentage: data.discountPercentage ? data.discountPercentage.toString() : '0'
                    });
                    setTags(data.tags || []);
                    setInStock(data.hasOwnProperty('inStock') ? data.inStock : false);
                    setExistingImages(data.images || []);
                    setHasVariations(data.hasVariations || false);
                    setVariations(data.variations || []);
                } else {
                    toast.error("Product not found");
                    router.push(`/dashboard/product-management/${productType}`);
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId, router, productType]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleMrpChange = (e) => {
        const newMrp = e.target.value;
        setFormData(prev => {
            let newPrice = prev.price;
            if (newMrp && prev.discountPercentage) {
                newPrice = (parseFloat(newMrp) - (parseFloat(newMrp) * parseFloat(prev.discountPercentage) / 100)).toFixed(2);
            } else if (newMrp && !prev.discountPercentage) {
                newPrice = newMrp;
            }
            return { ...prev, mrp: newMrp, price: newPrice };
        });
    };

    const handleDiscountPercentageChange = (e) => {
        const newPct = e.target.value;
        setFormData(prev => {
            let newPrice = prev.price;
            if (prev.mrp && newPct) {
                newPrice = (parseFloat(prev.mrp) - (parseFloat(prev.mrp) * parseFloat(newPct) / 100)).toFixed(2);
            } else if (!newPct) {
                newPrice = prev.mrp;
            }
            return { ...prev, discountPercentage: newPct, price: newPrice };
        });
    };

    const handlePriceChange = (e) => {
        const newPrice = e.target.value;
        setFormData(prev => {
            let newPct = prev.discountPercentage;
            if (prev.mrp && newPrice && parseFloat(prev.mrp) > 0) {
                newPct = (((parseFloat(prev.mrp) - parseFloat(newPrice)) / parseFloat(prev.mrp)) * 100).toFixed(2);
            } else if (!newPrice) {
                newPct = "";
            }
            return { ...prev, price: newPrice, discountPercentage: newPct };
        });
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
            const selected = Array.from(e.target.files).filter((file) => file.type.startsWith("image/"));
            const remainingSlots = Math.max(0, 6 - existingImages.length);
            setNewImages(prev => [...prev, ...selected].slice(0, remainingSlots));
            if (selected.length + newImages.length > remainingSlots) toast.info("A maximum of 6 product images is allowed");
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
            toast.error("Please keep at least one product image");
            return;
        }

        if (hasVariations && variations.length === 0) {
            toast.error("Add at least one product variation");
            return;
        }

        if (!hasVariations && Number(formData.price) > Number(formData.mrp)) {
            toast.error("Selling price cannot be higher than MRP");
            return;
        }

        if (hasVariations && variations.some((variation) => Number(variation.price) > Number(variation.mrp))) {
            toast.error("A variation selling price cannot be higher than its MRP");
            return;
        }

        setUploading(true);

        try {
            const uploadedUrls = [];
            for (const image of newImages) {
                const options = {
                    maxSizeMB: 0.06,
                    maxWidthOrHeight: 600,
                    initialQuality: 0.72,
                    maxIteration: 20,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };
                const compressedFile = await imageCompression(image, options);
                const originalName = image.name.split('.')[0] || 'image';
                const storageRef = ref(storage, `products/${Date.now()}_${originalName}.webp`);
                const uploadTask = await uploadBytesResumable(storageRef, compressedFile, IMAGE_UPLOAD_METADATA);
                const downloadURL = await getDownloadURL(uploadTask.ref);
                uploadedUrls.push(downloadURL);
            }

            const finalImages = [...existingImages, ...uploadedUrls];

            // Upload variation images
            const finalVariations = [];
            for (const v of variations) {
                let vImageUrl = v.image;
                if (v.image instanceof File) {
                     const options = { maxSizeMB: 0.05, maxWidthOrHeight: 500, initialQuality: 0.7, maxIteration: 20, useWebWorker: true, fileType: 'image/webp' };
                     const compressedFile = await imageCompression(v.image, options);
                     const originalName = v.image.name.split('.')[0] || 'var_image';
                     const storageRef = ref(storage, `products/var_${Date.now()}_${originalName}.webp`);
                     const uploadTask = await uploadBytesResumable(storageRef, compressedFile, IMAGE_UPLOAD_METADATA);
                     vImageUrl = await getDownloadURL(uploadTask.ref);
                }
                finalVariations.push({
                    id: v.id,
                    unit: v.unit,
                    unitValue: v.unitValue || "1",
                    mrp: parseFloat(v.mrp) || parseFloat(v.price),
                    discountPercentage: parseFloat(v.discountPercentage) || 0,
                    price: parseFloat(v.price),
                    image: vImageUrl,
                    stockCount: parseInt(v.stockCount) || 0,
                    inStock: (parseInt(v.stockCount) || 0) > 0
                });
            }

            const updatedData = {
                name: formData.name,
                category: formData.category,
                unit: hasVariations ? "" : formData.unit,
                unitValue: hasVariations ? "" : (formData.unitValue || "1"),
                description: formData.description,
                mrp: hasVariations ? 0 : (parseFloat(formData.mrp) || parseFloat(formData.price)),
                discountPercentage: hasVariations ? 0 : (parseFloat(formData.discountPercentage) || 0),
                price: hasVariations ? 0 : Number(formData.price),
                hasVariations,
                variations: finalVariations,
                tags: tags,
                inStock: inStock,
                images: finalImages,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, "products", productId), updatedData);
            
            // Log the action
            await logAdminAction("PRODUCT_UPDATED", "PRODUCT", productId, {
                name: updatedData.name,
                category: updatedData.category,
                price: updatedData.price,
                productOrigin: productType
            });
            
            // Update catalog version for cache busting
            await updateCatalogVersion();

            toast.success(`${formData.name} updated successfully`);
            router.push(`/dashboard/product-management/${productType}`);
        } catch (error) {
            console.error("Error updating product: ", error);
            toast.error(error.message || "Failed to update product");
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
                <div className="dashboard-page">
                    <div className="flex items-center gap-4">
                        <Link href={`/dashboard/product-management/${productType}`}>
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
                        <Card className="relative overflow-visible">
                            <form onSubmit={handleSubmit} className="relative z-10">
                                <CardHeader className="border-b border-border/60 pb-5">
                                    <CardTitle className="text-2xl">Edit Product Details</CardTitle>
                                    <CardDescription className="text-base text-muted-foreground/80">
                                        Update the details for product ID: {productId}.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
                                    <div className="grid gap-3 group/input">
                                        <Label htmlFor="name" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Product Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Organic Tomatoes"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                        />
                                    </div>

                                    <div className="grid gap-3 group/input">
                                        <Label htmlFor="description" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Description <span className="text-red-500">*</span></Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Describe the product..."
                                            rows={4}
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            required
                                            className="bg-background border-border/50 focus-visible:ring-primary/50 resize-none transition-all duration-300 hover:bg-muted/50"
                                        />
                                    </div>

                                    <div className="grid gap-3 group/input">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="category" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Category <span className="text-red-500">*</span></Label>
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60">{availableCategories.length} Categories</span>
                                        </div>
                                        <Select required value={formData.category} onValueChange={handleCategoryChange}>
                                            <SelectTrigger id="category" className="bg-background border-border/50 focus:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50">
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" side="bottom" className="border-border max-h-[300px] w-full min-w-[var(--radix-select-trigger-width)]">
                                                <div className="p-2 sticky top-0 bg-background z-10 border-b border-border/50 mb-1">
                                                    <div className="relative">
                                                        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                                                        <Input 
                                                            placeholder="Search categories..." 
                                                            value={categorySearch}
                                                            onChange={(e) => setCategorySearch(e.target.value)}
                                                            className="h-8 pl-8 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                                            onKeyDown={(e) => {
                                                                if (e.key === ' ') e.stopPropagation(); // Stop space from selecting current item
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {filteredCategories.length === 0 ? (
                                                    <p className="p-4 text-center text-xs text-muted-foreground italic">No categories match.</p>
                                                ) : (
                                                    <div className="max-h-[220px] overflow-y-auto">
                                                        {filteredCategories.map((cat) => (
                                                            <SelectItem key={cat.id} value={cat.name} className="hover:bg-muted focus:bg-muted cursor-pointer py-3">{cat.name}</SelectItem>
                                                        ))}
                                                    </div>
                                                )}
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

                                        <div className="flex items-center space-x-2 bg-muted/20 p-4 rounded-xl border border-border/50">
                                            <Checkbox 
                                                id="has-variations" 
                                                checked={hasVariations} 
                                                onCheckedChange={setHasVariations} 
                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <label htmlFor="has-variations" className="text-sm font-semibold cursor-pointer">
                                                Product has variations (multiple sizes, weights, etc.)
                                            </label>
                                        </div>

                                        {!hasVariations && (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="grid gap-3 group/input">
                                                        <Label htmlFor="mrp" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">MRP (₹) <span className="text-red-500">*</span></Label>
                                                        <Input
                                                            id="mrp"
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={formData.mrp}
                                                            onChange={handleMrpChange}
                                                            required={!hasVariations}
                                                            className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                                        />
                                                    </div>

                                                    <div className="grid gap-3 group/input">
                                                        <Label htmlFor="discountPercentage" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Discount (%)</Label>
                                                        <Input
                                                            id="discountPercentage"
                                                            type="number"
                                                            placeholder="0"
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            value={formData.discountPercentage}
                                                            onChange={handleDiscountPercentageChange}
                                                            className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                                        />
                                                    </div>

                                                    <div className="grid gap-3 group/input">
                                                        <Label htmlFor="price" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Selling Price (₹) <span className="text-red-500">*</span></Label>
                                                        <Input
                                                            id="price"
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={formData.price}
                                                            onChange={handlePriceChange}
                                                            required={!hasVariations}
                                                            className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="grid gap-3 group/input">
                                                        <Label htmlFor="unit-value" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Quantity <span className="text-red-500">*</span></Label>
                                                        <Input
                                                            id="unit-value"
                                                            type="text"
                                                            placeholder="e.g. 1 or 200-100"
                                                            value={formData.unitValue}
                                                            onChange={(e) => setFormData({ ...formData, unitValue: e.target.value })}
                                                            required={!hasVariations}
                                                            className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                                        />
                                                    </div>

                                                    <div className="grid gap-3 group/input">
                                                        <Label htmlFor="unit" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Unit Type <span className="text-red-500">*</span></Label>
                                                        <Select required={!hasVariations} value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                                                            <SelectTrigger id="unit" className="bg-background border-border/50 focus-ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50">
                                                                <SelectValue placeholder="Select unit" />
                                                            </SelectTrigger>
                                                            <SelectContent className="border-border">
                                                                {availableUnits.map((u) => (
                                                                    <SelectItem key={u} value={u.toLowerCase()} className="hover:bg-muted focus:bg-muted cursor-pointer py-2">
                                                                        {u}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {hasVariations && (
                                            <div className="bg-muted/10 p-5 rounded-xl border border-border/50 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-base font-semibold">Product Variations</Label>
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => setVariations([...variations, { id: Date.now(), unit: '', unitValue: '1', mrp: '', price: '', discountPercentage: '', image: null, stockCount: 0 }])}
                                                    >
                                                    <IconPlus className="mr-1.5 h-4 w-4" /> Add Variation
                                                    </Button>
                                                </div>
                                                {variations.length === 0 && (
                                                    <p className="text-sm text-muted-foreground text-center py-4">No variations added yet. Click &quot;Add Variation&quot;.</p>
                                                )}
                                                {variations.map((v, index) => (
                                                    <div key={v.id} className="relative grid grid-cols-1 gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="absolute right-2 top-2 z-10 h-8 w-8 text-destructive hover:bg-destructive/10"
                                                            onClick={() => setVariations(variations.filter(vari => vari.id !== v.id))}
                                                        >
                                                            <IconX className="h-4 w-4" />
                                                        </Button>

                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Quantity <span className="text-red-500">*</span></Label>
                                                            <Input 
                                                                required value={v.unitValue} 
                                                                onChange={e => {
                                                                    const newVars = [...variations];
                                                                    newVars[index].unitValue = e.target.value;
                                                                    setVariations(newVars);
                                                                }} 
                                                                className="h-9 text-sm" 
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Unit <span className="text-red-500">*</span></Label>
                                                            <Select 
                                                                required value={v.unit} 
                                                                onValueChange={val => {
                                                                    const newVars = [...variations];
                                                                    newVars[index].unit = val;
                                                                    setVariations(newVars);
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-9 text-sm">
                                                                    <SelectValue placeholder="Unit" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableUnits.map(u => <SelectItem key={u} value={u.toLowerCase()}>{u}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">MRP (₹) <span className="text-red-500">*</span></Label>
                                                            <Input 
                                                                type="number" min="0" step="0.01" required value={v.mrp}
                                                                onChange={e => {
                                                                    const newVars = [...variations];
                                                                    const newMrp = e.target.value;
                                                                    let newPrice = newVars[index].price;
                                                                    if (newMrp && newVars[index].discountPercentage) {
                                                                        newPrice = (parseFloat(newMrp) - (parseFloat(newMrp) * parseFloat(newVars[index].discountPercentage) / 100)).toFixed(2);
                                                                    } else if (newMrp && !newVars[index].discountPercentage) {
                                                                        newPrice = newMrp;
                                                                    }
                                                                    newVars[index].mrp = newMrp;
                                                                    newVars[index].price = newPrice;
                                                                    setVariations(newVars);
                                                                }} 
                                                                className="h-9 text-sm" 
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Disc (%)</Label>
                                                            <Input 
                                                                type="number" min="0" max="100" step="0.01" value={v.discountPercentage}
                                                                onChange={e => {
                                                                    const newVars = [...variations];
                                                                    const newPct = e.target.value;
                                                                    let newPrice = newVars[index].price;
                                                                    if (newVars[index].mrp && newPct) {
                                                                        newPrice = (parseFloat(newVars[index].mrp) - (parseFloat(newVars[index].mrp) * parseFloat(newPct) / 100)).toFixed(2);
                                                                    } else if (!newPct) {
                                                                        newPrice = newVars[index].mrp;
                                                                    }
                                                                    newVars[index].discountPercentage = newPct;
                                                                    newVars[index].price = newPrice;
                                                                    setVariations(newVars);
                                                                }} 
                                                                className="h-9 text-sm" 
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Price (₹) <span className="text-red-500">*</span></Label>
                                                            <Input 
                                                                type="number" min="0" step="0.01" required value={v.price}
                                                                onChange={e => {
                                                                    const newVars = [...variations];
                                                                    const newPrice = e.target.value;
                                                                    let newPct = newVars[index].discountPercentage;
                                                                    if (newVars[index].mrp && newPrice && parseFloat(newVars[index].mrp) > 0) {
                                                                        newPct = (((parseFloat(newVars[index].mrp) - parseFloat(newPrice)) / parseFloat(newVars[index].mrp)) * 100).toFixed(2);
                                                                    } else if (!newPrice) {
                                                                        newPct = "";
                                                                    }
                                                                    newVars[index].price = newPrice;
                                                                    newVars[index].discountPercentage = newPct;
                                                                    setVariations(newVars);
                                                                }} 
                                                                className="h-9 text-sm" 
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Init Stock</Label>
                                                            <Input 
                                                                type="number" min="0" step="1" value={v.stockCount !== undefined ? v.stockCount : 0}
                                                                onChange={e => {
                                                                    const newVars = [...variations];
                                                                    newVars[index].stockCount = e.target.value;
                                                                    setVariations(newVars);
                                                                }} 
                                                                className="h-9 text-sm" 
                                                            />
                                                        </div>
                                                        <div className="space-y-2 flex flex-col justify-end">
                                                            {v.image ? (
                                                                <div className="relative h-9 w-full rounded border flex items-center justify-between px-2 bg-muted/50 overflow-hidden group/varimg">
                                                                    <span className="text-[10px] truncate max-w-[70%]">
                                                                        {v.image instanceof File ? v.image.name : 'Uploaded Img'}
                                                                    </span>
                                                                    <Button 
                                                                        type="button" variant="ghost" size="icon" 
                                                                        className="h-6 w-6 text-destructive"
                                                                        onClick={() => {
                                                                            const newVars = [...variations];
                                                                            newVars[index].image = null;
                                                                            setVariations(newVars);
                                                                        }}
                                                                    >
                                                                        <IconX className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="relative h-9 w-full rounded border border-dashed border-primary/50 flex items-center justify-center text-[10px] font-medium hover:bg-primary/5 transition-colors cursor-pointer">
                                                                    <span className="text-primary">+ Image (Opt)</span>
                                                                    <Input 
                                                                        type="file" accept="image/*" 
                                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                                        onChange={(e) => {
                                                                            if (e.target.files && e.target.files[0]) {
                                                                                const newVars = [...variations];
                                                                                newVars[index].image = e.target.files[0];
                                                                                setVariations(newVars);
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                    <div className="grid gap-3 group/input">
                                        <Label className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Product Images</Label>

                                        {/* Existing Images */}
                                        {existingImages.length > 0 && (
                                            <div className="mb-4">
                                                <Label className="text-sm font-medium text-foreground/80 mb-3 block">Current Images:</Label>
                                                <div className="flex flex-wrap gap-4">
                                                    {existingImages.map((imgUrl, idx) => (
                                                        <div key={idx} className="relative h-28 w-28 rounded-xl border-2 border-border overflow-hidden group/img shadow-sm transition-all hover:shadow-md hover:border-primary/50">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={imgUrl} alt="Product" className="object-cover w-full h-full group-hover/img:scale-110 transition-transform duration-500" />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
                                                                <Button
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    className="h-9 w-9 bg-destructive/90 hover:bg-destructive rounded-full scale-50 group-hover/img:scale-100 transition-transform duration-300"
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
                                        <div className="relative mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/10 sm:p-10">
                                            <div className="p-4 bg-background rounded-full shadow-sm border border-border group-hover/dropzone:scale-110 transition-transform duration-300">
                                                <IconUpload className="h-8 w-8 text-primary" />
                                            </div>
                                            <span className="text-base text-foreground font-semibold mt-2">Click to upload new images</span>
                                            <span className="text-sm text-muted-foreground">Multiple images supported (PNG, JPG)</span>
                                            <Input
                                                id="images"
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleNewImageChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                        </div>

                                        {/* Preview New Images */}
                                        {newImages.length > 0 && (
                                            <div className="mt-4 flex flex-col gap-3">
                                                <Label className="text-sm font-medium text-foreground/80">New Images to Upload:</Label>
                                                <ul className="space-y-3">
                                                    {newImages.map((img, idx) => (
                                                        <li key={idx} className="flex items-center justify-between bg-background p-3 rounded-lg border border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <div className="flex items-center gap-3 truncate">
                                                                <div className="h-10 w-10 rounded bg-muted/30 overflow-hidden flex items-center justify-center flex-shrink-0 border border-border/50 relative">
                                                                    <ImageFilePreview file={img} />
                                                                </div>
                                                                <span className="truncate max-w-[80%] font-medium text-sm">{img.name}</span>
                                                            </div>
                                                            <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors rounded-full" onClick={() => handleRemoveNewImage(idx)}>
                                                                <IconX className="h-4 w-4" />
                                                            </Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="sticky bottom-0 z-20 flex justify-between gap-3 border-t border-border/70 bg-card/95 p-4 backdrop-blur-xl sm:p-6">
                                    <Link href={`/dashboard/product-management/${productType}`}>
                                        <Button variant="outline" type="button" disabled={uploading}>Cancel</Button>
                                    </Link>
                                    <Button type="submit" disabled={uploading} className="shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 min-w-36 active:translate-y-0">
                                        {uploading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                                                <span>Updating...</span>
                                            </div>
                                        ) : "Update Product"}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    )}
                </div>
            </>
    );
}

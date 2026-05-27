"use client"

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IconArrowLeft, IconSearch } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"

import { db } from "@/firebase/config";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useAppStore } from "@/store/useAppStore";

export default function EditCoupon() {
    const { categories } = useAppStore();
    const params = useParams();
    const productType = params.productType;
    const couponId = params.id;
    const router = useRouter();

    const availableCategories = categories[productType === 'home-food' ? 'home-food' : 'kissan-fresh'] || [];

    const [code, setCode] = useState("");
    const [discountType, setDiscountType] = useState("percentage");
    const [discountValue, setDiscountValue] = useState("");
    const [applyTo, setApplyTo] = useState("all");
    const [applicableCategory, setApplicableCategory] = useState("");
    const [applicableProduct, setApplicableProduct] = useState("");
    const [minOrderValue, setMinOrderValue] = useState("");
    const [maxItemQty, setMaxItemQty] = useState("");
    const [maxUsesPerUser, setMaxUsesPerUser] = useState("");
    const [totalUsageLimit, setTotalUsageLimit] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingCoupon, setLoadingCoupon] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // For search inside select
    const [categorySearch, setCategorySearch] = useState("");
    const [productSearch, setProductSearch] = useState("");

    useEffect(() => {
        const fetchCoupon = async () => {
            if (!couponId) return;
            try {
                const docRef = doc(db, "coupons", couponId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCode(data.code || "");
                    setDiscountType(data.discountType || "percentage");
                    setDiscountValue(data.discountValue ? data.discountValue.toString() : "");
                    setApplyTo(data.applyTo || "all");
                    setApplicableCategory(data.applicableCategory || "");
                    setApplicableProduct(data.applicableProduct || "");
                    setMinOrderValue(data.minOrderValue ? data.minOrderValue.toString() : "");
                    setMaxItemQty(data.maxItemQty ? data.maxItemQty.toString() : "");
                    setMaxUsesPerUser(data.maxUsesPerUser ? data.maxUsesPerUser.toString() : "");
                    setTotalUsageLimit(data.totalUsageLimit ? data.totalUsageLimit.toString() : "");
                    setIsActive(data.hasOwnProperty('isActive') ? data.isActive : true);
                } else {
                    alert("Coupon not found");
                    router.push(`/dashboard/coupon-management/${productType}`);
                }
            } catch (error) {
                console.error("Error fetching coupon:", error);
            } finally {
                setLoadingCoupon(false);
            }
        };
        fetchCoupon();
    }, [couponId, productType, router]);

    useEffect(() => {
        if (applyTo === "product" && products.length === 0) {
            fetchProducts();
        }
    }, [applyTo]);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const q = query(collection(db, "products"), where("productOrigin", "==", productType));
            const snapshot = await getDocs(q);
            const productsList = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            }));
            setProducts(productsList);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const filteredCategories = availableCategories.filter(cat => 
        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );

    const filteredProducts = products.filter(prod => 
        prod.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (applyTo === "category" && !applicableCategory) {
            alert("Please select a category.");
            return;
        }
        if (applyTo === "product" && !applicableProduct) {
            alert("Please select a product.");
            return;
        }

        setSaving(true);

        try {
            let applicableProductName = "";
            if (applyTo === "product") {
                const prod = products.find(p => p.id === applicableProduct);
                if (prod) applicableProductName = prod.name;
            }

            const couponData = {
                code: code.toUpperCase(),
                discountType,
                discountValue: parseFloat(discountValue) || 0,
                applyTo,
                applicableCategory: applyTo === "category" ? applicableCategory : null,
                applicableProduct: applyTo === "product" ? applicableProduct : null,
                applicableProductName: applyTo === "product" ? applicableProductName : null,
                minOrderValue: parseFloat(minOrderValue) || 0,
                maxItemQty: parseInt(maxItemQty) || null,
                maxUsesPerUser: parseInt(maxUsesPerUser) || null,
                totalUsageLimit: parseInt(totalUsageLimit) || null,
                isActive,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, "coupons", couponId), couponData);
            
            alert("Coupon Updated Successfully!");
            router.push(`/dashboard/coupon-management/${productType}`);
        } catch (error) {
            console.error("Error updating coupon: ", error);
            alert("Error updating coupon: " + error.message);
        } finally {
            setSaving(false);
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
                        <Link href={`/dashboard/coupon-management/${productType}`}>
                            <Button variant="outline" size="icon">
                                <IconArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </Button>
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Edit Coupon</h2>
                    </div>

                    {loadingCoupon ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-muted-foreground">Loading coupon details...</p>
                        </div>
                    ) : (
                        <Card className="border-0 shadow-lg relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <form onSubmit={handleSubmit} className="relative z-10">
                                <CardHeader className="border-b border-border/50 pb-6 mb-6">
                                    <CardTitle className="text-2xl">Edit Details</CardTitle>
                                    <CardDescription className="text-base text-muted-foreground/80">
                                        Update the rules and limits for coupon: {code}.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8 px-8">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="grid gap-3 group/input">
                                            <Label htmlFor="code" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Coupon Code</Label>
                                            <Input
                                                id="code"
                                                placeholder="e.g. SUMMER50"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                                required
                                                className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50 uppercase font-mono tracking-wider font-bold"
                                            />
                                        </div>
                                        <div className="grid gap-3 group/input">
                                            <Label className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Status</Label>
                                            <div className="flex items-center space-x-3 h-12 px-4 rounded-md border border-border/50 bg-background hover:bg-muted/50 transition-colors">
                                                <Switch 
                                                    id="isActive" 
                                                    checked={isActive} 
                                                    onCheckedChange={setIsActive} 
                                                />
                                                <Label htmlFor="isActive" className="cursor-pointer font-medium">{isActive ? "Active (Users can apply this)" : "Inactive (Hidden)"}</Label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Discount Value & Type */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="grid gap-3 group/input">
                                            <Label htmlFor="discountType" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Discount Type</Label>
                                            <Select required value={discountType} onValueChange={setDiscountType}>
                                                <SelectTrigger id="discountType" className="bg-background border-border/50 focus:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent className="border-border">
                                                    <SelectItem value="percentage" className="py-2">Percentage (%)</SelectItem>
                                                    <SelectItem value="fixed" className="py-2">Fixed Amount (₹)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-3 group/input">
                                            <Label htmlFor="discountValue" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Discount Value</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                                    {discountType === 'percentage' ? '%' : '₹'}
                                                </span>
                                                <Input
                                                    id="discountValue"
                                                    type="number"
                                                    placeholder={discountType === 'percentage' ? "e.g. 10" : "e.g. 50"}
                                                    min="0"
                                                    step="0.01"
                                                    value={discountValue}
                                                    onChange={(e) => setDiscountValue(e.target.value)}
                                                    required
                                                    className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50 font-medium pl-8"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Applicability */}
                                    <div className="bg-muted/20 p-6 rounded-xl border border-border/50 space-y-6">
                                        <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Applicability & Restrictions</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="grid gap-3 group/input">
                                                <Label htmlFor="applyTo" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Applies To</Label>
                                                <Select required value={applyTo} onValueChange={(val) => {
                                                    setApplyTo(val);
                                                    if (val !== 'category') setApplicableCategory("");
                                                    if (val !== 'product') setApplicableProduct("");
                                                }}>
                                                    <SelectTrigger id="applyTo" className="bg-background border-border/50 focus:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50">
                                                        <SelectValue placeholder="Select restriction" />
                                                    </SelectTrigger>
                                                    <SelectContent className="border-border">
                                                        <SelectItem value="all" className="py-2">All Products</SelectItem>
                                                        <SelectItem value="category" className="py-2">Specific Category</SelectItem>
                                                        <SelectItem value="product" className="py-2">Specific Product</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {applyTo === "category" && (
                                                <div className="grid gap-3 group/input animate-in fade-in slide-in-from-left-2">
                                                    <Label htmlFor="applicableCategory" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Select Category</Label>
                                                    <Select required value={applicableCategory} onValueChange={setApplicableCategory}>
                                                        <SelectTrigger id="applicableCategory" className="bg-background border-border/50 focus:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50">
                                                            <SelectValue placeholder="Select category" />
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
                                                                            if (e.key === ' ') e.stopPropagation();
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {filteredCategories.length === 0 ? (
                                                                <p className="p-4 text-center text-xs text-muted-foreground italic">No categories match.</p>
                                                            ) : (
                                                                <div className="max-h-[220px] overflow-y-auto">
                                                                    {filteredCategories.map((cat) => (
                                                                        <SelectItem key={cat.id} value={cat.name} className="py-2 text-sm">{cat.name}</SelectItem>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {applyTo === "product" && (
                                                <div className="grid gap-3 group/input animate-in fade-in slide-in-from-left-2">
                                                    <Label htmlFor="applicableProduct" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Select Product</Label>
                                                    <Select required disabled={loadingProducts} value={applicableProduct} onValueChange={setApplicableProduct}>
                                                        <SelectTrigger id="applicableProduct" className="bg-background border-border/50 focus:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50">
                                                            <SelectValue placeholder={loadingProducts ? "Loading..." : "Select product"} />
                                                        </SelectTrigger>
                                                        <SelectContent position="popper" side="bottom" className="border-border max-h-[300px] w-full min-w-[var(--radix-select-trigger-width)]">
                                                            <div className="p-2 sticky top-0 bg-background z-10 border-b border-border/50 mb-1">
                                                                <div className="relative">
                                                                    <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                                                                    <Input 
                                                                        placeholder="Search products..." 
                                                                        value={productSearch}
                                                                        onChange={(e) => setProductSearch(e.target.value)}
                                                                        className="h-8 pl-8 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === ' ') e.stopPropagation();
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {filteredProducts.length === 0 ? (
                                                                <p className="p-4 text-center text-xs text-muted-foreground italic">No products match.</p>
                                                            ) : (
                                                                <div className="max-h-[220px] overflow-y-auto">
                                                                    {filteredProducts.map((prod) => (
                                                                        <SelectItem key={prod.id} value={prod.id} className="py-2 text-sm">{prod.name}</SelectItem>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="grid gap-3 group/input">
                                                <Label htmlFor="maxItemQty" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Max Item Quantity (Optional)</Label>
                                                <Input
                                                    id="maxItemQty"
                                                    type="number"
                                                    placeholder="e.g. 2"
                                                    min="1"
                                                    value={maxItemQty}
                                                    onChange={(e) => setMaxItemQty(e.target.value)}
                                                    className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                                />
                                                <p className="text-xs text-muted-foreground">Limits how many items of the restricted category/product can be purchased with this coupon.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Limits */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="grid gap-3 group/input">
                                            <Label htmlFor="minOrderValue" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Min Order Value (₹) (Optional)</Label>
                                            <Input
                                                id="minOrderValue"
                                                type="number"
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                value={minOrderValue}
                                                onChange={(e) => setMinOrderValue(e.target.value)}
                                                className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                            />
                                        </div>
                                        <div className="grid gap-3 group/input">
                                            <Label htmlFor="maxUsesPerUser" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Max Uses per User (Optional)</Label>
                                            <Input
                                                id="maxUsesPerUser"
                                                type="number"
                                                placeholder="Unlimited"
                                                min="1"
                                                value={maxUsesPerUser}
                                                onChange={(e) => setMaxUsesPerUser(e.target.value)}
                                                className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                            />
                                        </div>
                                        <div className="grid gap-3 group/input">
                                            <Label htmlFor="totalUsageLimit" className="text-sm font-semibold tracking-wide text-foreground/80 group-focus-within/input:text-primary transition-colors">Total Uses Limit (Optional)</Label>
                                            <Input
                                                id="totalUsageLimit"
                                                type="number"
                                                placeholder="Unlimited"
                                                min="1"
                                                value={totalUsageLimit}
                                                onChange={(e) => setTotalUsageLimit(e.target.value)}
                                                className="bg-background border-border/50 focus-visible:ring-primary/50 h-12 text-base transition-all duration-300 hover:bg-muted/50"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between border-t border-border/50 p-8 bg-muted/20 backdrop-blur-sm -mx-0">
                                    <Link href={`/dashboard/coupon-management/${productType}`}>
                                        <Button variant="outline" type="button" disabled={saving}>Cancel</Button>
                                    </Link>
                                    <Button type="submit" disabled={saving} className="shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 min-w-36 active:translate-y-0">
                                        {saving ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                                                <span>Updating...</span>
                                            </div>
                                        ) : "Update Coupon"}
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

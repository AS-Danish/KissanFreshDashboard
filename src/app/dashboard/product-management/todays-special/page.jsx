"use client"

import Link from "next/link";
import Image from "next/image"
import { useState, useMemo, useEffect } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore"
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
import { Skeleton } from "@/components/ui/skeleton"
import { IconSearch, IconChevronLeft, IconChevronRight, IconStarFilled, IconStar } from "@tabler/icons-react"
import { toast } from "sonner"
import { updateCatalogVersion } from "@/services/appConfigService";

const ITEMS_PER_PAGE = 5;
const HOME_FOOD_CATEGORIES = ["Pickles", "Spices", "Snacks", "Sweets", "Staples", "Meals"];
const HOME_FOOD_TAGS = ["Homemade", "Preservative-free", "Traditional", "Authentic", "Mom's Recipe", "Spicy", "Healthy"];

export default function TodaysSpecial() {
    const [products, setProducts] = useState([]);
    const [specialProducts, setSpecialProducts] = useState([]);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [tagFilter, setTagFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingSpecials, setLoadingSpecials] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Date selection
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    const [selectedDate, setSelectedDate] = useState(getTodayString());

    // Fetch Products
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
            let productData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter for only Home Foods
            productData = productData.filter(p => p.productOrigin === "home-food");
            productData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            
            setProducts(productData);
            setLoadingProducts(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch Today's Specials based on selected date
    useEffect(() => {
        setLoadingSpecials(true);
        const unsubscribe = onSnapshot(doc(db, "todays_specials", selectedDate), (docSnap) => {
             if (docSnap.exists()) {
                 setSpecialProducts(docSnap.data().specials || []);
             } else {
                 setSpecialProducts([]);
             }
             setLoadingSpecials(false);
         }, (error) => {
             console.error("Error listening to specials:", error);
             toast.error("Failed to load today's specials");
             setLoadingSpecials(false);
         });

        return () => unsubscribe();
    }, [selectedDate]);

    const handleToggleSpecial = async (product) => {
        const isSpecial = specialProducts.some(sp => sp.productId === product.id);
        
        let newSpecials;
        if (isSpecial) {
            newSpecials = specialProducts.filter(sp => sp.productId !== product.id);
        } else {
            // Need to save productId, image, title
            const newSpecial = {
                productId: product.id,
                title: product.name,
                image: (product.images && product.images.length > 0) ? product.images[0] : null
            };
            newSpecials = [...specialProducts, newSpecial];
        }

        // Optimistic update
        setSpecialProducts(newSpecials);
        setSaving(true);
        
        try {
            await setDoc(doc(db, "todays_specials", selectedDate), {
                specials: newSpecials,
                updatedAt: new Date().toISOString()
            });
            
            // Update catalog version for cache busting
            await updateCatalogVersion();
            
            toast.success(isSpecial ? "Removed from Today's Special" : "Added to Today's Special");
        } catch (error) {
            console.error("Error saving specials:", error);
            toast.error("Failed to update Today's Special");
            // Revert optimistic update
            setSpecialProducts(specialProducts);
        } finally {
            setSaving(false);
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === "all" || product.category?.toLowerCase() === categoryFilter.toLowerCase();
            
            let matchesPrice = true;
            if (priceFilter === "under100") matchesPrice = product.price < 100;
            else if (priceFilter === "100to500") matchesPrice = product.price >= 100 && product.price <= 500;
            else if (priceFilter === "over500") matchesPrice = product.price > 500;

            const matchesTag = tagFilter === "all" || (product.tags && product.tags.includes(tagFilter));

            return matchesSearch && matchesCategory && matchesPrice && matchesTag;
        });
    }, [products, searchQuery, categoryFilter, priceFilter, tagFilter]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, priceFilter, tagFilter]);

    return (
        <>
                <div className="dashboard-page dashboard-page-wide">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            Today's Special
                        </h2>
                        <div className="flex items-center gap-2">
                             <label className="text-sm font-medium">Select Date:</label>
                             <Input 
                                 type="date" 
                                 value={selectedDate} 
                                 onChange={(e) => setSelectedDate(e.target.value)} 
                                 className="w-auto"
                             />
                        </div>
                    </div>

                    {/* Today's Special Active Selection */}
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-4 mb-4">
                        <h3 className="text-lg font-semibold mb-4 text-primary flex items-center gap-2">
                             <IconStarFilled className="h-5 w-5 text-amber-500" />
                             Specials for {selectedDate}
                        </h3>
                        
                        {loadingSpecials ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {Array(3).fill(0).map((_, idx) => (
                                    <div key={idx} className="flex flex-col border bg-background rounded-lg overflow-hidden shadow-sm items-center p-3 relative">
                                        <Skeleton className="h-24 w-24 mb-3 rounded-md" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                ))}
                            </div>
                        ) : specialProducts.length === 0 ? (
                             <p className="text-sm text-muted-foreground p-4 bg-background rounded-md border">
                                 No products currently marked as Today's Special. Select products below.
                             </p>
                        ) : (
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {specialProducts.map((sp) => (
                                    <div key={sp.productId} className="flex flex-col border bg-background rounded-lg overflow-hidden shadow-sm items-center p-3 relative group">
                                         <div className="relative h-24 w-24 mb-3 rounded-md overflow-hidden bg-muted">
                                             {sp.image ? (
                                                  <Image src={sp.image} alt={sp.title} fill sizes="96px" className="object-cover" />
                                             ) : (
                                                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                                             )}
                                         </div>
                                         <p className="text-sm font-medium text-center line-clamp-2 w-full" title={sp.title}>{sp.title}</p>
                                         
                                         <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleToggleSpecial({ id: sp.productId })}
                                            disabled={saving}
                                         >
                                             <IconStarFilled className="h-4 w-4" />
                                         </Button>
                                    </div>
                                ))}
                             </div>
                        )}
                    </div>

                    <h3 className="text-lg font-semibold mb-2">Available Home Foods</h3>

                    {/* Filters */}
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
                                    {HOME_FOOD_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-1/4">
                            <Select value={tagFilter} onValueChange={setTagFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Tag" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tags</SelectItem>
                                    {HOME_FOOD_TAGS.map((tag) => (
                                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                    ))}
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

                    {/* Available Products Table */}
                    <div className="rounded-md border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Mark as Special</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingProducts ? (
                                    Array(5).fill(0).map((_, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto rounded-md" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No home food products found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProducts.map((product) => {
                                        const isSpecial = specialProducts.some(sp => sp.productId === product.id);
                                        return (
                                            <TableRow key={product.id}>
                                                <TableCell>
                                                    <div className="relative h-12 w-12 overflow-hidden rounded-md border flex items-center justify-center bg-muted">
                                                        {product.images && product.images.length > 0 ? (
                                                            <Image
                                                                src={product.images[0]}
                                                                alt={product.name}
                                                                fill
                                                                sizes="48px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground w-full text-center">No Img</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {product.name}
                                                </TableCell>
                                                <TableCell>{product.category}</TableCell>
                                                <TableCell>₹{Number(product.price).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant={isSpecial ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => handleToggleSpecial(product)}
                                                        disabled={saving}
                                                        className={isSpecial ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                                                    >
                                                        {isSpecial ? (
                                                            <><IconStarFilled className="h-4 w-4 mr-1" /> Special</>
                                                        ) : (
                                                            <><IconStar className="h-4 w-4 mr-1" /> Mark</>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
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
            </>
    );
}

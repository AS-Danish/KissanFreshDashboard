"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IconArrowLeft, IconEdit, IconTrash, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { db } from "@/firebase/config";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { updateCatalogVersion } from "@/services/appConfigService";
import { ConfirmDeleteDialog } from "@/components/dashboard/confirm-delete-dialog";
import { toast } from "sonner";

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id;
    const productType = params.productType;

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!productId) return;
            try {
                const docRef = doc(db, "products", productId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() });
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
    }, [productId, router]);

    const handleDelete = async () => {
        try {
            await deleteDoc(doc(db, "products", productId));
            await updateCatalogVersion();
            toast.success("Product deleted");
            router.push(`/dashboard/product-management/${productType}`);
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast.error("Failed to delete product");
            throw error;
        }
    };

    const nextImage = () => {
        if (product?.images?.length > 1) {
            setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
        }
    };

    const prevImage = () => {
        if (product?.images?.length > 1) {
            setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
        }
    };

    return (
        <>
                <div className="dashboard-page">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href={`/dashboard/product-management/${productType}`}>
                                <Button variant="outline" size="icon">
                                    <IconArrowLeft className="h-4 w-4" />
                                    <span className="sr-only">Back</span>
                                </Button>
                            </Link>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                Product Details
                            </h2>
                        </div>
                        {product && (
                            <div className="flex gap-2 border-l pl-4 border-muted">
                                <Link href={`/dashboard/product-management/${productType}/edit/${productId}`}>
                                    <Button variant="outline" className="gap-2">
                                        <IconEdit className="h-4 w-4 text-primary" /> Edit
                                    </Button>
                                </Link>
                                <ConfirmDeleteDialog
                                    title="Delete product?"
                                    description={`This permanently removes ${product.name} from the catalogue. This action cannot be undone.`}
                                    onConfirm={handleDelete}
                                >
                                    <Button variant="destructive" className="gap-2">
                                        <IconTrash className="h-4 w-4" /> Delete
                                    </Button>
                                </ConfirmDeleteDialog>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-muted-foreground animate-pulse">
                                Loading product details...
                            </p>
                        </div>
                    ) : product ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                            {/* Image Slider */}
                            <div className="flex flex-col gap-4">
                                <Card className="overflow-hidden border-0 shadow-sm bg-muted/20">
                                    <CardContent className="p-0 relative group h-[400px] flex items-center justify-center">
                                        {product.images && product.images.length > 0 ? (
                                            <>
                                                <Image
                                                    src={product.images[currentImageIndex]}
                                                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                    className="object-contain p-4"
                                                    priority
                                                />
                                                {product.images.length > 1 && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-background/80 hover:bg-background"
                                                            onClick={prevImage}
                                                        >
                                                            <IconChevronLeft className="h-5 w-5" />
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-background/80 hover:bg-background"
                                                            onClick={nextImage}
                                                        >
                                                            <IconChevronRight className="h-5 w-5" />
                                                        </Button>
                                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm">
                                                            {currentImageIndex + 1} / {product.images.length}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-2">
                                                <Image src="/placeholder.svg" width={100} height={100} alt="No image" className="opacity-20" />
                                                <span className="text-sm">No images available</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Thumbnails */}
                                {product.images?.length > 1 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 p-1">
                                        {product.images.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentImageIndex(idx)}
                                                className={`relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                            >
                                                <Image src={img} alt="thumbnail" fill sizes="80px" className="object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="flex flex-col gap-6">
                                <div>
                                    <Badge variant="outline" className="mb-3 text-xs uppercase tracking-wider bg-background">
                                        {product.category}
                                    </Badge>
                                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                                        {product.name}
                                    </h1>
                                    <div className="text-3xl font-semibold text-primary">
                                        ₹{Number(product.price).toFixed(2)}
                                        <span className="text-sm text-muted-foreground ml-2 font-normal uppercase tracking-wide italic">
                                            {product.unitValue && Number(product.unitValue) > 1 ? ` for ${product.unitValue}${product.unit}` : `/ ${product.unit || 'piece'}`}
                                        </span>
                                    </div>
                                </div>

                                <div className="h-px w-full bg-border" />

                                <div>
                                    <h3 className="font-semibold text-lg mb-2">Description</h3>
                                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {product.description}
                                    </p>
                                </div>

                                {product.tags && product.tags.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-lg mb-3">Highlights & Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {product.tags.map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="secondary"
                                                    className="px-3 py-1 text-sm font-medium bg-secondary/50 text-secondary-foreground"
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </>
    );
}

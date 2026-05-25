"use client";

import { useEffect, useState } from "react";
import { fetchThemes, updateThemes } from "@/services/appConfigService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { storage } from "@/firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { IconUpload, IconLoader2 } from "@tabler/icons-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import imageCompression from "browser-image-compression";

export default function ThemeManagementPage() {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);

    useEffect(() => {
        loadThemes();
    }, []);

    const loadThemes = async () => {
        setLoading(true);
        try {
            const data = await fetchThemes();
            setThemes(data);
        } catch (error) {
            toast.error("Failed to load themes.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (targetThemeName) => {
        setThemes(prevThemes => 
            prevThemes.map(theme => {
                const themeName = Object.keys(theme).find(k => k !== "imageURL");
                return {
                    ...theme,
                    [themeName]: themeName === targetThemeName ? true : false
                };
            })
        );
    };

    const handleImageUrlChange = (targetThemeName, newUrl) => {
        setThemes(prevThemes => 
            prevThemes.map(theme => {
                const themeName = Object.keys(theme).find(k => k !== "imageURL");
                if (themeName === targetThemeName) {
                    return { ...theme, imageURL: newUrl };
                }
                return theme;
            })
        );
    };

    const handleImageUpload = async (targetThemeName, event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingId(targetThemeName);
        try {
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
                fileType: 'image/webp'
            };
            const compressedFile = await imageCompression(file, options);
            const originalName = file.name.split('.')[0] || 'image';
            const storageRef = ref(storage, `products/themes/${Date.now()}_${originalName}.webp`);
            const uploadTask = await uploadBytesResumable(storageRef, compressedFile);
            const downloadURL = await getDownloadURL(uploadTask.ref);
            
            handleImageUrlChange(targetThemeName, downloadURL);
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image");
        } finally {
            setUploadingId(null);
            // Reset the input value so the same file can be uploaded again if needed
            event.target.value = "";
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateThemes(themes);
            toast.success("Themes updated successfully.");
        } catch (error) {
            toast.error("Failed to save themes.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SidebarProvider
                style={{
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)"
                }}
            >
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex-1 p-8">Loading themes...</div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <div className="flex items-center justify-between space-y-2 mb-6">
                        <h2 className="text-3xl font-bold tracking-tight">Theme Management</h2>
                        <Button onClick={handleSave} disabled={saving || uploadingId !== null}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {themes.map(theme => {
                            const themeName = Object.keys(theme).find(k => k !== "imageURL");
                            const isEnabled = theme[themeName];
                            const imageUrl = theme.imageURL;
                            
                            return (
                                <Card key={themeName} className={isEnabled ? "border-primary" : ""}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {themeName}
                                        </CardTitle>
                                        <Switch 
                                            checked={isEnabled}
                                            onCheckedChange={() => handleToggle(themeName)}
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="space-y-2 pt-4">
                                                <Label htmlFor={`image-${themeName}`}>Image URL</Label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        id={`image-${themeName}`}
                                                        value={imageUrl || ""}
                                                        onChange={(e) => handleImageUrlChange(themeName, e.target.value)}
                                                        placeholder="https://..."
                                                    />
                                                    <div className="relative">
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            type="button" 
                                                            disabled={uploadingId === themeName}
                                                            className="shrink-0"
                                                        >
                                                            {uploadingId === themeName ? (
                                                                <IconLoader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <IconUpload className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                            onChange={(e) => handleImageUpload(themeName, e)}
                                                            disabled={uploadingId === themeName}
                                                            title="Upload image"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            {imageUrl && (
                                                <div className="relative h-32 w-full overflow-hidden rounded-md border group">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img 
                                                        src={imageUrl} 
                                                        alt={themeName}
                                                        className="object-cover w-full h-full"
                                                    />
                                                    {/* Overlay to allow changing image by clicking the preview */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                                        {uploadingId === themeName ? (
                                                            <IconLoader2 className="h-8 w-8 text-white animate-spin" />
                                                        ) : (
                                                            <div className="flex flex-col items-center text-white">
                                                                <IconUpload className="h-6 w-6 mb-1" />
                                                                <span className="text-xs font-medium">Change Image</span>
                                                            </div>
                                                        )}
                                                        <Input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                            onChange={(e) => handleImageUpload(themeName, e)}
                                                            disabled={uploadingId === themeName}
                                                            title="Change image"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

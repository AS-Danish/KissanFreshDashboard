"use client";

import { useEffect, useState } from "react";
import { fetchThemes, getThemeName, THEME_COLOR_FIELDS, updateThemes } from "@/services/appConfigService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { storage } from "@/firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { IconCheck, IconLoader2, IconPalette, IconUpload } from "@tabler/icons-react";
import imageCompression from "browser-image-compression";

export default function ThemeManagementPage() {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);

    const colorLabels = {
        primary: "Primary / buttons",
        accent: "Accent / highlights",
        background: "Page background",
        surface: "Cards / sheets",
        success: "Success states",
        error: "Errors / alerts",
    };
    const isValidHex = (value) => /^#[0-9A-F]{6}$/i.test(value || "");

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
                const themeName = getThemeName(theme);
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
                const themeName = getThemeName(theme);
                if (themeName === targetThemeName) {
                    return { ...theme, imageURL: newUrl };
                }
                return theme;
            })
        );
    };

    const handleColorChange = (targetThemeName, colorKey, value) => {
        setThemes(prevThemes => prevThemes.map(theme => {
            if (getThemeName(theme) !== targetThemeName) return theme;
            return { ...theme, colors: { ...theme.colors, [colorKey]: value.toUpperCase() } };
        }));
    };

    const handleImageUpload = async (targetThemeName, event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingId(targetThemeName);
        try {
            const options = {
                maxSizeMB: 0.1,
                maxWidthOrHeight: 800,
                initialQuality: 0.85,
                useWebWorker: true,
                fileType: 'image/webp'
            };
            const compressedFile = await imageCompression(file, options);
            const originalName = file.name.split('.')[0] || 'image';
            const storageRef = ref(storage, `products/themes/${Date.now()}_${originalName}.webp`);
            const uploadTask = await uploadBytesResumable(storageRef, compressedFile, {
                contentType: "image/webp",
                cacheControl: "public,max-age=31536000,immutable",
            });
            const downloadURL = await getDownloadURL(uploadTask.ref);
            
            // Immediately update state and save to Firestore
            const updatedThemes = themes.map(theme => {
                const themeName = getThemeName(theme);
                if (themeName === targetThemeName) {
                    return { ...theme, imageURL: downloadURL };
                }
                return theme;
            });
            
            setThemes(updatedThemes);
            await updateThemes(updatedThemes);
            
            toast.success("Image uploaded and saved successfully");
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
        const invalidTheme = themes.find(theme =>
            THEME_COLOR_FIELDS.some(colorKey => !isValidHex(theme.colors?.[colorKey]))
        );
        if (invalidTheme) {
            toast.error("Check the color codes", {
                description: `${getThemeName(invalidTheme)} contains an invalid value. Use six-digit hex colors such as #14B8A6.`,
            });
            return;
        }
        setSaving(true);
        try {
            await updateThemes(themes);
            toast.success("Theme published", {
                description: "Colors and branding will update in the consumer app automatically.",
            });
        } catch (error) {
            toast.error("Failed to save themes.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <>
                    <div className="dashboard-loading" role="status">Loading themes…</div>
                </>
        );
    }

    return (
        <>
                <div className="dashboard-page dashboard-page-wide">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Theme Management</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Choose one active theme and publish its core app colors.</p>
                        </div>
                        <Button onClick={handleSave} disabled={saving || uploadingId !== null}>
                            {saving ? <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> : <IconCheck className="mr-2 h-4 w-4" />}
                            {saving ? "Publishing..." : "Publish Theme"}
                        </Button>
                    </div>
                    <div className="grid gap-5 xl:grid-cols-2">
                        {themes.map(theme => {
                            const themeName = getThemeName(theme);
                            const isEnabled = theme[themeName];
                            const imageUrl = theme.imageURL;
                            
                            return (
                                <Card key={themeName} className={isEnabled ? "border-primary ring-2 ring-primary/10" : ""}>
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
                                            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                                                <div className="flex items-center gap-2">
                                                    <IconPalette className="h-4 w-4 text-primary" />
                                                    <p className="text-sm font-semibold">Core app colors</p>
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {THEME_COLOR_FIELDS.map(colorKey => {
                                                        const colorValue = theme.colors?.[colorKey] || "#000000";
                                                        return (
                                                            <div className="space-y-1.5" key={colorKey}>
                                                                <Label htmlFor={`${themeName}-${colorKey}`} className="text-xs">{colorLabels[colorKey]}</Label>
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        aria-label={`${colorLabels[colorKey]} color picker`}
                                                                        type="color"
                                                                        value={isValidHex(colorValue) ? colorValue : "#000000"}
                                                                        onChange={(e) => handleColorChange(themeName, colorKey, e.target.value)}
                                                                        className="h-9 w-11 cursor-pointer p-1"
                                                                    />
                                                                    <Input
                                                                        id={`${themeName}-${colorKey}`}
                                                                        value={colorValue}
                                                                        onChange={(e) => handleColorChange(themeName, colorKey, e.target.value)}
                                                                        pattern="^#[0-9A-Fa-f]{6}$"
                                                                        maxLength={7}
                                                                        className="h-9 font-mono text-xs uppercase"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-2 pt-4">
                                                <Label htmlFor={`image-${themeName}`}>Header artwork (optional)</Label>
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
            </>
    );
}

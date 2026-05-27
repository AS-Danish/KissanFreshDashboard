"use client"

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconPlus, IconTrash, IconCategory, IconLayoutCards, IconChefHat, IconShoppingBag, IconSearch, IconEdit, IconCheck, IconX } from "@tabler/icons-react"
import { toast } from "sonner"
import { 
    addCategory, 
    deleteCategory, 
    updateCategory,
    addSection, 
    deleteSection,
    updateSectionRank,
    updateSection
} from "@/services/categoryService"
import { Checkbox } from "@/components/ui/checkbox"
import { useAppStore } from "@/store/useAppStore";
import { Skeleton } from "@/components/ui/skeleton"

export default function CategoryManagementPage() {
    const { categories, sections, loading } = useAppStore();
    
    // Form states
    const [newCategory, setNewCategory] = useState({ name: "", type: "home-food" });
    const [newSection, setNewSection] = useState({ name: "", type: "home-food", selectedCategories: [], rank: "" });
    
    // Search states
    const [hfSearch, setHfSearch] = useState("");
    const [kfSearch, setKfSearch] = useState("");

    const handleAddCategory = async (type) => {
        if (!newCategory.name.trim()) return;
        
        try {
            await addCategory(newCategory.name.trim(), type);
            toast.success("Category added successfully");
            setNewCategory({ ...newCategory, name: "" });
        } catch (error) {
            toast.error("Failed to add category");
        }
    };

    const handleDeleteCategory = async (id) => {
        try {
            await deleteCategory(id);
            toast.success("Success");
        } catch (error) {
            toast.error("Failed to delete category");
        }
    };

    const handleUpdateCategory = async (id, newName) => {
        try {
            await updateCategory(id, newName);
            toast.success("Success");
        } catch (error) {
            toast.error("Failed to update category");
        }
    };

    const handleAddSection = async (type) => {
        if (!newSection.name.trim()) return;
        if (newSection.selectedCategories.length === 0) {
            toast.error("Please select at least one category");
            return;
        }

        try {
            await addSection(
                newSection.name.trim(), 
                type, 
                newSection.selectedCategories, 
                newSection.rank ? Number(newSection.rank) : null
            );
            toast.success("Section added successfully");
            setNewSection({ name: "", type: "home-food", selectedCategories: [], rank: "" });
        } catch (error) {
            toast.error("Failed to add section");
        }
    };

    const handleUpdateRank = async (sectionId, newRank, type) => {
        try {
            await updateSectionRank(sectionId, Number(newRank), type);
            toast.success("Success");
        } catch (error) {
            toast.error("Failed to reorder sections");
        }
    };

    const handleDeleteSection = async (id) => {
        try {
            await deleteSection(id);
            toast.success("Success");
        } catch (error) {
            toast.error("Failed to delete section");
        }
    };

    const handleUpdateSection = async (id, data) => {
        try {
            await updateSection(id, data);
            toast.success("Success");
        } catch (error) {
            toast.error("Failed to update section");
        }
    };


    const handleToggleCategoryInSection = (catName) => {
        setNewSection(prev => {
            const exists = prev.selectedCategories.includes(catName);
            if (exists) {
                return { ...prev, selectedCategories: prev.selectedCategories.filter(c => c !== catName) };
            } else {
                return { ...prev, selectedCategories: [...prev.selectedCategories, catName] };
            }
        });
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
                <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Category & Section Management</h1>
                        <p className="text-muted-foreground">Manage your product organization and storefront layout.</p>
                    </div>

                    <Tabs defaultValue="categories" className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                            <TabsTrigger value="categories" className="gap-2">
                                <IconCategory className="size-4" />
                                Categories
                            </TabsTrigger>
                            <TabsTrigger value="sections" className="gap-2">
                                <IconLayoutCards className="size-4" />
                                Sections
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="categories" className="space-y-8 outline-none">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Home Food Categories */}
                                <CategoryModule 
                                    title="Home Food" 
                                    icon={<IconChefHat className="text-orange-500" />}
                                    type="home-food"
                                    list={categories["home-food"]}
                                    inputValue={newCategory.type === "home-food" ? newCategory.name : ""}
                                    onInputChange={(val) => setNewCategory({ name: val, type: "home-food" })}
                                    onAdd={() => handleAddCategory("home-food")}
                                    onDelete={handleDeleteCategory}
                                    onEdit={handleUpdateCategory}
                                    loading={loading}
                                    searchValue={hfSearch}
                                    onSearchChange={setHfSearch}
                                />

                                {/* Groceries Categories */}
                                <CategoryModule 
                                    title="Groceries" 
                                    icon={<IconShoppingBag className="text-green-500" />}
                                    type="kissan-fresh"
                                    list={categories["kissan-fresh"]}
                                    inputValue={newCategory.type === "kissan-fresh" ? newCategory.name : ""}
                                    onInputChange={(val) => setNewCategory({ name: val, type: "kissan-fresh" })}
                                    onAdd={() => handleAddCategory("kissan-fresh")}
                                    onDelete={handleDeleteCategory}
                                    onEdit={handleUpdateCategory}
                                    loading={loading}
                                    searchValue={kfSearch}
                                    onSearchChange={setKfSearch}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="sections" className="space-y-8 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Home Food Sections */}
                                <SectionModule 
                                    title="Home Food Sections"
                                    type="home-food"
                                    categories={categories["home-food"]}
                                    sections={sections["home-food"]}
                                    newSection={newSection}
                                    setNewSection={setNewSection}
                                    onAdd={() => handleAddSection("home-food")}
                                    onDelete={handleDeleteSection}
                                    onUpdateRank={handleUpdateRank}
                                    onEdit={handleUpdateSection}
                                    onToggleCategory={handleToggleCategoryInSection}
                                    loading={loading}
                                />

                                {/* Groceries Sections */}
                                <SectionModule 
                                    title="Groceries Sections"
                                    type="kissan-fresh"
                                    categories={categories["kissan-fresh"]}
                                    sections={sections["kissan-fresh"]}
                                    newSection={newSection}
                                    setNewSection={setNewSection}
                                    onAdd={() => handleAddSection("kissan-fresh")}
                                    onDelete={handleDeleteSection}
                                    onUpdateRank={handleUpdateRank}
                                    onEdit={handleUpdateSection}
                                    onToggleCategory={handleToggleCategoryInSection}
                                    loading={loading}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

function CategoryModule({ title, icon, list, inputValue, onInputChange, onAdd, onDelete, onEdit, loading, searchValue, onSearchChange }) {
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");

    const handleSaveEdit = async (id) => {
        if (!editValue.trim()) return;
        if (onEdit) {
            await onEdit(id, editValue.trim());
        }
        setEditingId(null);
    };

    const filteredList = list.filter(cat => 
        cat.name.toLowerCase().includes(searchValue.toLowerCase())
    );

    return (
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                    {icon}
                    <CardTitle>{title}</CardTitle>
                </div>
                <CardDescription>Manage categories for {title.toLowerCase()}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Add new category..." 
                        value={inputValue}
                        onChange={(e) => onInputChange(e.target.value)}
                        className="bg-background/50 h-10"
                        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
                    />
                    <Button onClick={onAdd} size="icon" className="shrink-0 h-10 w-10">
                        <IconPlus className="size-4" />
                    </Button>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Current Categories</Label>
                        <div className="relative w-1/2">
                            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input 
                                placeholder="Search..." 
                                value={searchValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="h-8 pl-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                            />
                        </div>
                    </div>
                    
                    <div className="bg-muted/30 rounded-xl border border-border/50 divide-y divide-border/30 overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading && list.length === 0 ? (
                            <div className="p-4 space-y-3">
                                {Array(4).fill(0).map((_, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-8 w-16" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredList.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground italic">
                                {searchValue ? "No categories matching your search." : "No categories yet."}
                            </p>
                        ) : (
                            filteredList.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 px-4 hover:bg-muted/50 transition-colors group">
                                    {editingId === cat.id ? (
                                        <div className="flex items-center gap-2 flex-1 mr-2">
                                            <Input 
                                                value={editValue} 
                                                onChange={(e) => setEditValue(e.target.value)} 
                                                className="h-8 text-sm"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit(cat.id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                autoFocus
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(cat.id)} className="size-8 text-green-500 hover:text-green-600 hover:bg-green-500/10">
                                                <IconCheck className="size-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="size-8 text-destructive hover:bg-destructive/10">
                                                <IconX className="size-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium text-sm">{cat.name}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => { setEditingId(cat.id); setEditValue(cat.name); }}
                                                    className="size-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                                >
                                                    <IconEdit className="size-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => onDelete(cat.id)}
                                                    className="size-8 text-destructive hover:bg-destructive/10"
                                                >
                                                    <IconTrash className="size-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function SectionModule({ title, type, categories, sections, newSection, setNewSection, onAdd, onDelete, onUpdateRank, onEdit, onToggleCategory, loading }) {
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editSection, setEditSection] = useState({ name: "", selectedCategories: [] });

    const filteredCategories = categories.filter(cat => 
        cat.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>Define storefront sections by grouping categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Create Section Form */}
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3 space-y-2">
                            <Label className="text-xs font-semibold">Section Name</Label>
                            <Input 
                                placeholder="e.g. Best Sellers" 
                                value={newSection.type === type ? newSection.name : ""}
                                onChange={(e) => setNewSection({ ...newSection, name: e.target.value, type: type })}
                                className="bg-background h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Rank</Label>
                            <Input 
                                type="number"
                                placeholder="Auto" 
                                value={newSection.type === type ? newSection.rank : ""}
                                onChange={(e) => setNewSection({ ...newSection, rank: e.target.value, type: type })}
                                className="bg-background h-10"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-semibold">Select Categories ({newSection.type === type ? newSection.selectedCategories.length : 0})</Label>
                            <div className="relative w-1/2">
                                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                                <Input 
                                    placeholder="Filter..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-7 pl-8 text-[10px] bg-background border-none focus-visible:ring-1"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1 max-h-[150px] overflow-y-auto p-1">
                            {filteredCategories.map(cat => (
                                <div 
                                    key={cat.id}
                                    onClick={() => {
                                        setNewSection(prev => ({ ...prev, type: type }));
                                        onToggleCategory(cat.name);
                                    }}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all text-[11px] font-medium
                                        ${newSection.type === type && newSection.selectedCategories.includes(cat.name) 
                                            ? "bg-primary border-primary text-primary-foreground shadow-sm scale-105" 
                                            : "bg-background border-border hover:border-primary/50 text-muted-foreground"}
                                    `}
                                >
                                    {cat.name}
                                </div>
                            ))}
                            {categories.length === 0 && <p className="text-xs text-muted-foreground italic px-1">Add categories first to create sections.</p>}
                            {search && filteredCategories.length === 0 && <p className="text-xs text-muted-foreground italic px-1">No categories match.</p>}
                        </div>
                    </div>

                    <Button className="w-full mt-2 h-10 shadow-md shadow-primary/10" onClick={onAdd} disabled={!categories.length}>
                        <IconPlus className="size-4 mr-2" />
                        Create {type === 'home-food' ? 'Home Food' : 'Grocery'} Section
                    </Button>
                </div>

                {/* Sections List */}
                <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Active Sections (Ordered by Rank)</Label>
                    <div className="grid gap-3">
                        {sections.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed">No sections configured yet.</p>
                        ) : (
                            sections.map(sec => (
                                <div key={sec.id} className="relative group overflow-hidden rounded-xl border border-border/50 bg-background/40 p-4 hover:border-primary/30 transition-all flex items-start gap-4 shadow-sm hover:shadow-md">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm text-sm">
                                            {sec.rank}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="size-6 rounded-md hover:bg-primary/10 hover:text-primary"
                                                onClick={() => onUpdateRank(sec.id, Math.max(1, sec.rank - 1), type)}
                                                disabled={sec.rank <= 1}
                                            >
                                                <IconPlus className="size-3 rotate-45" /> 
                                                <span className="sr-only">Move Up</span>
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="size-6 rounded-md hover:bg-primary/10 hover:text-primary mt-[-4px]"
                                                onClick={() => onUpdateRank(sec.id, sec.rank + 1, type)}
                                            >
                                                <IconPlus className="size-3 rotate-[225deg]" />
                                                <span className="sr-only">Move Down</span>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        {editingId === sec.id ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Input 
                                                        value={editSection.name}
                                                        onChange={(e) => setEditSection({ ...editSection, name: e.target.value })}
                                                        className="h-8 font-bold text-base bg-background"
                                                        placeholder="Section Name"
                                                    />
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        if (editSection.name.trim()) {
                                                            onEdit(sec.id, { name: editSection.name.trim(), categories: editSection.selectedCategories });
                                                            setEditingId(null);
                                                        }
                                                    }} className="size-8 text-green-500 hover:bg-green-500/10">
                                                        <IconCheck className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="size-8 text-destructive hover:bg-destructive/10">
                                                        <IconX className="size-4" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Categories:</Label>
                                                    <div className="flex flex-wrap gap-1.5 mt-1 max-h-[100px] overflow-y-auto">
                                                        {categories.map(cat => (
                                                            <div 
                                                                key={cat.id}
                                                                onClick={() => {
                                                                    setEditSection(prev => {
                                                                        const exists = prev.selectedCategories.includes(cat.name);
                                                                        if (exists) {
                                                                            return { ...prev, selectedCategories: prev.selectedCategories.filter(c => c !== cat.name) };
                                                                        } else {
                                                                            return { ...prev, selectedCategories: [...prev.selectedCategories, cat.name] };
                                                                        }
                                                                    });
                                                                }}
                                                                className={`
                                                                    flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer transition-all text-[9px] font-bold uppercase
                                                                    ${editSection.selectedCategories.includes(cat.name) 
                                                                        ? "bg-primary border-primary text-primary-foreground border" 
                                                                        : "bg-background border-border border text-muted-foreground hover:border-primary/50"}
                                                                `}
                                                            >
                                                                {cat.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-base">{sec.name}</h4>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Contains {sec.categories?.length || 0} categories</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Rank:</span>
                                                            <input 
                                                                type="number" 
                                                                className="w-8 bg-transparent border-none p-0 text-xs font-bold focus:ring-0 text-center"
                                                                defaultValue={sec.rank}
                                                                onBlur={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    if (val !== sec.rank && val > 0) {
                                                                        onUpdateRank(sec.id, val, type);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        const val = parseInt(e.target.value);
                                                                        if (val !== sec.rank && val > 0) {
                                                                            onUpdateRank(sec.id, val, type);
                                                                        }
                                                                        e.target.blur();
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => {
                                                                    setEditingId(sec.id);
                                                                    setEditSection({ name: sec.name, selectedCategories: sec.categories || [] });
                                                                }}
                                                                className="size-8 text-blue-500 hover:bg-blue-500/10"
                                                            >
                                                                <IconEdit className="size-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => onDelete(sec.id)}
                                                                className="size-8 text-destructive hover:bg-destructive/10"
                                                            >
                                                                <IconTrash className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {sec.categories?.map((cat, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 rounded-md bg-muted text-[9px] font-bold uppercase text-muted-foreground border border-border/20">
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

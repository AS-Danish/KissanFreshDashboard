"use client"

import { useState, useMemo, useEffect } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, query, orderBy, getDocs, doc, setDoc, getDoc } from "firebase/firestore"
import { functions } from "@/firebase/config"
import { httpsCallable } from "firebase/functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { 
    IconSearch, 
    IconCalendarTime,
    IconLock, 
    IconLockOpen,
    IconRefresh,
    IconUsers,
    IconCheck,
    IconX,
    IconPlus,
    IconTrash,
    IconSettings,
    IconBolt
} from "@tabler/icons-react"
import { toast } from "sonner"
import { 
    toggleSlotActive, 
    lockSlot, 
    unlockSlot, 
    assignRiderToSlot, 
    removeRiderFromSlot,
    deleteSlot,
    deleteSlotsByDate
} from "@/services/slotService"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const ITEMS_PER_PAGE = 15;

export default function SlotsManagement() {
    const [slots, setSlots] = useState([]);
    const [allRiders, setAllRiders] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD
    const [loading, setLoading] = useState(true);

    // Dialogs state
    const [isManageRidersOpen, setIsManageRidersOpen] = useState(false);


    const [selectedSlot, setSelectedSlot] = useState(null);
    const [slotRiders, setSlotRiders] = useState([]);
    const [availableRiders, setAvailableRiders] = useState([]); // Riders not in the slot
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingRiders, setLoadingRiders] = useState(false);
    
    // Track ID of rider currently being assigned/removed for loading state
    const [processingRiderId, setProcessingRiderId] = useState(null);

    // Slot Config state
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [activeHours, setActiveHours] = useState([]);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch Slots
    useEffect(() => {
        const slotsRef = collection(db, "slots");
        const q = query(slotsRef, orderBy("startTime", "asc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const slotsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSlots(slotsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching slots:", error);
            setLoading(false);
        });

        // Set default date filter to today
        setDateFilter(new Date().toISOString().split('T')[0]);

        return () => unsubscribe();
    }, []);

    // Fetch All Riders (for the management modal)
    useEffect(() => {
        const fetchAllRiders = async () => {
            try {
                const ridersSnap = await getDocs(collection(db, "riders"));
                setAllRiders(ridersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Failed to load riders list", err);
            }
        }
        fetchAllRiders();
    }, []);

    // Fetch Config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const configSnap = await getDoc(doc(db, "config", "slots"));
                if (configSnap.exists() && configSnap.data().activeHours) {
                    setActiveHours(configSnap.data().activeHours);
                } else {
                    setActiveHours(Array.from({length: 16}, (_, i) => i + 6));
                }
            } catch (err) {
                console.error("Failed to fetch slots config", err);
            }
        };
        fetchConfig();
    }, []);

    const filteredSlots = useMemo(() => {
        return slots.filter((slot) => {
            const matchesSearch = slot.id.toLowerCase().includes(searchQuery.toLowerCase());
            
            // Format Timestamp to date string
            let slotDate = "";
            if (slot.startTime) {
               slotDate = new Date(slot.startTime.seconds * 1000).toISOString().split('T')[0];
            }
            const matchesDate = !dateFilter || slotDate === dateFilter;
            
            return matchesSearch && matchesDate;
        });
    }, [slots, searchQuery, dateFilter]);

    const handleDeleteSlot = async (slotId) => {
        if (!confirm("Are you sure you want to delete this slot?")) return;
        
        setIsSubmitting(true);
        try {
            await deleteSlot(slotId);
            toast.success("Slot deleted successfully!");
        } catch (error) {
            console.error("Failed to delete slot:", error);
            toast.error(error.message || "Failed to delete slot.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDaySlots = async () => {
        if (!dateFilter) return;
        if (!confirm(`Are you sure you want to delete ALL slots for ${dateFilter}? This action cannot be undone.`)) return;
        
        setIsSubmitting(true);
        try {
            const result = await deleteSlotsByDate(dateFilter);
            toast.success(result.message || `Successfully deleted ${result.count} slots.`);
        } catch (error) {
            console.error("Failed to delete day slots:", error);
            toast.error(error.message || "Failed to delete slots for the selected date.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (slotId, currentStatus) => {
        try {
            await toggleSlotActive(slotId, !currentStatus);
            toast.success(`Slot ${!currentStatus ? 'activated' : 'deactivated'}.`);
        } catch (error) {
            toast.error("Failed to toggle status.");
        }
    };

    const handleToggleLock = async (slotId, currentLock) => {
        try {
            if (currentLock) {
                await unlockSlot(slotId);
                toast.success("Slot unlocked.");
            } else {
                await lockSlot(slotId);
                toast.success("Slot locked.");
            }
        } catch (error) {
            toast.error("Failed to toggle lock.");
        }
    };

    // Manage Riders Modal functions
    const openManageRiders = (slot) => {
        setSelectedSlot(slot);
        setIsManageRidersOpen(true);
    };

    useEffect(() => {
        if (!selectedSlot || !isManageRidersOpen) return;

        setLoadingRiders(true);
        const ridersRef = collection(db, `slots/${selectedSlot.id}/riders`);
        
        const unsubscribe = onSnapshot(ridersRef, (snapshot) => {
            const currentRiders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSlotRiders(currentRiders);
            
            // Calculate available riders (all minus current)
            const currentRiderIds = currentRiders.map(r => r.id);
            const aRiders = allRiders.filter(r => !currentRiderIds.includes(r.id));
            setAvailableRiders(aRiders);
            
            setLoadingRiders(false);
        });

        return () => unsubscribe();
    }, [selectedSlot, isManageRidersOpen, allRiders]);

    const handleAssignRider = async (riderId) => {
        setProcessingRiderId(riderId);
        try {
            await assignRiderToSlot(selectedSlot.id, riderId);
            toast.success("Rider assigned to slot.");
        } catch (error) {
            toast.error(error.message || "Failed to assign rider.");
        } finally {
            setProcessingRiderId(null);
        }
    };

    const handleRemoveRider = async (riderId) => {
        setProcessingRiderId(riderId);
        try {
            await removeRiderFromSlot(selectedSlot.id, riderId);
            toast.success("Rider removed from slot.");
        } catch (error) {
            toast.error(error.message || "Failed to remove rider.");
        } finally {
            setProcessingRiderId(null);
        }
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        try {
            await setDoc(doc(db, "config", "slots"), { activeHours });
            toast.success("Slot configuration saved successfully.");
            setIsConfigOpen(false);
        } catch (error) {
            toast.error("Failed to save configuration.");
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleManualGenerate = async () => {
        setIsGenerating(true);
        try {
            const manualGenerateSlots = httpsCallable(functions, 'manualGenerateSlots');
            const result = await manualGenerateSlots();
            toast.success(`Successfully generated ${result.data.count} slots.`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate slots.");
        } finally {
            setIsGenerating(false);
        }
    };


    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
                <div className="dashboard-page dashboard-page-wide">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase">
                            Slot Management
                        </h2>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
                                <IconSettings className="w-4 h-4 mr-2" /> Configure Hours
                            </Button>
                            <Button onClick={handleManualGenerate} disabled={isGenerating}>
                                {isGenerating ? <IconRefresh className="w-4 h-4 mr-2 animate-spin" /> : <IconBolt className="w-4 h-4 mr-2" />}
                                Generate Now
                            </Button>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Slots (Filtered)</p>
                                    <h3 className="text-2xl font-bold text-foreground">{filteredSlots.length}</h3>
                                </div>
                                <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                                    <IconCalendarTime className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Slots</p>
                                    <h3 className="text-2xl font-bold text-foreground">{filteredSlots.filter(s => s.isActive).length}</h3>
                                </div>
                                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center">
                                    <IconCheck className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Locked Slots</p>
                                    <h3 className="text-2xl font-bold text-foreground">{filteredSlots.filter(s => s.isLocked).length}</h3>
                                </div>
                                <div className="h-10 w-10 bg-orange-500/10 text-orange-600 rounded-lg flex items-center justify-center">
                                    <IconLock className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Capacity (Filtered)</p>
                                    <h3 className="text-2xl font-bold text-foreground">{filteredSlots.reduce((acc, curr) => acc + (curr.capacity || 0), 0)}</h3>
                                </div>
                                <div className="h-10 w-10 bg-purple-500/10 text-purple-600 rounded-lg flex items-center justify-center">
                                    <IconUsers className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                            <div className="relative w-full md:w-1/2">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                                <Input
                                    type="search"
                                    placeholder="Search by Slot ID..."
                                    className="w-full pl-10 h-12 bg-background border-border/50 shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-1/4">
                               <Input
                                    type="date"
                                    className="h-12 bg-background border-border/50 shadow-sm"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>
                             <div className="w-full md:w-1/4 flex gap-2">
                                <Button 
                                    variant="outline" 
                                    className="h-12 flex-1" 
                                    onClick={() => {setSearchQuery(""); setDateFilter("")}}
                                >
                                    Clear
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    className="h-12 flex-1 shadow-sm"
                                    onClick={handleDeleteDaySlots}
                                    disabled={!dateFilter || isSubmitting}
                                >
                                    <IconTrash className="h-4 w-4 mr-2" />
                                    Delete Day
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-foreground px-6 py-4">Slot Time</TableHead>
                                        <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                                        <TableHead className="font-semibold text-foreground text-center">Lock Status</TableHead>
                                        <TableHead className="font-semibold text-foreground text-center">Capacity (Used/Total)</TableHead>
                                        <TableHead className="font-semibold text-foreground text-center">Riders</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground px-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array(5).fill(0).map((_, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <Skeleton className="h-5 w-32" />
                                                        <Skeleton className="h-3 w-48" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-8 w-20 mx-auto rounded-full" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-8 w-24 mx-auto rounded-lg" /></TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <Skeleton className="h-5 w-16" />
                                                        <Skeleton className="h-1.5 w-24 rounded-full" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                                                <TableCell className="text-right px-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Skeleton className="h-8 w-20 rounded-md" />
                                                        <Skeleton className="h-8 w-8 rounded-md" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : filteredSlots.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-32">
                                                <div className="flex flex-col items-center gap-6">
                                                    <div className="h-24 w-24 bg-muted/50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-border">
                                                        <IconCalendarTime className="h-10 w-10 text-muted-foreground/30" />
                                                    </div>
                                                    <div className="text-center space-y-2">
                                                        <p className="text-xl font-black uppercase text-primary tracking-tight">No Slots Found</p>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Adjust your filters or generate new slots.</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSlots.map((slot) => (
                                            <TableRow 
                                                key={slot.id} 
                                                className="group hover:bg-primary/[0.01] transition-all border-b last:border-0"
                                            >
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter opacity-80">{slot.id}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <Switch 
                                                            checked={slot.isActive} 
                                                            onCheckedChange={() => handleToggleActive(slot.id, slot.isActive)}
                                                        />
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                                            {slot.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleToggleLock(slot.id, slot.isLocked)}
                                                        className={`h-8 px-2 rounded-lg ${slot.isLocked ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20'}`}
                                                    >
                                                        {slot.isLocked ? <IconLock className="h-4 w-4 mr-1" /> : <IconLockOpen className="h-4 w-4 mr-1" />}
                                                        <span className="text-[10px] font-bold uppercase">{slot.isLocked ? 'Locked' : 'Unlocked'}</span>
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-sm">
                                                            <span className={slot.assignedOrders >= slot.capacity && slot.capacity > 0 ? 'text-destructive' : 'text-primary'}>
                                                                {slot.assignedOrders || 0}
                                                            </span>
                                                            <span className="text-muted-foreground mx-1">/</span>
                                                            {slot.capacity || 0}
                                                        </span>
                                                        <div className="w-24 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${slot.assignedOrders >= slot.capacity && slot.capacity > 0 ? 'bg-destructive' : 'bg-primary'}`}
                                                                style={{ width: `${slot.capacity > 0 ? Math.min(100, ((slot.assignedOrders || 0) / slot.capacity) * 100) : 0}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary" className="font-mono">{slot.capacity ? slot.capacity / 6 : 0} Riders</Badge>
                                                </TableCell>
                                                 <TableCell className="text-right px-6">
                                                   <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => openManageRiders(slot)} className="text-xs font-semibold">
                                                            <IconUsers className="h-4 w-4 mr-2" />
                                                            Manage
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteSlot(slot.id)}
                                                            disabled={isSubmitting || slot.assignedOrders > 0}
                                                        >
                                                            <IconTrash className="h-4 w-4" />
                                                        </Button>
                                                   </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Manage Riders Dialog */}
                    <Dialog open={isManageRidersOpen} onOpenChange={setIsManageRidersOpen}>
                        <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden rounded-[2rem]">
                            <div className="flex flex-col h-[80vh] max-h-[800px]">
                                <DialogHeader className="p-6 border-b bg-muted/30">
                                    <DialogTitle className="text-xl flex items-center gap-2">
                                        <IconUsers className="h-6 w-6 text-primary" />
                                        Manage Riders for Slot
                                    </DialogTitle>
                                    <DialogDescription className="text-sm font-medium">
                                        Slot: <span className="text-foreground font-mono">{selectedSlot?.id}</span> ({formatTime(selectedSlot?.startTime)} - {formatTime(selectedSlot?.endTime)})
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className="flex-1 overflow-y-auto p-6 bg-background space-y-6">
                                    {/* Current Assigned Riders */}
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Assigned Riders ({slotRiders.length})</h3>
                                        {loadingRiders ? (
                                            <div className="flex justify-center py-8"><IconRefresh className="animate-spin text-primary" /></div>
                                        ) : slotRiders.length === 0 ? (
                                            <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border/50">
                                                <p className="text-sm text-muted-foreground font-medium">No riders assigned to this slot yet.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {slotRiders.map(riderRef => {
                                                    // Find full rider details from allRiders
                                                    const riderParams = allRiders.find(r => r.id === riderRef.id) || riderRef;
                                                    return (
                                                    <div key={riderRef.id} className="flex items-center justify-between p-3 rounded-xl border bg-card shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                             <Avatar className="h-8 w-8">
                                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${riderParams.name}`} />
                                                                <AvatarFallback>{riderParams.name?.substring(0, 2) || 'RI'}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm">{riderParams.name || 'Unknown Rider'}</span>
                                                                <span className="text-[10px] text-muted-foreground">Orders: {riderRef.assignedOrders || 0} / 6</span>
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => handleRemoveRider(riderRef.id)}
                                                            disabled={processingRiderId === riderRef.id}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                                        >
                                                            {processingRiderId === riderRef.id ? <IconRefresh className="h-4 w-4 animate-spin" /> : <IconTrash className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                )})}
                                            </div>
                                        )}
                                    </div>

                                    <hr className="border-border/50" />

                                    {/* Available to Assign */}
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Available Riders</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {availableRiders.length === 0 ? (
                                                <p className="text-sm text-muted-foreground col-span-2">No other riders available to assign.</p>
                                            ) : (
                                                availableRiders.map(rider => (
                                                    <div key={rider.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-primary/50 bg-background transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={rider.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${rider.name}`} />
                                                                <AvatarFallback>{rider.name?.substring(0, 2) || 'RI'}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm">{rider.name}</span>
                                                                <span className="text-[10px] text-muted-foreground font-mono">{rider.phone || rider.riderId || rider.id}</span>
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            variant="secondary" 
                                                            size="sm"
                                                            onClick={() => handleAssignRider(rider.id)}
                                                            className="h-8 rounded-lg font-bold text-xs min-w-[80px]"
                                                            disabled={selectedSlot?.isLocked || processingRiderId === rider.id}
                                                        >
                                                            {processingRiderId === rider.id ? (
                                                                <IconRefresh className="h-3 w-3 animate-spin py-0" />
                                                            ) : (
                                                                <>
                                                                    <IconPlus className="h-3 w-3 mr-1" /> Assign
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border-t bg-muted/20 flex justify-end">
                                    <Button onClick={() => setIsManageRidersOpen(false)} variant="outline">Done</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Configure Slot Hours Dialog */}
                    <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Configure Slot Hours</DialogTitle>
                                <DialogDescription>
                                    Select the hours for which slots should be generated automatically.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-4 gap-3 py-4">
                                {Array.from({length: 24}, (_, i) => i).map((hour) => (
                                    <div key={hour} className="flex flex-col items-center gap-2">
                                        <Label htmlFor={`hour-${hour}`} className="text-xs font-mono">
                                            {hour.toString().padStart(2, "0")}:00
                                        </Label>
                                        <Switch 
                                            id={`hour-${hour}`}
                                            checked={activeHours.includes(hour)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setActiveHours(prev => [...prev, hour].sort((a,b) => a - b));
                                                } else {
                                                    setActiveHours(prev => prev.filter(h => h !== hour));
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
                                <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
                                    {isSavingConfig ? <IconRefresh className="w-4 h-4 mr-2 animate-spin" /> : <IconCheck className="w-4 h-4 mr-2" />}
                                    Save Configuration
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            </>
    );
}

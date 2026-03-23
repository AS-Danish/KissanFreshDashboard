"use client"

import { useState, useMemo, useEffect } from "react"
import { db } from "@/firebase/config"
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
    IconSearch, 
    IconChevronLeft, 
    IconChevronRight, 
    IconUserPlus, 
    IconTruck, 
    IconCheck, 
    IconX, 
    IconRefresh,
    IconPhone,
    IconMotorbike,
    IconDotsVertical,
    IconUser,
    IconUsers,
    IconStar,
    IconCircleFilled
} from "@tabler/icons-react"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const ITEMS_PER_PAGE = 10;

const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
        case "ACTIVE":
            return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400"
        case "ON DELIVERY":
            return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
        case "INACTIVE":
            return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400"
        default:
            return "bg-muted text-muted-foreground border-border"
    }
}

const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
        case "ACTIVE":
            return <IconCircleFilled className="h-2 w-2" />
        case "ON DELIVERY":
            return <IconTruck className="h-3 w-3" />
        case "INACTIVE":
            return <IconCircleFilled className="h-2 w-2 opacity-50" />
        default:
            return null
    }
}

export default function RiderManagement() {
    const [riders, setRiders] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // Dialog state
    const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const [riderFormData, setRiderFormData] = useState({
        name: '',
        phone: '',
        vehicleType: 'Bike',
        vehicleNumber: '',
        status: 'INACTIVE'
    });
    
    const [selectedRider, setSelectedRider] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const ridersRef = collection(db, "riders");
        const q = query(ridersRef, orderBy("name", "asc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ridersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRiders(ridersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching riders:", error);
            setLoading(false);
            // If collection doesn't exist, we'll just have an empty array
        });

        return () => unsubscribe();
    }, []);

    const filteredRiders = useMemo(() => {
        return riders.filter((rider) => {
            const matchesSearch = 
                rider.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rider.riderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rider.phone?.includes(searchQuery);
            
            const matchesStatus = statusFilter === "all" || rider.status?.toLowerCase() === statusFilter.toLowerCase();
            
            return matchesSearch && matchesStatus;
        });
    }, [riders, searchQuery, statusFilter]);

    const totalPages = Math.ceil(filteredRiders.length / ITEMS_PER_PAGE) || 1;
    const paginatedRiders = filteredRiders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const handleUpdateStatus = async (riderId, newStatus) => {
        try {
            const riderRef = doc(db, "riders", riderId)
            await updateDoc(riderRef, {
                status: newStatus,
                updatedAt: new Date().toISOString()
            })
            toast.success(`Rider status updated to ${newStatus}`)
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error("Failed to update status")
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setRiderFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setRiderFormData({
            name: '',
            phone: '',
            vehicleType: 'Bike',
            vehicleNumber: '',
            status: 'INACTIVE'
        });
        setSelectedRider(null);
    };

    const handleAddRider = async (e) => {
        e.preventDefault();
        
        if (!riderFormData.name || !riderFormData.phone) {
            toast.error("Please fill in required fields: Name and Phone");
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "riders"), {
                ...riderFormData,
                riderId: 'R' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
                avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(riderFormData.name)}`,
                totalDeliveries: 0,
                rating: 5.0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            toast.success("Rider added successfully");
            setIsAddRouteOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error adding rider:", error);
            toast.error("Failed to add rider");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditRider = async (e) => {
        e.preventDefault();
        
        if (!riderFormData.name || !riderFormData.phone) {
            toast.error("Please fill in required fields: Name and Phone");
            return;
        }

        setIsSubmitting(true);
        try {
            const riderRef = doc(db, "riders", selectedRider.id);
            await updateDoc(riderRef, {
                name: riderFormData.name,
                phone: riderFormData.phone,
                vehicleType: riderFormData.vehicleType,
                vehicleNumber: riderFormData.vehicleNumber,
                avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(riderFormData.name)}`,
                updatedAt: new Date().toISOString()
            });
            
            toast.success("Rider updated successfully");
            setIsEditModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error updating rider:", error);
            toast.error("Failed to update rider");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRider = async () => {
        if (!selectedRider) return;
        
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "riders", selectedRider.id));
            toast.success("Rider deleted successfully");
            setIsDeleteDialogOpen(false);
            setSelectedRider(null);
        } catch (error) {
            console.error("Error deleting rider:", error);
            toast.error("Failed to delete rider");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (rider) => {
        setSelectedRider(rider);
        setRiderFormData({
            name: rider.name || '',
            phone: rider.phone || '',
            vehicleType: rider.vehicleType || 'Bike',
            vehicleNumber: rider.vehicleNumber || '',
            status: rider.status || 'INACTIVE'
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (rider) => {
        setSelectedRider(rider);
        setIsDeleteDialogOpen(true);
    };

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}>
            <AppSidebar variant="inset" />
            <SidebarInset className="bg-background">
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-8 p-6 md:p-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase">
                            Rider Management
                        </h2>
                        
                        <Dialog open={isAddRouteOpen} onOpenChange={(open) => {
                            setIsAddRouteOpen(open);
                            if (!open) resetForm();
                        }}>
                            <DialogTrigger asChild>
                                <Button className="h-10 px-4 font-medium transition-all shadow-sm">
                                    <IconUserPlus className="mr-2 h-4 w-4" />
                                    Add New Rider
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Add New Rider</DialogTitle>
                                    <DialogDescription>
                                        Enter the details of the new delivery rider here.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddRider} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name *</Label>
                                        <Input id="name" name="name" value={riderFormData.name} onChange={handleFormChange} required placeholder="John Doe" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number *</Label>
                                        <Input id="phone" name="phone" value={riderFormData.phone} onChange={handleFormChange} required placeholder="+91 9876543210" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vehicleType">Vehicle Type</Label>
                                        <Select value={riderFormData.vehicleType} onValueChange={(val) => setRiderFormData(p => ({...p, vehicleType: val}))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select vehicle type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Bike">Bike</SelectItem>
                                                <SelectItem value="Scooty">Scooty</SelectItem>
                                                <SelectItem value="Cycle">Cycle</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                                        <Input id="vehicleNumber" name="vehicleNumber" value={riderFormData.vehicleNumber} onChange={handleFormChange} placeholder="MH 12 AB 1234" />
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsAddRouteOpen(false)}>Cancel</Button>
                                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Rider'}</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Fleet</p>
                                    <h3 className="text-2xl font-bold text-foreground">{riders.length}</h3>
                                </div>
                                <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                                    <IconUsers className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Now</p>
                                    <h3 className="text-2xl font-bold text-foreground">{riders.filter(r => r.status === 'ACTIVE').length}</h3>
                                </div>
                                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center">
                                    <IconCircleFilled className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">En Route</p>
                                    <h3 className="text-2xl font-bold text-foreground">{riders.filter(r => r.status === 'ON DELIVERY').length}</h3>
                                </div>
                                <div className="h-10 w-10 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center">
                                    <IconTruck className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl border shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inactive</p>
                                    <h3 className="text-2xl font-bold text-foreground">{riders.filter(r => r.status === 'INACTIVE').length}</h3>
                                </div>
                                <div className="h-10 w-10 bg-slate-500/10 text-slate-500 rounded-lg flex items-center justify-center">
                                    <IconX className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                            <div className="relative w-full md:w-2/3 lg:w-1/2">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                                <Input
                                    type="search"
                                    placeholder="Search by name, ID or phone..."
                                    className="w-full pl-10 h-12 bg-background border-border/50 shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-1/3 lg:w-1/4">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-12 bg-background border-border/50 shadow-sm">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs font-semibold uppercase">All Riders</SelectItem>
                                        <SelectItem value="ACTIVE" className="text-xs font-semibold uppercase text-emerald-600">Active Fleet</SelectItem>
                                        <SelectItem value="ON DELIVERY" className="text-xs font-semibold uppercase text-blue-600">On Delivery</SelectItem>
                                        <SelectItem value="INACTIVE" className="text-xs font-semibold uppercase text-slate-500">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-foreground px-6 py-4">Rider Identity</TableHead>
                                        <TableHead className="font-semibold text-foreground">Contact</TableHead>
                                        <TableHead className="font-semibold text-foreground">Vehicle</TableHead>
                                        <TableHead className="font-semibold text-foreground">Performance</TableHead>
                                        <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground px-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-32">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center animate-pulse">
                                                        <IconRefresh className="h-8 w-8 text-primary animate-spin" />
                                                    </div>
                                                    <span className="text-xs font-black tracking-[0.2em] text-primary uppercase">Scanning Fleet Database...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : paginatedRiders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-32">
                                                <div className="flex flex-col items-center gap-6">
                                                    <div className="h-24 w-24 bg-muted/50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-border">
                                                        <IconSearch className="h-10 w-10 text-muted-foreground/30" />
                                                    </div>
                                                    <div className="text-center space-y-2">
                                                        <p className="text-xl font-black uppercase text-primary tracking-tight">Zero Results Found</p>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">No riders match your current search parameters.</p>
                                                    </div>
                                                    <Button variant="outline" onClick={() => {setSearchQuery(""); setStatusFilter("all")}} className="rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] h-11 px-8">
                                                        Purge Filters
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedRiders.map((rider) => (
                                            <TableRow 
                                                key={rider.id} 
                                                className="group cursor-pointer hover:bg-primary/[0.01] transition-all border-b last:border-0"
                                            >
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 rounded-full border border-border shadow-sm overflow-hidden">
                                                            <AvatarImage src={rider.avatarUrl} />
                                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                                                                {rider.name?.substring(0, 2) || 'RI'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{rider.name}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter opacity-60">ID: {rider.riderId || rider.id.substring(0, 8)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col whitespace-nowrap">
                                                        <div className="font-medium text-sm flex items-center gap-1.5">
                                                            <IconPhone className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {rider.phone || 'No Phone'}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">Verified Contact</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                            <IconMotorbike className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                                        </div>
                                                        <div className="flex flex-col max-w-[120px]">
                                                            <span className="text-sm font-medium truncate">{rider.vehicleType || 'Bike'}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate">{rider.vehicleNumber || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <IconStar 
                                                                    key={s} 
                                                                    className={`h-3.5 w-3.5 ${s <= (rider.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-muted fill-muted'}`} 
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="font-bold text-xs text-primary">{rider.totalDeliveries || 0} Deliveries</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={`${getStatusColor(rider.status)} px-3 py-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider justify-center w-[130px] mx-auto`}>
                                                        {getStatusIcon(rider.status)}
                                                        {rider.status || 'INACTIVE'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right px-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-9 w-9 border-2 rounded-xl text-primary hover:bg-primary/5 hover:border-primary/20 transition-all shadow-sm"
                                                                >
                                                                    <IconDotsVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-[200px] rounded-2xl shadow-2xl border-2 p-2 bg-white dark:bg-card">
                                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground p-3">Rider Operations</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(rider.id, 'ACTIVE')} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight focus:bg-emerald-50 focus:text-emerald-700 dark:focus:bg-emerald-900/20">
                                                                    <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                                                        <IconCircleFilled className="h-4 w-4 text-emerald-600" />
                                                                    </div>
                                                                    Set Active
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(rider.id, 'INACTIVE')} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight focus:bg-slate-50 focus:text-slate-700 dark:focus:bg-slate-900/20">
                                                                    <div className="h-8 w-8 bg-slate-100 dark:bg-slate-900/30 rounded-lg flex items-center justify-center">
                                                                        <IconX className="h-4 w-4 text-slate-600" />
                                                                    </div>
                                                                    Set Inactive
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => openEditModal(rider)} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-blue-900/20">
                                                                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                                        <IconUser className="h-4 w-4 text-blue-600" />
                                                                    </div>
                                                                    Edit Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => openDeleteModal(rider)} className="rounded-xl flex items-center gap-3 py-3 font-bold text-xs uppercase tracking-tight text-destructive focus:bg-red-50 focus:text-destructive dark:focus:bg-red-900/20">
                                                                    <div className="h-8 w-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                                                        <IconX className="h-4 w-4" />
                                                                    </div>
                                                                    Remove Rider
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border bg-card rounded-xl py-3 px-4 shadow-sm">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-medium text-foreground">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRiders.length)}</span> of <span className="font-medium text-foreground">{filteredRiders.length}</span> riders
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="border-border/50 hover:bg-muted/50"
                                >
                                    <IconChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="text-sm font-medium px-2">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="border-border/50 hover:bg-muted/50"
                                >
                                    Next
                                    <IconChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Edit Rider Dialog */}
                    <Dialog open={isEditModalOpen} onOpenChange={(open) => {
                        setIsEditModalOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Edit Rider</DialogTitle>
                                <DialogDescription>
                                    Update the details for this delivery rider.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleEditRider} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Full Name *</Label>
                                    <Input id="edit-name" name="name" value={riderFormData.name} onChange={handleFormChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-phone">Phone Number *</Label>
                                    <Input id="edit-phone" name="phone" value={riderFormData.phone} onChange={handleFormChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-vehicleType">Vehicle Type</Label>
                                    <Select value={riderFormData.vehicleType} onValueChange={(val) => setRiderFormData(p => ({...p, vehicleType: val}))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select vehicle type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bike">Bike</SelectItem>
                                            <SelectItem value="Scooty">Scooty</SelectItem>
                                            <SelectItem value="Cycle">Cycle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-vehicleNumber">Vehicle Number</Label>
                                    <Input id="edit-vehicleNumber" name="vehicleNumber" value={riderFormData.vehicleNumber} onChange={handleFormChange} />
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Rider Alert Dialog */}
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                        setIsDeleteDialogOpen(open);
                        if (!open) setSelectedRider(null);
                    }}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete <strong>{selectedRider?.name}</strong> from your fleet and remove their data from our servers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteRider} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {isSubmitting ? 'Deleting...' : 'Yes, delete rider'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

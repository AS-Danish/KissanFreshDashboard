"use client"

import { useState, useEffect } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/firebase/config"
import { doc, updateDoc, collection, getDocs } from "firebase/firestore"
import { getAvailableSlotsQuery } from "@/services/slotService"
import { assignRiderToOrderTransaction } from "@/services/orderService"
import { IconPackage, IconTruck, IconCheck, IconX, IconCopy, IconCheck as IconTick, IconUser, IconMapPin, IconCalendar, IconRouter, IconMap2, IconDownload } from "@tabler/icons-react"
import Image from "next/image"
import { toast } from "sonner"

const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
        case "ASSIGNED":
            return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800"
        case "PROCESSING":
            return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
        case "OUT FOR DELIVERY":
            return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
        case "SHIPPED":
            return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
        case "DELIVERED":
            return "bg-secondary/10 text-secondary border-secondary/20 dark:bg-secondary/20 dark:text-secondary-foreground"
        case "CANCELLED":
            return "bg-destructive/10 text-destructive border-destructive/20"
        default:
            return "bg-muted text-muted-foreground border-border"
    }
}

const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
        case "ASSIGNED":
            return <IconCheck className="h-4 w-4" />
        case "PROCESSING":
            return <IconPackage className="h-4 w-4" />
        case "OUT FOR DELIVERY":
            return <IconTruck className="h-4 w-4" />
        case "SHIPPED":
            return <IconTruck className="h-4 w-4" />
        case "DELIVERED":
            return <IconCheck className="h-4 w-4" />
        case "CANCELLED":
            return <IconX className="h-4 w-4" />
        default:
            return null
    }
}

export function formatSlotDisplay(slotId) {
    if (!slotId) return "No Slot Assignment";
    try {
        const [datePart, hourPart] = slotId.split('_');
        const [year, month, day] = datePart.split('-');
        const hourObj = parseInt(hourPart, 10);
        
        const ampmStart = hourObj >= 12 ? 'PM' : 'AM';
        const startH = hourObj % 12 || 12;
        
        const nextHourObj = hourObj + 1;
        const ampmEnd = nextHourObj >= 12 && nextHourObj < 24 ? 'PM' : 'AM';
        const endH = nextHourObj % 12 || 12;
        
        return {
            date: `${day}-${month}-${year}`,
            time: `${startH}:00 ${ampmStart} - ${endH}:00 ${ampmEnd}`
        }
    } catch {
        return { date: slotId, time: "" }
    }
}

export function OrderDetailsSheet({ order, open, onOpenChange, ridersMap = {}, userName = "" }) {
    const [updating, setUpdating] = useState(false)
    const [copied, setCopied] = useState(false)
    
    // Assignment State
    const [slots, setSlots] = useState([])
    const [riders, setRiders] = useState([])
    const [selectedSlot, setSelectedSlot] = useState("")
    const [selectedRider, setSelectedRider] = useState("")
    const [isAssigning, setIsAssigning] = useState(false)

    useEffect(() => {
        if (open) {
            fetchSlots()
            if (order?.slotId) {
                 setSelectedSlot(order.slotId)
                 fetchRidersForSlot(order.slotId)
            } else {
                 setSelectedSlot("")
                 setSelectedRider("")
                 setRiders([])
            }
            if (order?.riderId) setSelectedRider(order.riderId)
        }
    }, [open, order])

    const fetchSlots = async () => {
        try {
            const snap = await getDocs(getAvailableSlotsQuery());
            let fetchedSlots = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            
            // "today and yesterday only" (though tomorrow makes more sense for logistics, doing strictly what was asked)
            const todayDate = new Date();
            const yesterdayDate = new Date(todayDate);
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            
            const todayStr = todayDate.toISOString().split('T')[0];
            const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
            
            fetchedSlots = fetchedSlots.filter(s => s.id.startsWith(todayStr) || s.id.startsWith(yesterdayStr));

            if (order?.slotId && !fetchedSlots.find(s => s.id === order.slotId)) {
                 fetchedSlots.push({ id: order.slotId, name: order.slotId }) // Dummy for display
            }
            setSlots(fetchedSlots)
        } catch (error) {
           console.error("Failed to load slots", error)
        }
    }

    const fetchRidersForSlot = async (slotId) => {
        if (!slotId) return;
        try {
            const snap = await getDocs(collection(db, `slots/${slotId}/riders`));
            const fetchedRiders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setRiders(fetchedRiders)
        } catch (error) {
            console.error("Failed to load riders", error)
        }
    }

    const handleSlotChange = (slotId) => {
        setSelectedSlot(slotId)
        setSelectedRider("")
        fetchRidersForSlot(slotId)
    }

    const handleAssign = async () => {
        if (!selectedSlot || !selectedRider) return toast.error("Select both slot and rider")
        
        setIsAssigning(true)
        try {
            await assignRiderToOrderTransaction(
                order.id, 
                selectedSlot, 
                selectedRider, 
                order.slotId, 
                order.riderId
            )
            toast.success("Order assigned successfully")
             // Component will auto-update since parent passes `order` prop synced to firestore
        } catch (error) {
            toast.error(error.message || "Failed to assign order")
        } finally {
            setIsAssigning(false)
        }
    }

    if (!order) return null

    const handleUpdateStatus = async (newStatus) => {
        setUpdating(true)
        try {
            const orderRef = doc(db, "orders", order.id)
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: new Date().toISOString()
            })
            toast.success(`Order status updated to ${newStatus}`)
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error("Failed to update order status")
        } finally {
            setUpdating(false)
        }
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.info("Copied to clipboard")
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[700px] overflow-y-auto p-0 border-l border-border bg-background">
                <div className="bg-muted/50 p-6 border-b border-border">
                    <SheetHeader className="mb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-primary text-primary-foreground rounded-xl">
                                    <IconPackage className="h-6 w-6" />
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-bold text-foreground">Order Details</SheetTitle>
                                    <SheetDescription className="flex items-center gap-2 mt-1">
                                        <span className="font-mono text-sm text-muted-foreground">{order.orderNumber}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6" 
                                            onClick={() => copyToClipboard(order.orderNumber)}
                                        >
                                            {copied ? <IconTick className="h-3.5 w-3.5 text-secondary" /> : <IconCopy className="h-3.5 w-3.5" />}
                                        </Button>
                                    </SheetDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className={`${getStatusColor(order.status)} px-3 py-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider`}>
                                {getStatusIcon(order.status)}
                                {order.status}
                            </Badge>
                        </div>
                    </SheetHeader>
                </div>

                <div className="p-6 space-y-8">
                    {/* Status Management */}
                    <Card className="rounded-xl border shadow-sm">
                        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Update Order Status</h4>
                                <p className="text-xs text-muted-foreground">Change the current fulfillment state of this order.</p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Select 
                                    disabled={updating} 
                                    value={order.status} 
                                    onValueChange={handleUpdateStatus}
                                >
                                    <SelectTrigger className="w-full sm:w-[180px] h-10 font-medium">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ASSIGNED" className="font-medium text-indigo-600">Assigned</SelectItem>
                                        <SelectItem value="PROCESSING" className="font-medium">Processing</SelectItem>
                                        <SelectItem value="OUT FOR DELIVERY" className="font-medium text-amber-600">Out for Delivery</SelectItem>
                                        <SelectItem value="SHIPPED" className="font-medium">Shipped</SelectItem>
                                        <SelectItem value="DELIVERED" className="font-medium text-secondary">Delivered</SelectItem>
                                        <SelectItem value="CANCELLED" className="font-medium text-destructive">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logistics / Assignment */}
                    <Card className="rounded-xl border shadow-sm bg-muted/5">
                        <CardContent className="p-5">
                             <div className="flex items-center gap-2 mb-4 text-primary">
                                <IconMap2 className="h-5 w-5" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Logistics & Assignment</h3>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                     <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Select Slot</label>
                                     <Select value={selectedSlot} onValueChange={handleSlotChange}>
                                         <SelectTrigger className="w-full">
                                             <SelectValue placeholder="No Slot Selected" />
                                         </SelectTrigger>
                                         <SelectContent>
                                             {slots.map(s => {
                                                 const fmt = formatSlotDisplay(s.id);
                                                 return (
                                                     <SelectItem key={s.id} value={s.id}>
                                                         Date: {fmt.date} | Time: {fmt.time}
                                                     </SelectItem>
                                                 )
                                             })}
                                         </SelectContent>
                                     </Select>
                                </div>
                                <div className="space-y-2">
                                     <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Select Rider</label>
                                     <Select value={selectedRider} onValueChange={setSelectedRider} disabled={!selectedSlot || riders.length === 0}>
                                         <SelectTrigger className="w-full">
                                             <SelectValue placeholder={!selectedSlot ? "Select Slot First" : riders.length === 0 ? "No Riders Available" : "Select Rider"} />
                                         </SelectTrigger>
                                         <SelectContent>
                                             {riders.map(r => (
                                                 <SelectItem key={r.id} value={r.id}>
                                                      {ridersMap[r.riderId || r.id] || r.id} ({r.assignedOrders || 0}/{r.maxOrders || 6})
                                                 </SelectItem>
                                             ))}
                                         </SelectContent>
                                     </Select>
                                </div>
                             </div>

                             <div className="mt-4 flex justify-end">
                                 <Button 
                                    onClick={handleAssign} 
                                    disabled={!selectedSlot || !selectedRider || isAssigning || (order.slotId === selectedSlot && order.riderId === selectedRider)}
                                    className="rounded-lg font-bold uppercase tracking-widest text-[10px] px-6"
                                >
                                     {isAssigning ? "Assigning..." : "Confirm Logistics"}
                                 </Button>
                             </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer Details */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                                <IconUser className="h-4 w-4" />
                                <h3 className="font-bold text-xs uppercase tracking-wider">Customer Info</h3>
                            </div>
                            <div className="space-y-4 bg-muted/20 p-5 rounded-xl border">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Customer Identity</p>
                                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border bg-background/50">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                {userName?.substring(0, 1).toUpperCase() || 'U'}
                                            </div>
                                            <span className="text-sm font-bold text-foreground">{userName || 'Guest User'}</span>
                                        </div>
                                        <code className="text-[10px] font-mono text-muted-foreground opacity-70 truncate block">
                                            ID: {order.userId}
                                        </code>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 border-t pt-4">
                                    <div className="bg-white dark:bg-muted p-2 rounded-lg border shadow-sm shrink-0">
                                        <IconMapPin className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Destination</p>
                                        <p className="text-sm font-bold leading-tight">{order.deliveryAddress}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 border-t pt-4">
                                    <div className="bg-white dark:bg-muted p-2 rounded-lg border shadow-sm shrink-0">
                                        <IconCalendar className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Timestamp</p>
                                        <p className="text-sm font-bold">{new Date(order.orderDate).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Statistics */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                                <IconRouter className="h-4 w-4" />
                                <h3 className="font-bold text-xs uppercase tracking-wider">Financial Summary</h3>
                            </div>
                            <div className="bg-muted/20 p-5 rounded-xl border space-y-4 h-full">
                                <div className="flex flex-col gap-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Items Quantity</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-3xl font-black text-primary">
                                            {order.items?.reduce((acc, item) => acc + item.quantity, 0)}
                                        </p>
                                        <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">SKU Units</span>
                                    </div>
                                </div>
                                <Separator className="bg-border/50" />
                                <div className="flex flex-col gap-2">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payment Type</p>
                                    <div className="flex items-center gap-2 bg-secondary/10 dark:bg-secondary/20 p-2.5 rounded-xl border border-secondary/20 w-fit">
                                        <IconTick className="h-4 w-4 text-secondary" />
                                        <p className="text-xs font-black text-secondary uppercase tracking-tight">{order.paymentMethod === 'COD' ? 'COD' : 'Online'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Order Items Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <h3 className="text-lg font-bold text-foreground">Order Items</h3>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Listing of all products in this order</p>
                            </div>
                            <Badge variant="secondary" className="px-3 py-1 text-[10px] font-bold bg-primary/10 text-primary border-none">
                                {order.items?.length || 0} ITEMS
                            </Badge>
                        </div>
                        <div className="rounded-xl border overflow-hidden bg-card">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-foreground px-4 py-3">Product</TableHead>
                                        <TableHead className="text-center font-semibold text-foreground">Qty</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground">Price</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground px-4">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items?.map((item, index) => (
                                        <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                                                        <Image
                                                            src={item.image}
                                                            alt={item.title}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm text-foreground line-clamp-1">{item.title}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">#{item.productId?.substring(0, 8).toUpperCase()}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-medium text-xs">
                                                    {item.quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground font-medium">₹{item.price.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold text-sm text-foreground">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Order Billing Summary */}
                    <div className="bg-muted/50 p-6 rounded-2xl border flex flex-col items-end gap-5 ml-auto w-full sm:w-[350px]">
                        <div className="w-full space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Subtotal</span>
                                <span className="font-semibold">₹{order.subtotal?.toFixed(2) || "0.00"}</span>
                            </div>
                            {order.deliveryFee > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Delivery Fee</span>
                                    <span className="font-semibold">₹{order.deliveryFee.toFixed(2)}</span>
                                </div>
                            )}
                            {(order.discount > 0 || order.couponDiscount > 0) && (
                                <div className="flex justify-between items-center text-sm text-secondary">
                                    <span className="font-medium">Discount</span>
                                    <span className="font-semibold">-₹{((order.discount || 0) + (order.couponDiscount || 0)).toFixed(2)}</span>
                                </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-foreground">Total Amount</span>
                                <span className="text-2xl font-bold text-primary">₹{order.totalAmount?.toFixed(2) || "0.00"}</span>
                            </div>
                        </div>
                        <div className="w-full flex justify-end gap-2">
                            {/* Receipt button removed as requested */}
                            <Button size="sm" className="font-semibold h-9 rounded-lg w-full">
                                <IconDownload className="h-4 w-4 mr-2" />
                                Download Invoice
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

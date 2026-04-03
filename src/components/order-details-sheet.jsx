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
import { Button } from "@/components/ui/button"
import { db } from "@/firebase/config"
import { doc, updateDoc, collection, getDocs } from "firebase/firestore"
import { getAvailableSlotsQuery } from "@/services/slotService"
import { assignRiderToOrderTransaction } from "@/services/orderService"
import { IconPackage, IconCheck, IconX, IconCopy, IconCheck as IconTick } from "@tabler/icons-react"
import { toast } from "sonner"

import { OrderStatusCard } from "./order/order-status-card"
import { OrderLogisticsCard } from "./order/order-logistics-card"
import { OrderCustomerCard } from "./order/order-customer-card"
import { OrderFinancialSummary } from "./order/order-financial-summary"
import { OrderItemsTable } from "./order/order-items-table"
import { OrderBillingSummary } from "./order/order-billing-summary"

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
        case "SHIPPED":
            return <IconCheck className="h-4 w-4" /> // Using IconCheck as a placeholder since IconTruck was used but let's be consistent
        case "DELIVERED":
            return <IconCheck className="h-4 w-4" />
        case "CANCELLED":
            return <IconX className="h-4 w-4" />
        default:
            return null
    }
}

export function OrderDetailsSheet({ order, open, onOpenChange, ridersMap = {}, userName = "" }) {
    const [updating, setUpdating] = useState(false)
    const [copied, setCopied] = useState(false)
    
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
            
            const todayDate = new Date();
            const yesterdayDate = new Date(todayDate);
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            
            const todayStr = todayDate.toISOString().split('T')[0];
            const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
            
            fetchedSlots = fetchedSlots.filter(s => s.id.startsWith(todayStr) || s.id.startsWith(yesterdayStr));

            if (order?.slotId && !fetchedSlots.find(s => s.id === order.slotId)) {
                 fetchedSlots.push({ id: order.slotId, name: order.slotId })
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

    const isLogisticsChanged = order.slotId !== selectedSlot || order.riderId !== selectedRider;

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
                    <OrderStatusCard 
                        status={order.status} 
                        updating={updating} 
                        onUpdateStatus={handleUpdateStatus} 
                    />

                    <OrderLogisticsCard 
                        selectedSlot={selectedSlot}
                        selectedRider={selectedRider}
                        slots={slots}
                        riders={riders}
                        ridersMap={ridersMap}
                        isAssigning={isAssigning}
                        isChanged={isLogisticsChanged}
                        onSlotChange={handleSlotChange}
                        onRiderChange={setSelectedRider}
                        onAssign={handleAssign}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <OrderCustomerCard 
                            userName={userName}
                            userId={order.userId}
                            deliveryAddress={order.deliveryAddress}
                            orderDate={order.orderDate}
                        />

                        <OrderFinancialSummary 
                            itemsCount={order.items?.reduce((acc, item) => acc + item.quantity, 0)}
                            paymentMethod={order.paymentMethod}
                        />
                    </div>

                    <Separator />

                    <OrderItemsTable items={order.items} />

                    <OrderBillingSummary 
                        subtotal={order.subtotal}
                        deliveryFee={order.deliveryFee}
                        discount={order.discount}
                        couponDiscount={order.couponDiscount}
                        totalAmount={order.totalAmount}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}

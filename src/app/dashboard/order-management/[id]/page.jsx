"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/firebase/config"
import { doc, getDoc, updateDoc, collection, getDocs, onSnapshot } from "firebase/firestore"
import { getAvailableSlotsQuery } from "@/services/slotService"
import { assignRiderToOrderTransaction } from "@/services/orderService"
import { toast } from "sonner"
import { useRef } from "react"
import { useReactToPrint } from "react-to-print"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

import { IconPackage, IconCheck, IconX, IconCopy, IconCheck as IconTick, IconArrowLeft, IconDownload } from "@tabler/icons-react"

import { OrderStatusCard } from "@/components/order/order-status-card"
import { OrderLogisticsCard } from "@/components/order/order-logistics-card"
import { OrderCustomerCard } from "@/components/order/order-customer-card"
import { OrderFinancialSummary } from "@/components/order/order-financial-summary"
import { OrderItemsTable } from "@/components/order/order-items-table"
import { OrderBillingSummary } from "@/components/order/order-billing-summary"
import { InvoiceTemplate } from "@/components/order/invoice-template"

const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
        case "ASSIGNED":
            return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:border-indigo-800"
        case "PROCESSING":
            return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800"
        case "OUT FOR DELIVERY":
            return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-800"
        case "SHIPPED":
            return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-800"
        case "DELIVERED":
            return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100"
        case "CANCELLED":
            return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100"
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
            return <IconCheck className="h-4 w-4" />
        case "DELIVERED":
            return <IconCheck className="h-4 w-4" />
        case "CANCELLED":
            return <IconX className="h-4 w-4" />
        default:
            return null
    }
}

export default function OrderDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params?.id

    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [userName, setUserName] = useState("")
    
    const [slots, setSlots] = useState([])
    const [riders, setRiders] = useState([])
    const [ridersMap, setRidersMap] = useState({})
    const [selectedSlot, setSelectedSlot] = useState("")
    const [selectedRider, setSelectedRider] = useState("")
    const [isAssigning, setIsAssigning] = useState(false)

    const contentRef = useRef(null)
    const handleDownloadInvoice = useReactToPrint({ contentRef })

    useEffect(() => {
        // Fetch global riders map for reference
        const ridersRef = collection(db, "riders")
        const unsubscribeRiders = onSnapshot(ridersRef, (snapshot) => {
            const map = {}
            snapshot.docs.forEach(doc => {
                map[doc.id] = doc.data().name
                if (doc.data().riderId) {
                    map[doc.data().riderId] = doc.data().name
                }
            })
            setRidersMap(map)
        })
        return () => unsubscribeRiders()
    }, [])

    useEffect(() => {
        if (!orderId) return

        const orderRef = doc(db, "orders", orderId)
        const unsubscribeOrder = onSnapshot(orderRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() }
                setOrder(data)
                
                // Fetch User Name
                if (data.userId) {
                    const userDoc = await getDoc(doc(db, "users", data.userId))
                    if (userDoc.exists()) {
                        setUserName(userDoc.data().name || userDoc.data().displayName || "Guest User")
                    } else {
                        setUserName("Guest User")
                    }
                }
            } else {
                toast.error("Order not found")
                router.push("/dashboard/order-management")
            }
            setLoading(false)
        })

        return () => unsubscribeOrder()
    }, [orderId, router])

    useEffect(() => {
        if (order) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.slotId, order?.riderId])

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



    if (loading) {
        return (
            <SidebarProvider
                style={{
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)"
                }}>
                <AppSidebar variant="inset" />
                <SidebarInset className="bg-background">
                    <SiteHeader />
                    <div className="flex flex-1 items-center justify-center p-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        )
    }

    if (!order) return null

    const isLogisticsChanged = order.slotId !== selectedSlot || order.riderId !== selectedRider;

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            }}>
            <AppSidebar variant="inset" />
            <SidebarInset className="bg-background">
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full">
                    
                    {/* Header Actions */}
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
                            <IconArrowLeft className="h-4 w-4" />
                            Back to Orders
                        </Button>
                        <Button onClick={handleDownloadInvoice} className="flex items-center gap-2 rounded-xl shadow-md">
                            <IconDownload className="h-4 w-4" />
                            Download Invoice
                        </Button>
                    </div>

                    <div id="invoice-content" className="bg-card border rounded-2xl shadow-sm overflow-hidden p-8 flex flex-col gap-8">
                        {/* Invoice Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b pb-6">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-sm">
                                    <IconPackage className="h-8 w-8" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-foreground">Order Details</h1>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="font-mono text-base text-muted-foreground">{order.orderNumber}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 ml-2" 
                                            onClick={() => copyToClipboard(order.orderNumber)}
                                        >
                                            {copied ? <IconTick className="h-4 w-4 text-secondary" /> : <IconCopy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant="outline" className={`${getStatusColor(order.status)} px-4 py-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg`}>
                                    {getStatusIcon(order.status)}
                                    {order.status?.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-muted-foreground mt-1">
                                    {new Date(order.orderDate).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Status & Logistics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 html2pdf-ignore">
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
                        </div>

                        {/* Customer & Financial */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <OrderCustomerCard 
                                userName={userName}
                                userId={order.userId}
                                deliveryAddress={order.deliveryAddress}
                                orderDate={order.orderDate}
                            />

                            <OrderFinancialSummary 
                                itemsCount={order.items?.reduce((acc, item) => acc + item.quantity, 0)}
                                paymentMethod={order.orderType || order.paymentMethod}
                            />
                        </div>

                        <Separator className="my-2" />

                        {/* Items */}
                        <div className="w-full">
                            <h3 className="text-xl font-semibold mb-4 text-foreground">Order Items</h3>
                            <OrderItemsTable items={order.items} />
                        </div>

                        {/* Billing Summary */}
                        <div className="flex justify-end mt-4">
                            <OrderBillingSummary 
                                subtotal={order.subtotal}
                                deliveryFee={order.deliveryFee}
                                discount={order.discount}
                                couponDiscount={order.couponDiscount}
                                totalAmount={order.totalAmount}
                                hideDownloadButton={true}
                            />
                        </div>
                    </div>
                    
                    {/* Hidden Printable Invoice Template */}
                    <div style={{ display: "none" }}>
                        <InvoiceTemplate ref={contentRef} order={order} userName={userName} />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

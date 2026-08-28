import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function OrderStatusCard({ status, updating, onUpdateStatus }) {
    return (
        <Card>
            <CardContent className="flex flex-col items-start justify-between gap-5 p-5 sm:flex-row sm:items-center">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">Order status</h4>
                    <p className="text-xs text-muted-foreground">Change the current fulfillment state of this order.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select 
                        disabled={updating} 
                        value={status?.toUpperCase()} 
                        onValueChange={onUpdateStatus}
                    >
                        <SelectTrigger aria-label="Order status" className="h-10 w-full font-medium text-foreground sm:w-[190px]">
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
    )
}

import { IconUser, IconMapPin, IconCalendar, IconPhone } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function OrderCustomerCard({ userName, userPhone, deliveryAddress, orderDate }) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <IconUser className="h-4 w-4 text-primary" /> Customer
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Contact</p>
                    <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {userName?.substring(0, 1).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-bold text-foreground">{userName || 'Guest User'}</span>
                        </div>
                        <a href={`tel:${userPhone || ""}`} className="flex w-fit items-center gap-2 rounded-lg text-sm font-semibold text-primary hover:underline">
                            <IconPhone className="h-4 w-4" /> {userPhone || "No phone number"}
                        </a>
                    </div>
                </div>
                <div className="flex items-start gap-3 border-t pt-4">
                    <div className="shrink-0 rounded-lg border bg-background p-2">
                        <IconMapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Delivery address</p>
                        <p className="text-sm font-medium leading-relaxed">{deliveryAddress || "No delivery address"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 border-t pt-4">
                    <div className="shrink-0 rounded-lg border bg-background p-2">
                        <IconCalendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Ordered at</p>
                        <p className="text-sm font-medium">{new Date(orderDate).toLocaleString()}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

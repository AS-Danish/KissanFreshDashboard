import { IconUser, IconMapPin, IconCalendar, IconPhone } from "@tabler/icons-react"

export function OrderCustomerCard({ userName, userPhone, deliveryAddress, orderDate }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
                <IconUser className="h-4 w-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Customer Info</h3>
            </div>
            <div className="space-y-4 bg-muted p-5 rounded-xl border">
                <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Customer Identity</p>
                    <div className="flex flex-col gap-2 p-3 rounded-xl border bg-background">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold">
                                {userName?.substring(0, 1).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-bold text-foreground">{userName || 'Guest User'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary bg-primary/5 p-2 rounded-lg border border-primary/10 w-fit">
                            <IconPhone className="h-5 w-5" />
                            <span className="text-base font-black tracking-tight">{userPhone}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-start gap-3 border-t pt-4">
                    <div className="bg-white dark:bg-muted p-2 rounded-lg border shadow-sm shrink-0">
                        <IconMapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Destination</p>
                        <p className="text-sm font-bold leading-tight">{deliveryAddress}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 border-t pt-4">
                    <div className="bg-white dark:bg-muted p-2 rounded-lg border shadow-sm shrink-0">
                        <IconCalendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Timestamp</p>
                        <p className="text-sm font-bold">{new Date(orderDate).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

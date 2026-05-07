import { Separator } from "@/components/ui/separator"
import { IconRouter, IconCheck as IconTick } from "@tabler/icons-react"

export function OrderFinancialSummary({ itemsCount, paymentMethod }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
                <IconRouter className="h-4 w-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Financial Summary</h3>
            </div>
            <div className="bg-muted p-5 rounded-xl border space-y-4 h-full">
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Items Quantity</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-black text-primary">
                            {itemsCount}
                        </p>
                        <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">SKU Units</span>
                    </div>
                </div>
                <Separator className="bg-border" />
                <div className="flex flex-col gap-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payment Type</p>
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 p-2.5 rounded-xl border border-green-200 dark:border-green-800 w-fit">
                        <IconTick className="h-4 w-4" />
                        <p className="text-xs font-black uppercase tracking-tight">{paymentMethod?.toUpperCase() === 'COD' || paymentMethod?.toUpperCase() === 'CASH' ? 'COD' : 'Online'}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

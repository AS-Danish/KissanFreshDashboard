import { Separator } from "@/components/ui/separator"
import { IconReceiptRupee, IconCheck as IconTick } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function OrderFinancialSummary({ itemsCount, paymentMethod }) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <IconReceiptRupee className="h-4 w-4 text-primary" /> Payment overview
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">Total quantity</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-bold text-primary">
                            {Number(itemsCount) || 0}
                        </p>
                        <span className="text-xs text-muted-foreground">units</span>
                    </div>
                </div>
                <Separator className="bg-border" />
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Payment method</p>
                    <div className="flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <IconTick className="h-4 w-4" />
                        <p className="text-xs font-semibold">{paymentMethod?.toUpperCase() === 'COD' || paymentMethod?.toUpperCase() === 'CASH' ? 'Cash on delivery' : 'Paid online'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

import { Separator } from "@/components/ui/separator"
import { IconReceiptRupee, IconCheck as IconTick, IconWallet } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function OrderFinancialSummary({ itemsCount, paymentMethod, walletAppliedPaise, totalAmount }) {
    const walletDeduction = (Number(walletAppliedPaise) || 0) / 100;
    const total = Number(totalAmount || 0);
    const isFullWallet = walletDeduction > 0 && walletDeduction >= total;
    const isPartialWallet = walletDeduction > 0 && walletDeduction < total;
    const isCod = (paymentMethod || "").toUpperCase() === "COD" || (paymentMethod || "").toUpperCase() === "CASH";

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
                    <div className="flex flex-wrap items-center gap-2">
                        {walletDeduction > 0 && (
                            <div className="flex w-fit items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                                <IconWallet className="h-4 w-4" />
                                <p className="text-xs font-semibold">Wallet: ₹{walletDeduction.toFixed(2)}</p>
                            </div>
                        )}
                        {!isFullWallet && (
                            <div className="flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <IconTick className="h-4 w-4" />
                                <p className="text-xs font-semibold">
                                    {isCod ? `Cash on delivery${isPartialWallet ? ` (₹${(total - walletDeduction).toFixed(2)})` : ''}` : `Paid online${isPartialWallet ? ` (₹${(total - walletDeduction).toFixed(2)})` : ''}`}
                                </p>
                            </div>
                        )}
                        {isFullWallet && (
                            <div className="flex w-fit items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                                <IconTick className="h-4 w-4" />
                                <p className="text-xs font-semibold">100% Paid via Wallet</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

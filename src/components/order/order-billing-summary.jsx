import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { IconDownload } from "@tabler/icons-react"

export function OrderBillingSummary({
    subtotal,
    deliveryFee,
    discount,
    couponDiscount,
    totalAmount,
    walletAppliedPaise,
    adjustedAmountPaise,
    paymentMethod,
    hideDownloadButton,
    onDownloadInvoice
}) {
    const amount = (value) => Number(value || 0);
    const money = (value) => amount(value).toFixed(2);
    const totalDiscount = amount(discount) + amount(couponDiscount);
    const walletDeduction = (Number(walletAppliedPaise) || 0) / 100;
    const refundedToWallet = (Number(adjustedAmountPaise) || 0) / 100;
    const netPaid = Math.max(0, amount(totalAmount) - walletDeduction);
    const isCod = (paymentMethod || "").toUpperCase() === "COD" || (paymentMethod || "").toUpperCase() === "CASH";
    
    return (
        <div className="bg-muted p-6 rounded-2xl border flex flex-col items-end gap-5 ml-auto w-full sm:w-[360px]">
            <div className="w-full space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Subtotal</span>
                    <span className="font-semibold">₹{money(subtotal)}</span>
                </div>
                {amount(deliveryFee) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Delivery Fee</span>
                        <span className="font-semibold">₹{money(deliveryFee)}</span>
                    </div>
                )}
                {totalDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm text-secondary">
                        <span className="font-medium">Discount</span>
                        <span className="font-semibold">-₹{money(totalDiscount)}</span>
                    </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-foreground">Total Bill</span>
                    <span className="text-xl font-bold text-foreground">₹{money(totalAmount)}</span>
                </div>
                {walletDeduction > 0 && (
                    <div className="flex justify-between items-center text-sm rounded-lg bg-indigo-50/80 px-2.5 py-1.5 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <span className="font-semibold">Wallet Applied</span>
                        <span className="font-bold">-₹{money(walletDeduction)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold text-foreground">
                        {walletDeduction >= amount(totalAmount) ? "Paid via Wallet" : isCod ? "Cash to Collect (COD)" : "Paid Online"}
                    </span>
                    <span className="text-2xl font-black text-primary">
                        ₹{money(walletDeduction >= amount(totalAmount) ? 0 : netPaid)}
                    </span>
                </div>

                {refundedToWallet > 0 && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <div className="flex justify-between font-bold">
                            <span>Returned to Wallet</span>
                            <span>+₹{money(refundedToWallet)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] opacity-80">Credited back to customer wallet for unavailable / returned items.</p>
                    </div>
                )}
            </div>
            {!hideDownloadButton && (
                <div className="w-full flex justify-end gap-2 html2pdf-ignore">
                    <Button size="sm" className="font-semibold h-9 rounded-lg w-full" onClick={onDownloadInvoice}>
                        <IconDownload className="h-4 w-4 mr-2" />
                        Download Invoice
                    </Button>
                </div>
            )}
        </div>
    )
}

import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { IconDownload } from "@tabler/icons-react"

export function OrderBillingSummary({ subtotal, deliveryFee, discount, couponDiscount, totalAmount, hideDownloadButton, onDownloadInvoice }) {
    const amount = (value) => Number(value || 0);
    const money = (value) => amount(value).toFixed(2);
    const totalDiscount = amount(discount) + amount(couponDiscount);
    
    return (
        <div className="bg-muted p-6 rounded-2xl border flex flex-col items-end gap-5 ml-auto w-full sm:w-[350px]">
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
                    <span className="text-base font-bold text-foreground">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">₹{money(totalAmount)}</span>
                </div>
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

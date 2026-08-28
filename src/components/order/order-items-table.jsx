import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function OrderItemsTable({ items }) {
    const money = (value) => Number(value || 0).toFixed(2);
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-lg font-bold text-foreground">Order Items</h3>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Listing of all products in this order</p>
                </div>
                <Badge variant="secondary" className="px-3 py-1 text-[10px] font-bold bg-blue-100 text-blue-800 border-none">
                    {items?.length || 0} ITEMS
                </Badge>
            </div>
            <div className="rounded-xl border overflow-hidden bg-card">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="font-semibold text-foreground px-4 py-3">Product</TableHead>
                            <TableHead className="text-center font-semibold text-foreground">Size</TableHead>
                            <TableHead className="text-center font-semibold text-foreground">Qty</TableHead>
                            <TableHead className="text-right font-semibold text-foreground">Price</TableHead>
                            <TableHead className="text-right font-semibold text-foreground px-4">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items?.length ? items.map((item, index) => (
                            <TableRow key={index} className="hover:bg-muted transition-colors">
                                <TableCell className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                                            {item.image ? <Image
                                                src={item.image}
                                                alt={item.title || "Order item"}
                                                fill
                                                sizes="48px"
                                                className="object-cover"
                                            /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">—</span>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm text-foreground line-clamp-1">{item.title}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-muted-foreground font-mono">#{item.productId?.substring(0, 8).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-medium text-xs text-muted-foreground">
                                        {item.unit || '-'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-medium text-xs">
                                        {item.quantity}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground font-medium">₹{money(item.price)}</TableCell>
                                <TableCell className="text-right font-bold text-sm text-foreground">₹{money(Number(item.price) * Number(item.quantity))}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No items recorded for this order.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

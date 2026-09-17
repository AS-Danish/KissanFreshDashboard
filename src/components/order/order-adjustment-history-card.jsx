"use client"

import { useState, useEffect } from "react"
import { httpsCallable } from "firebase/functions"
import { collection, query, where, getDocs } from "firebase/firestore"
import { functions, db } from "@/firebase/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconCheck, IconRotateClockwise, IconBuildingBank, IconWallet, IconAlertTriangle } from "@tabler/icons-react"
import { toast } from "sonner"
import Link from "next/link"

const money = (paise) => `₹${(Number(paise || 0) / 100).toFixed(2)}`

export function OrderAdjustmentHistoryCard({ order }) {
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const isCod = (order?.orderType || "").toUpperCase() === "COD" || (order?.orderType || "").toUpperCase() === "CASH" || !order?.paymentId

  const loadAdjustments = async () => {
    if (!order?.id) return
    try {
      setLoading(true)
      const q = query(
        collection(db, "debug_order_adjustments"),
        where("orderId", "==", order.id)
      )
      const snap = await getDocs(q)
      const list = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        }
      })
      list.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })
      setAdjustments(list)
    } catch (err) {
      console.error("Could not load adjustments:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdjustments()
  }, [order?.id, order?.debugLastAdjustmentAt])

  const handleRefundToBank = async (adj) => {
    if (isCod) {
      return toast.error("COD orders cannot be refunded to bank because no online payment was made.")
    }
    if (!order?.userId) {
      return toast.error("Customer ID not found on this order.")
    }

    const confirmMsg = `Process instant Razorpay refund of ${money(adj.amountPaise)} to customer's original bank account? This will debit their wallet balance.`
    if (!window.confirm(confirmMsg)) return

    setProcessingId(adj.id)
    try {
      const call = httpsCallable(functions, "refundWalletToBank")
      const idempotencyKey = `bkref_${crypto.randomUUID().replaceAll("-", "")}`
      const result = await call({
        orderId: order.id,
        userId: order.userId,
        adjustmentId: adj.id,
        amountPaise: adj.amountPaise,
        idempotencyKey,
      })

      toast.success(`Success! ${money(adj.amountPaise)} refunded to customer's bank (Razorpay Refund ID: ${result.data?.providerRefundId}). Wallet debited.`)
      await loadAdjustments()
    } catch (error) {
      toast.error(error?.message || "Bank refund failed via Razorpay.")
    } finally {
      setProcessingId(null)
    }
  }

  if (!loading && adjustments.length === 0 && !order.debugAdjustedAmountPaise) {
    return null
  }

  const isBankRefundDoneForOrder = adjustments.some(
    (a) => (a.destination === "SOURCE_REFUND" || a.providerRefundId) &&
           (a.status === "SUCCEEDED" || a.status === "PENDING_PROVIDER" || a.providerStatus === "processed")
  )

  return (
    <Card className="html2pdf-ignore border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-emerald-900 dark:text-emerald-300">
              <IconRotateClockwise className="h-5 w-5 text-emerald-600" />
              Adjustments & Refund History
            </CardTitle>
            <CardDescription className="text-emerald-800/80 dark:text-emerald-400/80">
              Amounts returned to the customer's wallet or original payment source for this order.
            </CardDescription>
          </div>
          {order?.userId && (
            <Button variant="outline" size="sm" asChild className="h-8 text-xs border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800">
              <Link href={`/dashboard/wallet-management?userId=${order.userId}`}>
                <IconWallet className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                View Customer Wallet
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">Loading adjustments...</div>
        ) : adjustments.length === 0 ? (
          <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
            Adjusted amount: {money(order.debugAdjustedAmountPaise)}. Details will show after refreshing.
          </div>
        ) : (
          adjustments.map((adj) => {
            const isWallet = adj.destination === "WALLET"
            const isBank = adj.destination === "SOURCE_REFUND"

            return (
              <div
                key={adj.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-background p-3.5 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-foreground">{money(adj.amountPaise)}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isWallet
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      }`}
                    >
                      {isWallet ? (
                        <span className="flex items-center gap-1">
                          <IconWallet className="h-3 w-3" /> Credited to Wallet
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <IconBuildingBank className="h-3 w-3" /> Refunded to Bank
                        </span>
                      )}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {adj.status || "SUCCEEDED"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Reason:</span> {adj.reason || "Out of stock / damage"}
                  </p>
                  {adj.createdAt && (
                    <p className="text-[11px] text-muted-foreground">
                      Processed on {new Date(adj.createdAt).toLocaleString()}
                      {adj.providerRefundId && ` · Razorpay Refund ID: ${adj.providerRefundId}`}
                    </p>
                  )}
                  {Array.isArray(adj.lines) && adj.lines.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Items: {adj.lines.map((l) => `${l.title} (${l.quantity} qty)`).join(", ")}
                    </p>
                  )}
                </div>

                {/* Bank Refund Action */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isBank ? (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                      <IconCheck className="h-4 w-4 text-emerald-600" /> Bank Transfer Done
                    </span>
                  ) : isBankRefundDoneForOrder ? (
                    <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border flex items-center gap-1.5">
                      <IconCheck className="h-4 w-4 text-muted-foreground" /> Bank Transfer Done
                    </span>
                  ) : isWallet && !isCod ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingId === adj.id}
                      onClick={() => handleRefundToBank(adj)}
                      className="h-8 border-indigo-300 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"
                    >
                      {processingId === adj.id ? (
                        <span className="text-xs">Processing...</span>
                      ) : (
                        <>
                          <IconBuildingBank className="mr-1.5 h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">1-Click Refund to Bank</span>
                        </>
                      )}
                    </Button>
                  ) : isWallet && isCod ? (
                    <span className="text-[11px] italic text-muted-foreground flex items-center gap-1">
                      <IconAlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      COD order: Bank refund not applicable
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

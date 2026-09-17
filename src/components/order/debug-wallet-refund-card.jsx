"use client"

import { useMemo, useState } from "react"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/firebase/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  IconWallet,
  IconPlus,
  IconMinus,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconPackage,
  IconSparkles,
} from "@tabler/icons-react"
import { toast } from "sonner"

const money = (paise) => `₹${(Number(paise || 0) / 100).toFixed(2)}`

const PRESET_REASONS = [
  "Item Out of Stock",
  "Damaged / Quality Issue",
  "Customer Requested Cancellation",
  "Weight Difference / Partial Pack",
]

export function DebugWalletRefundCard({ order }) {
  const [quantities, setQuantities] = useState({})
  const [reason, setReason] = useState("")
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const orderStatus = (order?.status || "").toUpperCase()
  const isDelivered = orderStatus === "DELIVERED"
  const isCancelled = orderStatus === "CANCELLED"

  // Filter selected lines
  const lines = useMemo(
    () =>
      Object.entries(quantities)
        .map(([lineIndex, quantity]) => ({
          lineIndex: Number(lineIndex),
          quantity: Number(quantity),
        }))
        .filter((line) => line.quantity > 0),
    [quantities]
  )

  const remaining = (index, item) =>
    Math.max(
      0,
      Number(item.quantity || 0) -
        Number(order.debugAdjustedQuantities?.[String(index)] || 0)
    )

  const updateQuantity = (index, value, max) => {
    const quantity = Math.min(max, Math.max(0, Number.parseInt(value, 10) || 0))
    setQuantities((current) => ({ ...current, [index]: quantity }))
    setPreview(null)
  }

  const handleStep = (index, delta, max) => {
    const current = Number(quantities[index] || 0)
    const next = Math.min(max, Math.max(0, current + delta))
    setQuantities((prev) => ({ ...prev, [index]: next }))
    setPreview(null)
  }

  const handlePreview = async () => {
    if (!lines.length) return toast.error("Select at least one unavailable or damaged item.")
    setBusy(true)
    try {
      const call = httpsCallable(functions, "previewDebugOrderAdjustment")
      const result = await call({ orderId: order.id, lines })
      setPreview(result.data)
    } catch (error) {
      toast.error(error?.message || "Could not calculate the adjustment.")
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async () => {
    if (!preview || reason.trim().length < 3) {
      return toast.error("Please calculate preview and enter a clear reason first.")
    }
    setBusy(true)
    try {
      const call = httpsCallable(functions, "createDebugOrderAdjustment")
      const idempotencyKey = `adj_${crypto.randomUUID().replaceAll("-", "")}`
      const result = await call({
        orderId: order.id,
        lines,
        destination: "WALLET",
        reason: reason.trim(),
        idempotencyKey,
      })
      toast.success(
        `Success! ${money(result.data.amountPaise)} credited to customer's wallet and notification sent.`
      )
      setQuantities({})
      setReason("")
      setPreview(null)
    } catch (error) {
      toast.error(error?.message || "Adjustment failed.")
    } finally {
      setBusy(false)
    }
  }

  // Pre-delivery policy check: If order is delivered, adjustments are strictly closed
  if (isDelivered) {
    return (
      <Card className="html2pdf-ignore rounded-2xl border border-muted bg-muted/30">
        <CardHeader className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center shrink-0">
              <IconPackage className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Item Adjustments Closed
              </CardTitle>
              <CardDescription className="text-xs">
                This order is marked as <strong className="text-emerald-700 font-semibold">DELIVERED</strong>. Item adjustments and wallet credits can only be processed before final delivery.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (isCancelled) {
    return (
      <Card className="html2pdf-ignore rounded-2xl border border-destructive/20 bg-destructive/5">
        <CardHeader className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <IconX className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-destructive">
                Order Cancelled
              </CardTitle>
              <CardDescription className="text-xs">
                This order is cancelled. Item adjustments cannot be processed.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const hasRemainingItems = order.items?.some((item, idx) => remaining(idx, item) > 0)

  if (!hasRemainingItems) {
    return null
  }

  return (
    <Card className="html2pdf-ignore rounded-2xl border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-background dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-card shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <IconWallet className="h-5 w-5 text-indigo-600" />
              Item Adjustments & Customer Wallet Credit
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Select unavailable, damaged, or returned items before delivery. The refund will be credited directly to the customer's Kissan Fresh wallet.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 w-fit">
            Destination: Wallet Only
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* Item list */}
        <div className="space-y-2.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Select Quantities to Refund
          </Label>
          <div className="grid gap-2">
            {order.items?.map((item, index) => {
              const max = remaining(index, item)
              const selected = Number(quantities[index] || 0)
              const isExhausted = max === 0

              return (
                <div
                  key={`${item.productId}-${item.variationId}-${index}`}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                    selected > 0
                      ? "border-indigo-300 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-950/20"
                      : isExhausted
                      ? "opacity-50 bg-muted/30"
                      : "bg-card hover:bg-muted/20"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ordered: <span className="font-medium text-foreground">{item.quantity}</span> · Price: <span className="font-medium text-foreground">₹{Number(item.price || 0).toFixed(2)}</span>
                      {max < Number(item.quantity || 0) && (
                        <span className="text-amber-600 dark:text-amber-400 ml-1.5 font-medium">
                          ({Number(item.quantity) - max} previously adjusted)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs text-muted-foreground font-medium mr-1">
                      Max: {max}
                    </span>
                    <div className="flex items-center rounded-lg border bg-background shadow-xs overflow-hidden">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none text-muted-foreground hover:bg-muted"
                        disabled={busy || selected <= 0}
                        onClick={() => handleStep(index, -1, max)}
                      >
                        <IconMinus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        max={max}
                        disabled={busy || isExhausted}
                        value={quantities[index] || ""}
                        onChange={(e) => updateQuantity(index, e.target.value, max)}
                        className="h-8 w-12 border-0 rounded-none text-center font-bold text-xs p-0 focus-visible:ring-0"
                        placeholder="0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none text-muted-foreground hover:bg-muted"
                        disabled={busy || selected >= max}
                        onClick={() => handleStep(index, 1, max)}
                      >
                        <IconPlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Reason Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="adjustment-reason" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reason for Adjustment
            </Label>
            <span className="text-[10px] text-muted-foreground">Sent to customer in push notification</span>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={busy}
                onClick={() => setReason(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  reason === preset
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-background hover:bg-muted text-muted-foreground border-border"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <Input
            id="adjustment-reason"
            value={reason}
            maxLength={300}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Or type custom reason (e.g., Damaged during transit, Customer requested cancellation...)"
            className="text-xs h-9"
          />
        </div>

        {/* Amount & CTA summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Amount to Credit Customer Wallet
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-primary">
                {preview ? money(preview.amountPaise) : "—"}
              </span>
              {lines.length > 0 && !preview && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                  Click Preview to calculate discount-adjusted total
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Direct wallet credit · Customer notified immediately via push notification
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={busy || !lines.length}
              className="h-9 text-xs font-semibold"
            >
              {busy ? "Calculating..." : "Preview Amount"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={busy || !preview || reason.trim().length < 3}
              className="h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              {busy ? (
                "Processing..."
              ) : (
                <>
                  <IconSparkles className="h-3.5 w-3.5" />
                  Credit {preview ? money(preview.amountPaise) : ""} to Wallet
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useEffect, useState } from "react"
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/firebase/config"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const statuses = {
  pending: "Pending",
  processing: "Processing",
  processed: "Refunded",
  refunded: "Refunded",
  failed: "Needs review",
}
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
const date = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
})

export default function FailedOrdersPage() {
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [result, setResult] = useState(null)

  useEffect(() => {
    const records = query(collection(db, "failed_orders"), orderBy("timestamp", "desc"), limit(100))
    return onSnapshot(records, (snapshot) => {
      setResult({ rows: snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })) })
    }, (error) => {
      setResult({ error: error.code })
    })
  }, [])

  const term = search.trim().toLowerCase()
  const rows = result?.rows?.filter((row) =>
    (status === "all" || row.refundStatus === status || (status === "processed" && row.refundStatus === "refunded")) &&
    [row.id, row.orderId, row.orderData?.id, row.orderData?.orderNumber, row.paymentId, row.refundId].some((value) =>
      typeof value === "string" && value.toLowerCase().includes(term),
    ),
  ) ?? []

  return (
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Failed Orders &amp; Refunds</h1>
        <p className="text-sm text-muted-foreground">Track failed checkouts and refunds that need staff review.</p>
      </div>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input aria-label="Search recent records" placeholder="Search order, payment or refund ID"
              className="w-full sm:max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Refund status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="processed">Refunded</SelectItem>
                <SelectItem value="failed">Needs review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!result ? <p role="status">Loading refund records...</p> :
            result.error ? <p role="alert" className="text-destructive">
              {result.error === "permission-denied"
                ? "Refund records require Order Management access and the updated Firestore rules."
                : "Unable to load refund records. Please try again."}
            </p> : rows.length === 0 ? <p role="status">No matching records.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Recorded</TableHead><TableHead>Order</TableHead>
                  <TableHead>Payment ID</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Refund status</TableHead><TableHead>Failure details</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.timestamp?.toDate ? date.format(row.timestamp.toDate()) : "Unavailable"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.orderId ?? row.orderData?.id ?? row.orderData?.orderNumber ?? row.id}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.paymentId ?? "Unavailable"}</TableCell>
                      <TableCell>{Number.isFinite(row.totalAmount) ? money.format(row.totalAmount) : "Unavailable"}</TableCell>
                      <TableCell>
                        <Badge variant={row.refundStatus === "failed" ? "destructive" : "secondary"}>
                          {statuses[row.refundStatus] ?? "Unknown"}
                        </Badge>
                        {row.refundId && <div className="mt-1 font-mono text-xs">{row.refundId}</div>}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal break-words">
                        {row.error || "No failure reason recorded"}
                        {row.refundError && <div className="mt-1 text-destructive">{row.refundError}</div>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          <p className="text-xs text-muted-foreground">Search and filters cover the latest 100 records.</p>
        </CardContent>
      </Card>
    </section>
  )
}

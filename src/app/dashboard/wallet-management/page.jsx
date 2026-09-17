"use client"

import { useState, useEffect, useMemo } from "react"
import { httpsCallable } from "firebase/functions"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { functions, db } from "@/firebase/config"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IconWallet,
  IconBuildingBank,
  IconSearch,
  IconUser,
  IconRotateClockwise,
  IconCheck,
  IconAlertCircle,
  IconArrowBackUp,
  IconRefresh,
  IconPhone,
  IconCoin,
  IconExternalLink,
  IconCopy,
  IconArrowDownLeft,
  IconReceipt,
  IconClock,
} from "@tabler/icons-react"
import { toast } from "sonner"
import Link from "next/link"

const money = (paise) => `₹${(Number(paise || 0) / 100).toFixed(2)}`

const copyToClipboard = (text, label = "Text") => {
  if (!text) return
  if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }
}

function enrichWalletEntries(rawEntries) {
  // Sort ascending by creation time to reconstruct chronological credit lifecycle
  const chronological = [...rawEntries].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return timeA - timeB
  })

  const creditBuckets = []
  for (const entry of chronological) {
    if (entry.type === "REFUND_CREDIT" && (entry.amountPaise || 0) > 0) {
      creditBuckets.push({
        entryId: entry.id,
        orderId: entry.orderId,
        originalPaise: entry.amountPaise,
        remainingPaise: entry.amountPaise,
        bankRefundedPaise: 0,
        providerRefundId: null,
        consumedBy: [],
      })
    } else if (entry.type === "BANK_REFUND_DEBIT" && (entry.amountPaise || 0) < 0) {
      const debitAmount = Math.abs(entry.amountPaise)
      // Bank refund specifically matches the order that created the credit
      const match = creditBuckets.find((b) => b.orderId === entry.orderId && b.remainingPaise > 0)
      if (match) {
        const take = Math.min(match.remainingPaise, debitAmount)
        match.remainingPaise -= take
        match.bankRefundedPaise += take
        match.providerRefundId = entry.providerRefundId
      }
    } else if (entry.type === "ORDER_DEBIT" || (entry.amountPaise || 0) < 0) {
      let debitAmount = Math.abs(entry.amountPaise)
      // FIFO: General order debits consume oldest available unconsumed credits
      for (const bucket of creditBuckets) {
        if (debitAmount <= 0) break
        if (bucket.remainingPaise > 0) {
          const take = Math.min(bucket.remainingPaise, debitAmount)
          bucket.remainingPaise -= take
          debitAmount -= take
          bucket.consumedBy.push({
            orderId: entry.orderId,
            amountPaise: take,
          })
        }
      }
    }
  }

  const bucketMap = new Map(creditBuckets.map((b) => [b.entryId, b]))

  return rawEntries.map((entry) => {
    if (entry.type === "REFUND_CREDIT") {
      const bucket = bucketMap.get(entry.id)
      if (bucket) {
        return {
          ...entry,
          remainingRefundablePaise: bucket.remainingPaise,
          bankRefundedPaise: bucket.bankRefundedPaise,
          refundProviderId: bucket.providerRefundId,
          consumedBy: bucket.consumedBy,
          isFullyConsumed: bucket.remainingPaise <= 0,
          isPartiallyConsumed: bucket.remainingPaise > 0 && bucket.remainingPaise < bucket.originalPaise,
        }
      }
    }
    return entry
  })
}

export default function WalletManagementPage() {
  const searchParams = useSearchParams()
  const initialUserId = searchParams.get("userId")

  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterNonZero, setFilterNonZero] = useState(false)

  // Drawer / Details state
  const [selectedUserId, setSelectedUserId] = useState(initialUserId || null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [walletDetails, setWalletDetails] = useState(null)
  const [processingRefundId, setProcessingRefundId] = useState(null)

  const fetchWallets = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, "debug_wallet_accounts"))
      const list = []
      for (const d of snap.docs) {
        const data = d.data() || {}
        let userName = "Customer"
        let userPhone = "No phone"
        let userEmail = ""
        try {
          const userSnap = await getDoc(doc(db, "users", d.id))
          if (userSnap.exists()) {
            const u = userSnap.data() || {}
            userName = u.name || u.displayName || "Customer"
            userPhone = u.phoneNumber || u.phone || "No phone"
            userEmail = u.email || ""
          }
        } catch (_) {}
        list.push({
          userId: d.id,
          balancePaise: Number(data.balancePaise) || 0,
          lifetimeCreditPaise: Number(data.lifetimeCreditPaise) || 0,
          lifetimeDebitPaise: Number(data.lifetimeDebitPaise) || 0,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
          userName,
          userPhone,
          userEmail,
        })
      }
      list.sort((a, b) => b.balancePaise - a.balancePaise)
      setWallets(list)
    } catch (err) {
      console.error("Failed to load wallets:", err)
      toast.error(err?.message || "Could not load wallet accounts.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWallets()
  }, [])

  useEffect(() => {
    if (initialUserId) {
      handleOpenDetails(initialUserId)
    }
  }, [initialUserId])

  const handleOpenDetails = async (userId) => {
    setSelectedUserId(userId)
    setDetailsLoading(true)
    try {
      const walletSnap = await getDoc(doc(db, "debug_wallet_accounts", userId))
      const walletData = walletSnap.exists() ? walletSnap.data() : {}

      const userSnap = await getDoc(doc(db, "users", userId))
      const userData = userSnap.exists() ? userSnap.data() : {}

      const entriesQ = query(
        collection(db, "debug_wallet_entries"),
        where("userId", "==", userId)
      )
      const entriesSnap = await getDocs(entriesQ)
      const entries = entriesSnap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
        }
      })
      entries.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })

      const enrichedEntries = enrichWalletEntries(entries)

      const selectedExisting = wallets.find((w) => w.userId === userId)
      const bal = Number(walletData.balancePaise) ?? selectedExisting?.balancePaise ?? 0
      const cred = Number(walletData.lifetimeCreditPaise) ?? selectedExisting?.lifetimeCreditPaise ?? 0
      const deb = Number(walletData.lifetimeDebitPaise) ?? selectedExisting?.lifetimeDebitPaise ?? 0
      const uName = userData.name || userData.displayName || selectedExisting?.userName || "Customer"
      const uPhone = userData.phoneNumber || userData.phone || selectedExisting?.userPhone || "No phone"
      const uEmail = userData.email || selectedExisting?.userEmail || ""

      setWalletDetails({
        userId,
        balancePaise: bal,
        lifetimeCreditPaise: cred,
        lifetimeDebitPaise: deb,
        userName: uName,
        userPhone: uPhone,
        userEmail: uEmail,
        wallet: {
          userId,
          balancePaise: bal,
          lifetimeCreditPaise: cred,
          lifetimeDebitPaise: deb,
          updatedAt: walletData.updatedAt?.toDate ? walletData.updatedAt.toDate().toISOString() : null,
        },
        user: {
          id: userId,
          name: uName,
          phoneNumber: uPhone,
          email: uEmail,
        },
        entries: enrichedEntries,
      })
    } catch (err) {
      console.error("Could not load customer wallet details:", err)
      toast.error(err?.message || "Could not load customer wallet details.")
    } finally {
      setDetailsLoading(false)
    }
  }

  const handle1ClickBankRefund = async (entry) => {
    if (!entry.orderId) {
      return toast.error("This credit is not linked to an order ID.")
    }

    const currentBalance = Number(walletDetails?.balancePaise ?? walletDetails?.wallet?.balancePaise ?? 0)
    if (currentBalance <= 0) {
      return toast.error("Customer has ₹0.00 available in wallet.")
    }

    const maxOrderRefundable =
      entry.remainingRefundablePaise !== undefined
        ? entry.remainingRefundablePaise
        : Math.abs(Number(entry.amountPaise) || 0)
    const amount = Math.min(maxOrderRefundable, currentBalance)
    if (amount <= 0) {
      return toast.error("This order's wallet credit has already been used on another order or refunded to bank.")
    }

    const confirmMsg = `Process instant Razorpay bank refund of ${money(amount)} for Order ${entry.orderId}? This will automatically debit the customer's wallet.`
    if (!window.confirm(confirmMsg)) return

    setProcessingRefundId(entry.id)
    try {
      const call = httpsCallable(functions, "refundWalletToBank")
      const idempotencyKey = `w2b_${crypto.randomUUID().replaceAll("-", "")}`
      const result = await call({
        orderId: entry.orderId,
        userId: selectedUserId,
        amountPaise: amount,
        idempotencyKey,
      })

      toast.success(`Success! ${money(amount)} refunded to customer's bank (Razorpay Refund ID: ${result.data?.providerRefundId}). Wallet debited.`)
      // Refresh details & list
      if (selectedUserId) {
        handleOpenDetails(selectedUserId)
      }
      fetchWallets()
    } catch (err) {
      toast.error(err?.message || "Bank refund failed via Razorpay.")
    } finally {
      setProcessingRefundId(null)
    }
  }

  // Summary KPIs
  const stats = useMemo(() => {
    const totalCount = wallets.length
    const totalLiabilityPaise = wallets.reduce((sum, w) => sum + (w.balancePaise || 0), 0)
    const totalCreditsPaise = wallets.reduce((sum, w) => sum + (w.lifetimeCreditPaise || 0), 0)
    const totalDebitsPaise = wallets.reduce((sum, w) => sum + (w.lifetimeDebitPaise || 0), 0)
    return {
      totalCount,
      liability: totalLiabilityPaise,
      credits: totalCreditsPaise,
      debits: totalDebitsPaise,
    }
  }, [wallets])

  // Filtered wallets
  const filteredWallets = useMemo(() => {
    return wallets.filter((w) => {
      if (filterNonZero && (w.balancePaise || 0) <= 0) return false
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const name = (w.userName || "").toLowerCase()
      const phone = (w.userPhone || "").toLowerCase()
      const uid = (w.userId || "").toLowerCase()
      return name.includes(q) || phone.includes(q) || uid.includes(q)
    })
  }, [wallets, searchQuery, filterNonZero])

  return (
    <div className="dashboard-page dashboard-page-wide space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <IconWallet className="h-7 w-7" />
            </div>
            Wallet & Bank Refunds Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track customer in-app wallet balances, view activity ledgers, and execute 1-click Razorpay instant refunds back to customer bank accounts.
          </p>
        </div>
        <Button onClick={fetchWallets} variant="outline" size="sm" className="gap-2 h-10 w-fit">
          <IconRefresh className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Wallets</p>
              <h3 className="text-2xl font-bold text-foreground">{stats.totalCount}</h3>
            </div>
            <div className="h-10 w-10 bg-indigo-500/10 text-indigo-600 rounded-lg flex items-center justify-center">
              <IconWallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Liability</p>
              <h3 className="text-2xl font-bold text-primary">{money(stats.liability)}</h3>
              <p className="text-[10px] text-muted-foreground">Unspent balance held in customer wallets</p>
            </div>
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <IconCoin className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lifetime Refunded</p>
              <h3 className="text-2xl font-bold text-emerald-600">{money(stats.credits)}</h3>
              <p className="text-[10px] text-muted-foreground">Credited for unavailable items</p>
            </div>
            <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center">
              <IconArrowBackUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Debits / Used</p>
              <h3 className="text-2xl font-bold text-amber-600">{money(stats.debits)}</h3>
              <p className="text-[10px] text-muted-foreground">Used on orders or refunded to bank</p>
            </div>
            <div className="h-10 w-10 bg-amber-500/10 text-amber-600 rounded-lg flex items-center justify-center">
              <IconBuildingBank className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Wallets Table Card */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Customer Wallet Accounts</CardTitle>
              <CardDescription>Click on any customer to view ledger history or initiate a 1-click Razorpay refund to their original bank.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, UID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button
                variant={filterNonZero ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setFilterNonZero(!filterNonZero)}
              >
                {filterNonZero ? "Showing Balance > ₹0" : "Show All Wallets"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="px-6 py-3.5">Customer</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Available Balance</TableHead>
                <TableHead>Lifetime Credits</TableHead>
                <TableHead>Lifetime Debits</TableHead>
                <TableHead className="text-right px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-6 py-4"><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right px-6"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredWallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No customer wallets found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredWallets.map((w) => {
                  const hasBalance = (w.balancePaise || 0) > 0

                  return (
                    <TableRow
                      key={w.userId}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => handleOpenDetails(w.userId)}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {(w.userName || "C")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{w.userName}</p>
                            <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[160px]">{w.userId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <IconPhone className="h-3.5 w-3.5 opacity-50" /> {w.userPhone}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs px-2.5 py-1 font-bold ${
                            hasBalance
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {money(w.balancePaise)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-medium">+{money(w.lifetimeCreditPaise)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-medium">-{money(w.lifetimeDebitPaise)}</span>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-semibold gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDetails(w.userId)
                          }}
                        >
                          <IconWallet className="h-3.5 w-3.5" /> View Ledger
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Wallet Details Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-3xl w-full p-0 max-h-[88vh] flex flex-col overflow-hidden gap-0 rounded-2xl border border-border/80 bg-background shadow-2xl">
          {/* Fixed Header */}
          <div className="border-b bg-muted/30 px-6 pt-6 pb-4 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10">
              {/* Customer Profile & Identification */}
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg shrink-0 shadow-2xs">
                  {(walletDetails?.userName || walletDetails?.user?.name || "C")[0]?.toUpperCase() || "C"}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-lg font-bold text-foreground tracking-tight truncate">
                      {walletDetails?.userName || walletDetails?.user?.name || "Customer"}
                    </DialogTitle>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-muted/60 text-muted-foreground border-border/80">
                      Wallet Ledger
                    </Badge>
                  </div>
                  <DialogDescription asChild>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedUserId, "User ID")}
                        className="inline-flex items-center gap-1 font-mono text-[11px] bg-background hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border/60 transition-colors cursor-pointer group"
                        title="Click to copy User ID"
                      >
                        <span>ID: {selectedUserId}</span>
                        <IconCopy className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </button>
                      {walletDetails?.userPhone && walletDetails.userPhone !== "No phone" && (
                        <a
                          href={`tel:${walletDetails.userPhone}`}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium text-xs text-muted-foreground"
                        >
                          <IconPhone className="h-3.5 w-3.5 opacity-60" />
                          {walletDetails.userPhone}
                        </a>
                      )}
                    </div>
                  </DialogDescription>
                </div>
              </div>

              {/* Available Balance Stat Card (padded safely away from close button) */}
              <div className="flex items-center sm:items-end justify-between sm:justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/20 dark:border-emerald-800/60 px-4 py-2.5 shrink-0">
                <div className="sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Available Balance
                  </p>
                  <p className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                    {money(walletDetails?.balancePaise ?? walletDetails?.wallet?.balancePaise ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Lifecycle Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Lifetime Credited:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  +{money(walletDetails?.lifetimeCreditPaise)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Lifetime Debited:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                  -{money(walletDetails?.lifetimeDebitPaise)}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                <IconClock className="h-3.5 w-3.5 opacity-60" />
                <span>Auto-FIFO Tracked</span>
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Transaction History
                </h4>
                <Badge variant="secondary" className="text-[10px] h-5 px-2 font-bold">
                  {walletDetails?.entries?.length || 0}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Chronological credits, orders, and bank refunds
              </p>
            </div>

            {detailsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                <IconRefresh className="h-6 w-6 text-indigo-600 animate-spin" />
                <p className="text-xs font-medium text-muted-foreground">Loading wallet transaction ledger...</p>
              </div>
            ) : !walletDetails?.entries || walletDetails.entries.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 border border-dashed rounded-xl bg-muted/20">
                <IconWallet className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">No Transactions Recorded</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  This customer has no wallet credits, refunds, or deductions recorded yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {walletDetails.entries.map((entry) => {
                  const isCredit = (entry.amountPaise || 0) > 0
                  const isBankDebit = entry.type === "BANK_REFUND_DEBIT"
                  const isRefundCredit = entry.type === "REFUND_CREDIT"
                  const isOrderDebit = entry.type === "ORDER_DEBIT"

                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-border/70 bg-card/60 dark:bg-slate-900/40 p-4 hover:border-border transition-colors shadow-2xs"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Directional Icon */}
                        <div
                          className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isRefundCredit
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : isBankDebit
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {isRefundCredit ? (
                            <IconArrowDownLeft className="h-5 w-5" />
                          ) : isBankDebit ? (
                            <IconBuildingBank className="h-5 w-5" />
                          ) : (
                            <IconReceipt className="h-5 w-5" />
                          )}
                        </div>

                        {/* Transaction Detail Lines */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-base font-black tracking-tight ${
                                isCredit
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {isCredit ? `+${money(entry.amountPaise)}` : money(entry.amountPaise)}
                            </span>

                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isRefundCredit
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  : isBankDebit
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                  : isOrderDebit
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isRefundCredit
                                ? "Refund Credit"
                                : isBankDebit
                                ? "Bank Refund"
                                : isOrderDebit
                                ? "Used on Order"
                                : entry.type}
                            </Badge>

                            {entry.orderId && (
                              <Link
                                href={`/dashboard/order-management/${entry.orderId}`}
                                className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-foreground transition-colors border border-border/70 shrink-0 whitespace-nowrap"
                              >
                                <IconExternalLink className="h-3 w-3 opacity-60 shrink-0" />
                                Order #{entry.orderId}
                              </Link>
                            )}
                          </div>

                          <p className="text-xs text-foreground/90 font-medium break-words">
                            {entry.reason || "Wallet transaction"}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Date not recorded"}</span>
                            {entry.providerRefundId && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(entry.providerRefundId, "Razorpay ID")}
                                className="font-mono text-[10px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border/50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Click to copy Razorpay Refund ID"
                              >
                                <span>RP: {entry.providerRefundId}</span>
                                <IconCopy className="h-2.5 w-2.5 opacity-50" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action / Bank Refund Status */}
                      {isRefundCredit && entry.orderId && (
                        <div className="sm:self-center flex flex-col sm:items-end gap-1.5 shrink-0 pl-12 sm:pl-0">
                          {entry.bankRefundedPaise > 0 ? (
                            <div className="flex flex-col sm:items-end gap-1">
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 gap-1 whitespace-nowrap"
                              >
                                <IconCheck className="h-3 w-3" /> Refunded to Bank
                              </Badge>
                              {entry.refundProviderId && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(entry.refundProviderId, "Bank Refund ID")}
                                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Click to copy Bank Refund ID"
                                >
                                  <span>ID: {entry.refundProviderId}</span>
                                  <IconCopy className="h-2.5 w-2.5 opacity-50" />
                                </button>
                              )}
                            </div>
                          ) : entry.isFullyConsumed ? (
                            <div className="flex flex-col sm:items-end gap-0.5">
                              <Badge
                                variant="outline"
                                className="text-xs font-medium bg-muted/80 text-muted-foreground border-border whitespace-nowrap"
                              >
                                Used on subsequent orders
                              </Badge>
                              {entry.consumedBy?.length > 0 && (
                                <span className="text-[10px] text-muted-foreground max-w-[200px] text-right">
                                  Used on: {entry.consumedBy.map((c) => `#${c.orderId}`).join(", ")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col sm:items-end gap-1">
                              <Button
                                size="sm"
                                disabled={
                                  processingRefundId === entry.id ||
                                  (walletDetails?.balancePaise ?? walletDetails?.wallet?.balancePaise ?? 0) <= 0 ||
                                  (entry.remainingRefundablePaise || 0) <= 0
                                }
                                onClick={() =>
                                  handle1ClickBankRefund({
                                    ...entry,
                                    amountPaise: entry.remainingRefundablePaise || entry.amountPaise,
                                  })
                                }
                                className="h-8 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-xs rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {processingRefundId === entry.id ? (
                                  <>
                                    <IconRefresh className="h-3.5 w-3.5 animate-spin" />
                                    Refunding to Bank...
                                  </>
                                ) : (
                                  <>
                                    <IconBuildingBank className="h-3.5 w-3.5" />
                                    1-Click Bank Refund
                                    {entry.isPartiallyConsumed ? ` (${money(entry.remainingRefundablePaise)})` : ""}
                                  </>
                                )}
                              </Button>
                              {entry.isPartiallyConsumed && (
                                <p className="text-[10px] text-muted-foreground text-right">
                                  {money(entry.amountPaise - entry.remainingRefundablePaise)} already used on{" "}
                                  {entry.consumedBy?.map((c) => `#${c.orderId}`).join(", ")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

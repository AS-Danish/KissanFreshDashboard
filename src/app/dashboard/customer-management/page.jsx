"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, onSnapshot } from "firebase/firestore"
import { IconMail, IconMapPin, IconPhone, IconSearch, IconUserCheck, IconUsers } from "@tabler/icons-react"
import { db } from "@/firebase/config"
import { useAppStore } from "@/store/useAppStore"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const CUSTOMER_ROLES = new Set(["USER", "CUSTOMER"])

function formatAddress(address) {
  if (!address) return ""
  if (typeof address === "string") return address

  return [address.flatNo, address.landmark, address.mapAddress || address.address]
    .filter(Boolean)
    .join(", ")
}

function getDefaultLocation(customer) {
  // The mobile app stores the current/default address in `address` and keeps
  // the saved locations in `savedAddresses`. Fall back to the first saved one
  // for profiles created before the top-level address was introduced.
  const primaryAddress = formatAddress(customer.address)
  if (primaryAddress) return primaryAddress

  const savedAddresses = Array.isArray(customer.savedAddresses)
    ? customer.savedAddresses
    : []
  const homeAddress = savedAddresses.find((address) =>
    ["home", "default", "primary"].includes(String(address?.type || "").toLowerCase()),
  )

  return formatAddress(homeAddress || savedAddresses[0])
}

function getInitials(name) {
  const initials = String(name || "Customer")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")

  return initials.toUpperCase() || "C"
}

function CustomerIdentity({ customer }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {getInitials(customer.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{customer.name || "Unnamed customer"}</p>
        {customer.email ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"><IconMail className="size-3 shrink-0" />{customer.email}</p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">Email not provided</p>
        )}
      </div>
    </div>
  )
}

export default function CustomerManagementPage() {
  const router = useRouter()
  const { userRole, authLoading } = useAppStore()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (userRole !== "ADMIN") {
      router.replace("/dashboard")
      return
    }

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const nextCustomers = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }))
          .filter((user) => CUSTOMER_ROLES.has(String(user.role || "").toUpperCase()))
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))

        setCustomers(nextCustomers)
        setError("")
        setLoading(false)
      },
      (snapshotError) => {
        console.error("Unable to load customers:", snapshotError)
        setError("Customer records could not be loaded. Please try again.")
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [authLoading, router, userRole])

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return customers

    return customers.filter((customer) =>
      [customer.name, customer.phoneNumber, customer.email, getDefaultLocation(customer)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [customers, search])

  const customerSummary = useMemo(() => ({
    withPhone: customers.filter((customer) => Boolean(customer.phoneNumber)).length,
    withLocation: customers.filter((customer) => Boolean(getDefaultLocation(customer))).length,
  }), [customers])

  if (authLoading || userRole !== "ADMIN") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="dashboard-page dashboard-page-wide space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
          <div className="absolute -right-12 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><IconUsers className="size-5" /></div>
            <h2>Customer directory</h2>
            <p className="mt-2 text-sm">A quick view of every customer, their contact number, and their preferred delivery location.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-muted-foreground">Total users</span><span className="rounded-lg bg-primary/10 p-2 text-primary"><IconUsers className="size-4" /></span></div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{loading ? "—" : customers.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Customer accounts</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-muted-foreground">Contactable</span><span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400"><IconPhone className="size-4" /></span></div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{loading ? "—" : customerSummary.withPhone}</p>
          <p className="mt-1 text-xs text-muted-foreground">With a phone number</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-muted-foreground">Delivery ready</span><span className="rounded-lg bg-sky-500/10 p-2 text-sky-700 dark:text-sky-400"><IconUserCheck className="size-4" /></span></div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{loading ? "—" : customerSummary.withLocation}</p>
          <p className="mt-1 text-xs text-muted-foreground">With a saved location</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">All customers</p>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading customers…" : `Showing ${filteredCustomers.length} of ${customers.length} customer${customers.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone, or location"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="min-w-64 px-6 font-semibold text-foreground">Customer</TableHead>
                <TableHead className="min-w-48 font-semibold text-foreground">Phone number</TableHead>
                <TableHead className="min-w-80 px-6 font-semibold text-foreground">Preferred location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">Loading customers...</TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-destructive">{error}</TableCell></TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">{search ? "No customers match your search." : "No customer accounts found."}</TableCell></TableRow>
              ) : (
                filteredCustomers.map((customer) => {
                  const location = getDefaultLocation(customer)
                  return (
                    <TableRow key={customer.id} className="hover:bg-primary/[0.01]">
                      <TableCell className="px-6 py-4"><CustomerIdentity customer={customer} /></TableCell>
                      <TableCell>
                        {customer.phoneNumber ? (
                          <div className="flex items-center gap-2 whitespace-nowrap"><IconPhone className="size-4 text-muted-foreground" />{customer.phoneNumber}</div>
                        ) : <Badge variant="outline">Not provided</Badge>}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {location ? (
                          <div className="flex min-w-0 items-start gap-2"><IconMapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span className="whitespace-normal">{location}</span></div>
                        ) : <span className="text-muted-foreground">No saved location</span>}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="divide-y md:hidden">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading customers...</p>
          ) : error ? (
            <p className="px-5 py-10 text-center text-sm text-destructive">{error}</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">{search ? "No customers match your search." : "No customer accounts found."}</p>
          ) : filteredCustomers.map((customer) => {
            const location = getDefaultLocation(customer)
            return (
              <article key={customer.id} className="space-y-4 p-5">
                <CustomerIdentity customer={customer} />
                <div className="grid gap-3 text-sm">
                  <div className="flex items-start gap-2.5"><span className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground"><IconPhone className="size-3.5" /></span><div><p className="text-xs font-medium text-muted-foreground">Phone number</p><p className="mt-0.5 font-medium">{customer.phoneNumber || "Not provided"}</p></div></div>
                  <div className="flex items-start gap-2.5"><span className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground"><IconMapPin className="size-3.5" /></span><div><p className="text-xs font-medium text-muted-foreground">Preferred location</p><p className="mt-0.5 leading-5">{location || "No saved location"}</p></div></div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

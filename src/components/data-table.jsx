"use client"

import * as React from "react"
import { IconCircleCheckFilled, IconLoader, IconClock } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function DataTable({
  data
}) {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order Time</TableHead>
              <TableHead>Customer Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.length ? (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-muted-foreground px-2 py-1">
                      {row.status === "Delivered" && (
                        <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
                      )}
                      {row.status === "Processing" && (
                        <IconLoader className="mr-1 h-3 w-3 animate-spin text-blue-500" />
                      )}
                      {row.status === "Pending" && (
                        <IconClock className="mr-1 h-3 w-3 text-yellow-500" />
                      )}
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.orderTime}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

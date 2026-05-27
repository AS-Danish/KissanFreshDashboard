import { IconTrendingDown, IconTrendingUp, IconTruckDelivery, IconPackage } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards({ stats, loading = false }) {
  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
  };

  return (
    <div
      className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? <Skeleton className="h-8 w-24" /> : `₹${formatCurrency(stats?.grossRevenue)}`}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Overall revenue generated
          </div>
          <div className="text-muted-foreground">
            From all orders
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Completed Orders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? <Skeleton className="h-8 w-16" /> : (stats?.deliveredOrders || 0)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTruckDelivery />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Orders already delivered
          </div>
          <div className="text-muted-foreground">
            Successfully completed
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Orders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? <Skeleton className="h-8 w-16" /> : (stats?.totalOrders || 0)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconPackage />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total historical orders
          </div>
          <div className="text-muted-foreground">Across the system</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Processing Orders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? <Skeleton className="h-8 w-16" /> : (stats?.processingOrders || 0)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Orders currently processing
          </div>
          <div className="text-muted-foreground">Needs fulfillment</div>
        </CardFooter>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, intervalToDuration } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock, CircleCheck, MapPin, Receipt, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { getCustomerPayments, getCustomerRequests } from "#/server/customer";
import type { RequestStatus } from "#/lib/customer-types";

export const Route = createFileRoute("/_customer/dashboard")({ component: Dashboard });

const STATUS_ORDER: RequestStatus[] = ["PENDED", "APPROVED", "REJECTED", "COMPLETED"];
const STATUS_COLOR: Record<RequestStatus, string> = {
  PENDED: "var(--chart-4)",
  APPROVED: "var(--chart-3)",
  REJECTED: "var(--chart-2)",
  COMPLETED: "var(--chart-1)",
};
function Dashboard() {
  const requests = useQuery({ queryKey: ["customer-requests"], queryFn: () => getCustomerRequests() });
  const payments = useQuery({ queryKey: ["customer-payments"], queryFn: () => getCustomerPayments() });

  const requestList = requests.data ?? [];
  const paymentList = payments.data ?? [];

  const pending = requestList.filter((r) => r.status === "PENDED").length;
  const totalPaid = paymentList.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);

  const upcoming = requestList
    .filter((r) => r.status === "APPROVED")
    .flatMap((r) => r.packages.map((p) => ({ ...p, requestTitle: r.title })))
    .filter((p) => p.bookStart && new Date(p.bookStart) > new Date())
    .sort((a, b) => new Date(a.bookStart!).getTime() - new Date(b.bookStart!).getTime())
    .slice(0, 4);

  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: requestList.filter((r) => r.status === status).length,
  }));
  const pieData = statusCounts.filter((s) => s.count > 0).map((s) => ({ name: s.status, value: s.count }));

  const chartData = [...paymentList]
    .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime())
    .map((p) => ({ date: format(new Date(p.paidAt), "MMM d"), amount: p.paidAmount ?? 0 }));

  const activity = [
    ...requestList.map((r) => ({
      key: `req-${r.id}`,
      date: new Date(r.createdAt),
      title: r.title,
      subtitle: `Booking request · ${r.packages[0]?.bookItem.title ?? ""}`,
      status: r.status,
      color: STATUS_COLOR[r.status],
    })),
    ...paymentList.map((p) => ({
      key: `pay-${p.id}`,
      date: new Date(p.paidAt),
      title: p.request?.title ?? "Payment recorded",
      subtitle: `GHS ${(p.paidAmount ?? 0).toLocaleString()} paid`,
      status: "COMPLETED" as RequestStatus,
      color: "var(--chart-1)",
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6);

  const isLoading = requests.isLoading || payments.isLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your dashboard</h1>
        <p className="text-sm text-muted-foreground">An overview of your booking requests and payments.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total requests"
          value={requestList.length}
          icon={Receipt}
          isLoading={requests.isLoading}
          tint="var(--chart-1)"
        />
        <StatCard label="Pending" value={pending} icon={CircleCheck} isLoading={requests.isLoading} tint="var(--chart-4)" />
        <StatCard
          label="Payments made"
          value={paymentList.length}
          icon={Wallet}
          isLoading={payments.isLoading}
          tint="var(--chart-3)"
        />
        <StatCard
          label="Total paid"
          value={totalPaid}
          icon={Wallet}
          isLoading={payments.isLoading}
          prefix="GHS "
          tint="var(--chart-5)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment history</CardTitle>
              <span className="text-xs text-muted-foreground">All time</span>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            {payments.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No payments recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="paymentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="var(--chart-1)" fill="url(#paymentFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              Upcoming bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming approved bookings.</p>
            ) : (
              upcoming.map((booking, i) => (
                <UpcomingBookingItem
                  key={i}
                  title={booking.requestTitle}
                  facility={booking.bookItem.title}
                  start={new Date(booking.bookStart!)}
                  isNext={i === 0}
                  color={["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"][i % 4]}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Requests by status</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : requestList.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No requests yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "var(--secondary)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusCounts.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex h-56 flex-col items-center justify-center gap-3">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No requests yet.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLOR[entry.name as RequestStatus]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--popover-foreground)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {pieData.map((entry) => (
                    <span key={entry.name} className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[entry.name as RequestStatus] }} />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              activity.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start gap-3 rounded-lg border-l-4 bg-secondary/50 py-2 pl-3 pr-2"
                  style={{ borderColor: item.color }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{format(item.date, "MMM d")}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
  prefix = "",
  tint,
}: {
  label: string;
  value: number;
  icon: typeof Receipt;
  isLoading?: boolean;
  prefix?: string;
  tint: string;
}) {
  return (
    <Card
      className="gap-0 rounded-[20px] border-0 py-0 shadow-lg"
      style={{ background: `color-mix(in oklab, ${tint} 8%, var(--card))` }}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full"
            style={{ background: tint }}
          >
            <Icon className="size-3.5 text-white" />
          </span>
          <p className="truncate text-base font-medium text-foreground">{label}</p>
        </div>
        <p className="mt-4 font-mono text-3xl font-bold tabular-nums text-foreground">
          {isLoading ? "—" : `${prefix}${value.toLocaleString()}`}
        </p>
      </CardContent>
    </Card>
  );
}

function UpcomingBookingItem({
  title,
  facility,
  start,
  isNext,
  color,
}: {
  title: string;
  facility: string;
  start: Date;
  isNext: boolean;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border-l-4 bg-secondary/50 py-2.5 pl-3 pr-2" style={{ borderColor: color }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          {isNext && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Next
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3" />
          {facility}
        </p>
        {isNext && <CountdownInline targetDate={start} />}
      </div>
      <span className="shrink-0 text-right text-xs text-muted-foreground">
        {format(start, "MMM d")}
        <br />
        {format(start, "p")}
      </span>
    </div>
  );
}

function CountdownInline({ targetDate }: { targetDate: Date }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const duration = intervalToDuration({ start: now, end: targetDate });

  return (
    <p className="mt-1 font-mono text-xs tabular-nums text-primary">
      in {String(duration.days ?? 0).padStart(2, "0")}d {String(duration.hours ?? 0).padStart(2, "0")}h{" "}
      {String(duration.minutes ?? 0).padStart(2, "0")}m {String(duration.seconds ?? 0).padStart(2, "0")}s
    </p>
  );
}

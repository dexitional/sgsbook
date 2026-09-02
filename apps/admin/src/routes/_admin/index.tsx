import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Package, Receipt, UserSquare2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { StatCard } from "#/components/stat-card";
import { MonthlyBalanceCard, MonthlyRevenueCard } from "#/components/dashboard-widgets";
import { useClients } from "#/lib/queries/clients";
import { useItems } from "#/lib/queries/items";
import { useRequests } from "#/lib/queries/requests";
import { usePayments } from "#/lib/queries/payments";
import type { RequestStatus } from "#/lib/types";

export const Route = createFileRoute("/_admin/")({ component: Dashboard });

const STATUSES: RequestStatus[] = ["PENDED", "APPROVED", "REJECTED", "COMPLETED"];

function Dashboard() {
  const clients = useClients({ page: 1, pageSize: 1 });
  const items = useItems({ page: 1, pageSize: 1 });
  const payments = usePayments({ page: 1, pageSize: 100 });
  const pended = useRequests({ status: "PENDED", page: 1, pageSize: 1 });
  const approved = useRequests({ status: "APPROVED", page: 1, pageSize: 1 });
  const rejected = useRequests({ status: "REJECTED", page: 1, pageSize: 1 });
  const completed = useRequests({ status: "COMPLETED", page: 1, pageSize: 1 });

  const statusQueries = { PENDED: pended, APPROVED: approved, REJECTED: rejected, COMPLETED: completed };
  const totalRequests = STATUSES.reduce((sum, s) => sum + (statusQueries[s].data?.total ?? 0), 0);
  const chartData = STATUSES.map((status) => ({ status, count: statusQueries[status].data?.total ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">An overview of clients, facilities, and booking activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Clients"
          value={clients.data?.total ?? 0}
          icon={UserSquare2}
          isLoading={clients.isLoading}
          tint="var(--chart-1)"
        />
        <StatCard
          label="Items & facilities"
          value={items.data?.total ?? 0}
          icon={Package}
          isLoading={items.isLoading}
          tint="var(--chart-4)"
        />
        <StatCard
          label="Booking requests"
          value={totalRequests}
          icon={Receipt}
          isLoading={pended.isLoading}
          tint="var(--chart-3)"
        />
        <StatCard
          label="Payments recorded"
          value={payments.data?.total ?? 0}
          icon={Wallet}
          isLoading={payments.isLoading}
          tint="var(--chart-5)"
        />
      </div>
       
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Requests by status</CardTitle>
            </CardHeader>
            <CardContent className="min-h-44 flex-1 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <section className="sec1 h-full">
            <MonthlyBalanceCard payments={payments.data?.items ?? []} />
          </section>
          <section className="sec2 h-full">
            <MonthlyRevenueCard payments={payments.data?.items ?? []} />
          </section>
      </div>
      
    </div>
  );
}

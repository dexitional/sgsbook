import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { format, subMonths } from "date-fns";
import { ArrowUpRight, Ellipsis, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
import { IconButton } from "@sgs/ui";
import type { Payment } from "#/lib/admin-types";

function monthKey(date: Date) {
  return format(date, "yyyy-MM");
}

function monthTotalsFrom(payments: Payment[]) {
  const totals = new Map<string, number>();
  for (const p of payments) {
    const key = monthKey(new Date(p.paidAt));
    totals.set(key, (totals.get(key) ?? 0) + (p.paidAmount ?? 0));
  }
  return totals;
}

const currency = (n: number) => `GHS ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function MonthlyBalanceCard({ payments }: { payments: Payment[] }) {
  const gradientId = useId();
  const totals = monthTotalsFrom(payments);

  const now = new Date();
  const thisMonth = totals.get(monthKey(now)) ?? 0;
  const lastMonth = totals.get(monthKey(subMonths(now, 1))) ?? 0;
  const trendPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
  const series = months.map((d) => totals.get(monthKey(d)) ?? 0);
  const max = Math.max(...series, 1);
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * 300;
    const y = 90 - (v / max) * 70;
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},100 L0,100 Z`;
  const last = points[points.length - 1];

  return (
    <Card className="relative flex h-full flex-col overflow-hidden py-0 shadow-lg">
      <div className="pointer-events-none absolute -top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative flex flex-1 flex-col gap-3 px-4 pb-6 pt-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Monthly Balance</p>
              <p className="text-xs text-muted-foreground">{format(now, "MMMM yyyy")}</p>
            </div>
          </div>
        </div>

        <div className="flex divide-x divide-border">
          <div className="flex-1 pr-6">
            <p className="text-xs font-medium text-muted-foreground">This month</p>
            <p className="text-xl font-semibold text-foreground">{currency(thisMonth)}</p>
            {trendPct != null && (
              <p className={`mt-1 text-xs font-medium ${trendPct >= 0 ? "text-primary" : "text-red-500"}`}>
                {trendPct >= 0 ? "+" : ""}
                {trendPct.toFixed(1)}%
              </p>
            )}
          </div>
          <div className="flex-1 pl-6">
            <p className="text-xs font-medium text-muted-foreground">Last month</p>
            <p className="text-xl font-semibold text-foreground">{currency(lastMonth)}</p>
          </div>
        </div>

        <div className="relative min-h-10 w-full flex-1">
          <svg className="h-full w-full" viewBox="0 0 300 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2} />
          </svg>
          <div className="absolute" style={{ left: `${(last.x / 300) * 100}%`, top: `${(last.y / 100) * 100}%` }}>
            <div className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_2px] shadow-primary/60" />
          </div>
        </div>

        <div className="mt-auto border-t border-border pt-3">
          <Button asChild variant="outline" className="w-full border-primary/50 bg-transparent text-primary hover:bg-primary hover:text-primary-foreground">
            <Link to="/sgs-admin/payments">
              View full report
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthlyRevenueCard({ payments }: { payments: Payment[] }) {
  const lineGradientId = useId();
  const areaGradientId = useId();
  const totals = monthTotalsFrom(payments);

  const year = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  const series = months.map((d) => ({ label: format(d, "MMM"), value: totals.get(monthKey(d)) ?? 0 }));
  const max = Math.max(...series.map((s) => s.value), 1);

  const width = 360;
  const height = 120;
  const chartBottom = 90;
  const points = series.map((s, i) => {
    const x = 15 + (i / (series.length - 1)) * (width - 30);
    const y = chartBottom - (s.value / max) * 60;
    return { ...s, x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

  const elapsedMonths = new Date().getMonth() + 1;
  const totalThisYear = series.reduce((sum, s) => sum + s.value, 0);
  const avgPerMonth = totalThisYear / elapsedMonths;

  return (
    <Card className="flex h-full flex-col py-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3 pt-3">
        <CardTitle>Monthly Revenue</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton aria-label="Card options" variant="ghost" size="sm">
              <Ellipsis className="size-4" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/sgs-admin/payments">View payments</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 px-3 pb-5 pt-3">
        <svg className="h-16 min-h-14 w-full flex-1" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id={lineGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--chart-1)" />
              <stop offset="100%" stopColor="var(--chart-3)" />
            </linearGradient>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${areaGradientId})`} />
          <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} stroke={`url(#${lineGradientId})`} strokeWidth={2.5} fill="none" />
          {points.map((p) => {
            const tooltipAbove = p.y > 30;
            const tooltipY = tooltipAbove ? p.y - 34 : p.y + 10;
            // Clamp so the 60-wide tooltip rect never spills past the
            // viewBox edges — SVG clips to its viewBox by default, so the
            // first/last month's tooltip was getting cut off otherwise.
            const tooltipCenterX = Math.min(Math.max(p.x, 30), width - 30);
            return (
              <g key={p.label} className="group cursor-default">
                <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={4} fill="var(--chart-1)" />
                <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
                  <rect x={tooltipCenterX - 30} y={tooltipY} width={60} height={26} rx={6} fill="var(--popover)" stroke="var(--border)" />
                  <text x={tooltipCenterX} y={tooltipY + 17} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--popover-foreground)">
                    {currency(p.value)}
                  </text>
                </g>
              </g>
            );
          })}
          <g fontSize={10} fill="var(--muted-foreground)">
            {points.map((p) => (
              <text key={p.label} x={p.x} y={112} textAnchor="middle">
                {p.label}
              </text>
            ))}
          </g>
        </svg>

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Avg / month this year</span>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold tabular-nums">{currency(avgPerMonth)}</p>
            <p className="text-xs text-muted-foreground">{currency(totalThisYear)} total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

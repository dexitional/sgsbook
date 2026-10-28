import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { format, formatDistanceToNowStrict } from "date-fns";
import { CircleAlert, FileText, Plus, Printer } from "lucide-react";
import { DataTable, computeDays } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { CustomerBookingDialog } from "#/components/customer-booking-dialog";
import { ScheduleChangeDialog } from "#/components/schedule-change-dialog";
import { BalanceRows, TotalWithBalance } from "#/components/payment-balance";
import { paymentSummary } from "#/lib/balance";
import { extendBooking, getCustomerRequests, rescheduleBooking } from "#/server/customer";
import type { RequestStatus } from "#/lib/customer-types";

export const Route = createFileRoute("/_customer/requests")({ component: RequestsPage });

interface RequestPackageAddon {
  id: string;
  item: { title: string; amount: number | null };
}

interface RequestPackage {
  id: string;
  bookStart: Date | string | null;
  bookEnd: Date | string | null;
  bookItem: { title: string; amount: number | null };
  UbsAddon: RequestPackageAddon[];
}

interface RequestRow {
  id: string;
  title: string;
  status: RequestStatus;
  createdAt: string | Date;
  chargeAmount: number | null;
  rejectReason: string | null;
  paymentDueAt: string | Date | null;
  payment: { status: boolean; paidAmount: number | null }[];
  packages: RequestPackage[];
}

function isAwaitingPayment(row: RequestRow) {
  return row.status === "APPROVED" && row.paymentDueAt != null && !row.payment.some((p) => p.status);
}

const statusVariant: Record<RequestStatus, "outline" | "default" | "destructive" | "secondary"> = {
  PENDED: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  COMPLETED: "secondary",
};

const columnHelper = createColumnHelper<RequestRow>();
const columns = [
  columnHelper.accessor("title", { header: "Request" }),
  columnHelper.accessor((row) => row.packages[0]?.bookItem.title, {
    id: "facility",
    header: "Facility",
    cell: (c) => {
      const count = c.row.original.packages.length;
      const value = c.getValue();
      return value ? `${value}${count > 1 ? ` +${count - 1} more` : ""}` : "—";
    },
  }),
  columnHelper.accessor((row) => row.packages[0]?.bookStart, {
    id: "when",
    header: "When",
    cell: (c) => (c.getValue() ? format(new Date(c.getValue()!), "PPp") : "—"),
  }),
  columnHelper.accessor("chargeAmount", {
    header: "Total",
    cell: (c) => <TotalWithBalance chargeAmount={c.getValue()} payments={c.row.original.payment} />,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (c) => {
      const row = c.row.original;
      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant={statusVariant[c.getValue()]}>{c.getValue()}</Badge>
          {row.status === "REJECTED" && row.rejectReason && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex max-w-48 cursor-help items-center gap-1 truncate text-xs text-destructive">
                  <CircleAlert className="size-3 shrink-0" />
                  {row.rejectReason}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{row.rejectReason}</TooltipContent>
            </Tooltip>
          )}
          {isAwaitingPayment(row) && (
            <span className="text-xs font-medium text-destructive">
              {new Date(row.paymentDueAt!) > new Date()
                ? `Pay within ${formatDistanceToNowStrict(new Date(row.paymentDueAt!))}`
                : "Payment overdue"}
            </span>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor("createdAt", { header: "Submitted", cell: (c) => format(new Date(c.getValue()), "PP") }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (c) => <RequestActions request={c.row.original} />,
  }),
];

function RequestActions({ request }: { request: RequestRow }) {
  const queryClient = useQueryClient();
  const { status } = request;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
  const scheduleProps = {
    requestTitle: request.title,
    packages: request.packages,
    chargeAmount: request.chargeAmount,
    paidAmount: paymentSummary(request.chargeAmount, request.payment).paid,
  };
  return (
    <div className="flex gap-1.5">
      {(status === "APPROVED" || status === "COMPLETED") && <RequestInvoiceDialog request={request} />}
      {(status === "PENDED" || status === "APPROVED") && (
        <>
          <ScheduleChangeDialog
            mode="reschedule"
            {...scheduleProps}
            onReschedule={async (values) => {
              await rescheduleBooking({ data: { requestId: request.id, ...values } });
              await refresh();
            }}
          />
          <ScheduleChangeDialog
            mode="extend"
            {...scheduleProps}
            onExtend={async (values) => {
              await extendBooking({ data: { requestId: request.id, ...values } });
              await refresh();
            }}
          />
        </>
      )}
    </div>
  );
}

function RequestInvoiceDialog({ request }: { request: RequestRow }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="chunky-btn">
          <FileText className="size-4" />
          Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invoice — {request.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {request.packages.map((pkg) => {
            const days = pkg.bookStart && pkg.bookEnd ? computeDays(pkg.bookStart, pkg.bookEnd) : 1;
            const unitPrice = pkg.bookItem.amount ?? 0;
            const facilityTotal = unitPrice * days;
            const addonsTotal = pkg.UbsAddon.reduce((sum, a) => sum + (a.item.amount ?? 0) * days, 0);
            return (
              <div key={pkg.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between font-medium">
                  <span>{pkg.bookItem.title}</span>
                  <span className="tabular-nums">GHS {(facilityTotal + addonsTotal).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pkg.bookStart ? format(new Date(pkg.bookStart), "PP") : "—"} –{" "}
                  {pkg.bookEnd ? format(new Date(pkg.bookEnd), "PP") : "—"} · {days} {days === 1 ? "day" : "days"}
                </p>
                <div className="mt-2 flex items-center justify-between text-muted-foreground">
                  <span>Facility (GHS {unitPrice}/day)</span>
                  <span className="tabular-nums">GHS {facilityTotal.toFixed(2)}</span>
                </div>
                {pkg.UbsAddon.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {addon.item.title} (GHS {addon.item.amount ?? 0}/day)
                    </span>
                    <span className="tabular-nums">GHS {((addon.item.amount ?? 0) * days).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">GHS {(request.chargeAmount ?? 0).toFixed(2)}</span>
          </div>
          <BalanceRows chargeAmount={request.chargeAmount} payments={request.payment} />
        </div>
        <DialogFooter>
          <Button asChild variant="outline">
            <a href={`/requests/${request.id}/print`} target="_blank" rel="noreferrer">
              <Printer className="size-4" />
              Print
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestsPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const requests = useQuery({ queryKey: ["customer-requests"], queryFn: () => getCustomerRequests() });

  const allRows = (requests.data ?? []) as unknown as RequestRow[];
  const pageRows = allRows.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">Track the status of every request you've submitted.</p>
        </div>
        <NewRequestButton />
      </div>

      <DataTable
        columns={columns}
        data={pageRows}
        isLoading={requests.isLoading}
        rowCount={allRows.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage="You haven't made any booking requests yet."
      />
    </div>
  );
}

function NewRequestButton() {
  const [open, setOpen] = useState(false);
  return (
    <CustomerBookingDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <DialogTrigger asChild>
          <Button>
            <Plus />
            New request
          </Button>
        </DialogTrigger>
      }
    />
  );
}

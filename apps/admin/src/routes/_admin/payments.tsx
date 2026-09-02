import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Printer, Receipt as ReceiptIcon } from "lucide-react";
import { DataTable, computeDays } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { usePayments, useRecordPayment } from "#/lib/queries/payments";
import { useRequests } from "#/lib/queries/requests";
import type { Payment } from "#/lib/types";

export const Route = createFileRoute("/_admin/payments")({ component: PaymentsPage });

const columnHelper = createColumnHelper<Payment>();
const columns = [
  columnHelper.accessor((row) => row.request?.title, { id: "request", header: "Request", cell: (c) => c.getValue() ?? "—" }),
  columnHelper.accessor((row) => row.request?.client?.name, { id: "client", header: "Client", cell: (c) => c.getValue() ?? "—" }),
  columnHelper.accessor("paidName", { header: "Paid by", cell: (c) => c.getValue() ?? "—" }),
  columnHelper.accessor("paidRef", { header: "Reference", cell: (c) => c.getValue() ?? "—" }),
  columnHelper.accessor("paidAmount", {
    header: "Amount",
    cell: (c) => <span className="font-mono tabular-nums">{c.getValue() != null ? `GHS ${c.getValue()!.toLocaleString()}` : "—"}</span>,
  }),
  columnHelper.accessor("paidAt", { header: "Paid at", cell: (c) => format(new Date(c.getValue()), "PPp") }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (c) => <ReceiptDialog payment={c.row.original} />,
  }),
];

function PaymentsPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const payments = usePayments({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">Manually recorded payments against booking requests.</p>
        </div>
        <RecordPaymentDialog />
      </div>

      <DataTable
        columns={columns}
        data={payments.data?.items ?? []}
        isLoading={payments.isFetching}
        rowCount={payments.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage="No payments recorded yet."
      />
    </div>
  );
}

function ReceiptDialog({ payment }: { payment: Payment }) {
  const [open, setOpen] = useState(false);
  const request = payment.request;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="chunky-btn">
          <ReceiptIcon className="size-4" />
          Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Receipt — {request?.title ?? "Booking"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Paid on {format(new Date(payment.paidAt), "PPp")}</span>
            {payment.paidRef && <span>Ref {payment.paidRef}</span>}
          </div>
          {request?.client && <p className="text-sm text-muted-foreground">Client: {request.client.name}</p>}

          {request?.packages.map((pkg) => {
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
                {pkg.UbsAddon.map((addon) => (
                  <div key={addon.id} className="mt-1 flex items-center justify-between text-muted-foreground">
                    <span>{addon.item.title}</span>
                    <span className="tabular-nums">GHS {((addon.item.amount ?? 0) * days).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            );
          })}

          <div className="space-y-1 border-t pt-2 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Invoice total</span>
              <span className="tabular-nums">GHS {(request?.chargeAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total paid</span>
              <span className="tabular-nums">GHS {(payment.paidAmount ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button asChild variant="outline">
            <Link to="/invoices/$paymentId/print" params={{ paymentId: payment.id }} target="_blank">
              <Printer className="size-4" />
              Print
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const recordPaymentSchema = z.object({
  requestId: z.string().min(1, "Select a request"),
  paidName: z.string().optional(),
  paidRef: z.string().optional(),
  paidAmount: z.coerce.number().positive("Enter an amount"),
});

function RecordPaymentDialog() {
  const [open, setOpen] = useState(false);
  const requests = useRequests({ status: "APPROVED", page: 1, pageSize: 100 });
  const recordPayment = useRecordPayment();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(recordPaymentSchema) });

  const onSubmit = handleSubmit((values) => {
    recordPayment.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
        toast.success("Payment recorded");
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Booking request</Label>
            <Select onValueChange={(v) => setValue("requestId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an approved request" />
              </SelectTrigger>
              <SelectContent>
                {requests.data?.items.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} {r.client ? `— ${r.client.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.requestId && <p className="text-xs text-destructive">{errors.requestId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="paidName">Paid by</Label>
              <Input id="paidName" {...register("paidName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paidRef">Reference</Label>
              <Input id="paidRef" {...register("paidRef")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paidAmount">Amount (GHS)</Label>
            <Input id="paidAmount" type="number" step="0.01" {...register("paidAmount")} />
            {errors.paidAmount && <p className="text-xs text-destructive">{errors.paidAmount.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

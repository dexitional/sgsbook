import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer, Receipt as ReceiptIcon } from "lucide-react";
import { computeDays } from "@sgs/ui";
import { Card, CardContent } from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { getCustomerPayments } from "#/server/customer";

export const Route = createFileRoute("/sgs/_customer/receipts")({ component: ReceiptsPage });

interface PackageAddon {
  id: string;
  item: { title: string; amount: number | null };
}

interface Package {
  id: string;
  bookStart: Date | string | null;
  bookEnd: Date | string | null;
  bookItem: { title: string; amount: number | null };
  UbsAddon: PackageAddon[];
}

interface PaymentRow {
  id: string;
  paidAt: Date | string;
  paidRef: string | null;
  paidAmount: number | null;
  request: { title: string; chargeAmount: number | null; packages: Package[] } | null;
}

function ReceiptsPage() {
  const payments = useQuery({ queryKey: ["customer-payments"], queryFn: () => getCustomerPayments() });
  const list = (payments.data ?? []) as unknown as PaymentRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Receipts</h1>
        <p className="text-sm text-muted-foreground">Every payment recorded against your bookings.</p>
      </div>

      {payments.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No payments recorded yet.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-medium">{payment.request?.title ?? "Booking"}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.paidAt), "PPp")}
                    {payment.paidRef ? ` · Ref ${payment.paidRef}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    GHS {(payment.paidAmount ?? 0).toLocaleString()}
                  </span>
                  <ReceiptDialog payment={payment} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptDialog({ payment }: { payment: PaymentRow }) {
  const [open, setOpen] = useState(false);
  const request = payment.request;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="chunky-btn">
          <ReceiptIcon className="size-3.5" />
          View Receipt
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
            <Link to="/sgs/invoices/$paymentId/print" params={{ paymentId: payment.id }} target="_blank">
              <Printer className="size-4" />
              Print
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

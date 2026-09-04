import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { computeDays } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import { getPaymentInvoice } from "#/server/customer";
import { asset } from "#/lib/asset";

export const Route = createFileRoute("/invoices/$paymentId/print")({ component: PrintInvoicePage });

function PrintInvoicePage() {
  const { paymentId } = Route.useParams();
  const invoice = useQuery({
    queryKey: ["invoice", paymentId],
    queryFn: () => getPaymentInvoice({ data: { paymentId } }),
  });

  if (invoice.isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (invoice.isError || !invoice.data) {
    return <div className="flex min-h-screen items-center justify-center text-destructive">Invoice not found.</div>;
  }

  const payment = invoice.data;
  const request = payment.request;
  const client = request?.client;

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background px-6 py-10 print:p-0">
      <div className="mb-6 flex justify-end gap-2 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-10 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <img src={asset("logo.webp")} alt="" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-semibold">School of Graduate Studies</p>
              <p className="text-xs text-muted-foreground">Facilities Booking System</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Receipt</p>
            <p className="font-mono text-sm">{payment.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Billed to</p>
            <p className="mt-1 font-medium">{client?.organisation || client?.name}</p>
            {client?.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid on</p>
            <p className="mt-1 font-medium">{format(new Date(payment.paidAt), "PPp")}</p>
            {payment.paidRef && <p className="text-sm text-muted-foreground">Ref: {payment.paidRef}</p>}
          </div>
        </div>

        <table className="w-full border-y border-border text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2">Package</th>
              <th className="py-2">Period</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {request?.packages.map((pkg) => {
              const days = pkg.bookStart && pkg.bookEnd ? computeDays(pkg.bookStart, pkg.bookEnd) : 1;
              const unitPrice = pkg.bookItem.amount ?? 0;
              const facilityTotal = unitPrice * days;
              const addons = pkg.UbsAddon;
              const addonsTotal = addons.reduce((sum, a) => sum + (a.item.amount ?? 0) * days, 0);
              return (
                <tr key={pkg.id} className="align-top">
                  <td className="py-3">
                    <span className="font-medium">{pkg.bookItem.title}</span>
                    {addons.length > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        + {addons.map((a) => a.item.title).join(", ")}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {pkg.bookStart && <span className="block">{format(new Date(pkg.bookStart), "PPp")}</span>}
                    <span className="block text-xs">
                      {days} {days === 1 ? "day" : "days"}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums">
                    GHS {(facilityTotal + addonsTotal).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end py-6">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Invoice total</span>
              <span className="font-mono tabular-nums">GHS {(request?.chargeAmount ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total paid</span>
              <span className="font-mono tabular-nums">GHS {(payment.paidAmount ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Thank you for booking with us.
        </p>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { computeDays } from "@sgs/ui";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { useRequest } from "#/lib/queries/requests";
import type { RequestStatus } from "#/lib/admin-types";
import { asset } from "#/lib/asset";

export const Route = createFileRoute("/admin/requests/$requestId/print")({ component: PrintRequestInvoicePage });

const statusVariant: Record<RequestStatus, "outline" | "default" | "destructive" | "secondary"> = {
  PENDED: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  COMPLETED: "secondary",
};

function PrintRequestInvoicePage() {
  const { requestId } = Route.useParams();
  const { data, isLoading } = useRequest(requestId);
  const request = data?.request;

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!request) {
    return <div className="flex min-h-screen items-center justify-center text-destructive">Invoice not found.</div>;
  }

  const client = request.client;

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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
            <p className="font-mono text-sm">{request.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Billed to</p>
            <p className="mt-1 font-medium">{client?.organisation || client?.name || "—"}</p>
            {client?.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="mt-1">
              <Badge variant={statusVariant[request.status]}>{request.status}</Badge>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Submitted {format(new Date(request.createdAt), "PPp")}</p>
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
            {request.packages.map((pkg) => {
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
            <div className="flex justify-between font-semibold">
              <span>Invoice total</span>
              <span className="font-mono tabular-nums">GHS {(request.chargeAmount ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4 text-sm">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pay to</p>
          <p className="mt-1 text-[11px] font-bold text-gray-500">School of Graduate Studies,</p>
          <p className="text-[11px] font-bold text-gray-500">National Investment Bank,</p>
          <p className="text-[11px] font-bold text-gray-500">Account No. 1111000120801</p>
          <p className="text-[11px] font-bold text-gray-500">Cape Coast</p>
        </div>

        <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Thank you for booking with us.
        </p>
      </div>
    </div>
  );
}

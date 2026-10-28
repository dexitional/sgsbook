import { useState } from "react";
import { CalendarClock, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { computeRequestInvoice } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { toDateTimeLocal } from "#/lib/booking-intent";

export interface SchedulablePackage {
  id: string;
  bookStart: Date | string | null;
  bookEnd: Date | string | null;
  bookItem: { id?: string; title: string; amount: number | null };
  UbsAddon: { item: { title: string; amount: number | null } }[];
}

export interface RescheduleValues {
  reason: string;
  packages: { packageId: string; bookStart: string; bookEnd: string }[];
}

export interface ExtendValues {
  reason: string;
  packages: { packageId: string; bookEnd: string }[];
}

type Mode = "reschedule" | "extend";

const COPY: Record<
  Mode,
  { button: string; title: string; customer: string; staff: string; placeholder: string; save: string; done: string }
> = {
  reschedule: {
    button: "Reschedule",
    title: "Reschedule",
    customer:
      "Move this booking to new dates because of an emergency or something unforeseen. The new period must be free. Your total is recalculated on the new period only.",
    staff:
      "Move this booking to a new period. The total is recalculated on the new period only, and the customer is notified by email and SMS with your reason.",
    placeholder: "e.g. Venue flooded after heavy rain; moving to the following week",
    save: "Save new dates",
    done: "Booking rescheduled",
  },
  extend: {
    button: "Extend",
    title: "Extend",
    customer:
      "Need the facility for longer? Keep your start and pick a later end. The extra days are added to your invoice as a balance due.",
    staff:
      "Keep the start and push the end later. The extra days are added to the invoice as a balance due, and the customer is notified by email and SMS.",
    placeholder: "e.g. The conference runs an extra day",
    save: "Extend booking",
    done: "Booking extended",
  },
};

function money(value: number) {
  return `GHS ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function priceOf(packages: SchedulablePackage[], dates: Record<string, { bookStart: string; bookEnd: string }>) {
  return computeRequestInvoice(
    packages
      .filter((p) => (dates[p.id]?.bookStart || p.bookStart) && (dates[p.id]?.bookEnd || p.bookEnd))
      .map((p) => ({
        bookStart: dates[p.id]?.bookStart || p.bookStart!,
        bookEnd: dates[p.id]?.bookEnd || p.bookEnd!,
        facility: { id: p.id, title: p.bookItem.title, amount: p.bookItem.amount },
        addons: p.UbsAddon.map((a, i) => ({ id: String(i), title: a.item.title, amount: a.item.amount })),
      })),
  ).total;
}

// Change a pending/approved booking's dates. Two modes, deliberately kept
// apart because they're priced differently:
//   - "reschedule": move to a new period; the total becomes what the new
//     period costs (can go up or down).
//   - "extend": start is fixed, end moves later; the extra days are added
//     on top as a balance due.
// Shared by the customer and admin Bookings pages — only `onSubmit` differs
// (server fn vs. staff API). Only packages whose dates changed are sent.
export function ScheduleChangeDialog({
  mode,
  requestTitle,
  packages,
  chargeAmount,
  paidAmount,
  onReschedule,
  onExtend,
  byStaff = false,
}: {
  mode: Mode;
  requestTitle: string;
  packages: SchedulablePackage[];
  chargeAmount: number | null;
  paidAmount: number;
  onReschedule?: (values: RescheduleValues) => Promise<void>;
  onExtend?: (values: ExtendValues) => Promise<void>;
  byStaff?: boolean;
}) {
  const copy = COPY[mode];
  const extend = mode === "extend";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [dates, setDates] = useState<Record<string, { bookStart: string; bookEnd: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  const originalDates = (p: SchedulablePackage) => ({
    bookStart: p.bookStart ? toDateTimeLocal(p.bookStart) : "",
    bookEnd: p.bookEnd ? toDateTimeLocal(p.bookEnd) : "",
  });

  // Seeded on open (not in an effect on `packages`) so a background refetch
  // of the bookings list can't wipe dates the user is mid-way through editing.
  const onOpenChange = (next: boolean) => {
    if (next) {
      setReason("");
      setDates(Object.fromEntries(packages.map((p) => [p.id, originalDates(p)])));
    }
    setOpen(next);
  };

  const changed = packages.filter((p) => {
    const d = dates[p.id] as { bookStart: string; bookEnd: string } | undefined;
    if (!d?.bookStart || !d.bookEnd) return false;
    const original = originalDates(p);
    return d.bookStart !== original.bookStart || d.bookEnd !== original.bookEnd;
  });
  const invalid = changed.some((p) =>
    extend
      ? !p.bookEnd || new Date(dates[p.id].bookEnd) <= new Date(p.bookEnd)
      : new Date(dates[p.id].bookEnd) <= new Date(dates[p.id].bookStart),
  );

  // Mirrors the server (lib/reschedule.ts): an extension adds only the
  // changed packages' extra days; a reschedule re-prices everything on the
  // new period.
  const before = chargeAmount ?? priceOf(packages, {});
  const after =
    changed.length === 0 || invalid
      ? before
      : extend
        ? before + Math.max(0, priceOf(changed, dates) - priceOf(changed, {}))
        : priceOf(packages, dates);
  const balanceAfter = after - paidAmount;

  const submit = async () => {
    setSubmitting(true);
    try {
      if (extend) {
        await onExtend?.({
          reason: reason.trim(),
          packages: changed.map((p) => ({ packageId: p.id, bookEnd: new Date(dates[p.id].bookEnd).toISOString() })),
        });
      } else {
        await onReschedule?.({
          reason: reason.trim(),
          packages: changed.map((p) => ({
            packageId: p.id,
            bookStart: new Date(dates[p.id].bookStart).toISOString(),
            bookEnd: new Date(dates[p.id].bookEnd).toISOString(),
          })),
        });
      }
      toast.success(byStaff ? `${copy.done}. The customer has been notified.` : copy.done);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Couldn't ${copy.button.toLowerCase()} booking`);
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = extend ? CalendarPlus : CalendarClock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="status-btn">
          <Icon className="size-4" />
          {copy.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {copy.title}: {requestTitle}
          </DialogTitle>
          <DialogDescription>{byStaff ? copy.staff : copy.customer}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {packages.map((p) => (
            <div key={p.id} className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">{p.bookItem.title}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start{extend && " (stays the same)"}</Label>
                  <Input
                    type="datetime-local"
                    disabled={extend}
                    value={dates[p.id]?.bookStart ?? ""}
                    onChange={(e) => setDates((d) => ({ ...d, [p.id]: { ...d[p.id], bookStart: e.target.value } }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{extend ? "New end" : "End"}</Label>
                  <Input
                    type="datetime-local"
                    min={extend ? originalDates(p).bookEnd : undefined}
                    value={dates[p.id]?.bookEnd ?? ""}
                    onChange={(e) => setDates((d) => ({ ...d, [p.id]: { ...d[p.id], bookEnd: e.target.value } }))}
                  />
                </div>
              </div>
            </div>
          ))}

          {changed.length > 0 && !invalid && (
            <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
              {extend ? (
                <>
                  <Row label="Current total" value={money(before)} />
                  <Row label="Extension" value={`+ ${money(after - before)}`} />
                  <Row label="New total" value={money(after)} strong />
                </>
              ) : (
                <>
                  <Row label="Previous total" value={money(before)} muted />
                  <Row label="New total (new period only)" value={money(after)} strong />
                </>
              )}
              {paidAmount > 0 && <Row label="Paid so far" value={money(paidAmount)} />}
              {balanceAfter > 0 && <Row label="Balance due" value={money(balanceAfter)} strong />}
              {balanceAfter < 0 && <Row label="Credit" value={money(-balanceAfter)} strong />}
              {extend && after === before && (
                <p className="pt-1 text-xs text-muted-foreground">
                  No extra charge: the longer period still fits within the days already charged.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`${mode}-reason`}>Reason</Label>
            <Textarea
              id={`${mode}-reason`}
              rows={3}
              placeholder={copy.placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {invalid && (
            <p className="text-xs text-destructive">
              {extend
                ? "Each new end must be later than the current end."
                : "Each end date must be after its start date."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={submitting || changed.length === 0 || invalid || !reason.trim()}>
            {submitting ? "Saving…" : copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${strong ? "font-semibold" : ""} ${
        muted ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""
      }`}
    >
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

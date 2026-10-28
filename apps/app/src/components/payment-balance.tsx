import { paymentSummary } from "#/lib/balance";

type Payments = Parameters<typeof paymentSummary>[1];

// Bookings-table "Total" cell: the total, plus what's still owed (or in
// credit) once any payment exists. A balance appears after an extension or
// a reschedule to a longer period on an already-paid booking.
export function TotalWithBalance({ chargeAmount, payments }: { chargeAmount: number | null; payments: Payments }) {
  if (chargeAmount == null) return <>—</>;
  const { total, paid, balance } = paymentSummary(chargeAmount, payments);
  return (
    <div className="flex flex-col">
      <span>GHS {total.toLocaleString()}</span>
      {paid > 0 && balance > 0 && (
        <span className="text-xs font-medium text-destructive">Balance due GHS {balance.toLocaleString()}</span>
      )}
      {paid > 0 && balance < 0 && (
        <span className="text-xs text-muted-foreground">Credit GHS {(-balance).toLocaleString()}</span>
      )}
      {paid > 0 && balance === 0 && <span className="text-xs text-muted-foreground">Paid in full</span>}
    </div>
  );
}

// "Paid / Balance due" rows under an invoice total. Renders nothing until a
// payment exists, so unpaid invoices look exactly as before.
export function BalanceRows({
  chargeAmount,
  payments,
  className = "",
}: {
  chargeAmount: number | null;
  payments: Payments;
  className?: string;
}) {
  const { paid, balance } = paymentSummary(chargeAmount, payments);
  if (paid === 0) return null;
  return (
    <div className={`space-y-1 text-sm ${className}`}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Paid</span>
        <span className="tabular-nums">GHS {paid.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between font-semibold">
        <span>{balance < 0 ? "Credit" : "Balance due"}</span>
        <span className="tabular-nums">GHS {Math.abs(balance).toFixed(2)}</span>
      </div>
    </div>
  );
}

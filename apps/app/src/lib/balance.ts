// Paid vs. owed for a request. Extensions (and reschedules to a longer
// period) can raise chargeAmount after a payment has already been made, so
// "paid" no longer implies "settled". Payments with status false are
// voided and don't count.
export function paymentSummary(
  chargeAmount: number | null,
  payments: { paidAmount: number | null; status?: boolean }[] | undefined,
) {
  const total = chargeAmount ?? 0;
  const paid = (payments ?? []).filter((p) => p.status !== false).reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
  return { total, paid, balance: total - paid };
}

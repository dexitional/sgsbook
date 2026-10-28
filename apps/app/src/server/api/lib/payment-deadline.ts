// Approved requests must be paid within PAYMENT_WINDOW_HOURS or they're
// declined automatically, freeing the slot for someone else. Approval sets
// UbsRequest.paymentDueAt; this sweep rejects anything past it with no
// active payment and notifies the customer like any other rejection.
//
// Runs two ways so it holds even without an external scheduler:
//   - an in-process interval, started once per server process
//     (startPaymentDeadlineSweeper, called from server/api/app.ts), and
//   - sweepUnpaidApprovalsThrottled() on the request-list reads, so the
//     lists staff and customers see are never stale by more than a minute
//     even right after a restart.
import { prisma } from "@sgs/db";
import { notifyInclude, notifyRequestRejected } from "./request-notifications.js";

export const PAYMENT_WINDOW_HOURS = 24;
export const UNPAID_REJECT_REASON = `Unable to fulfil payment within ${PAYMENT_WINDOW_HOURS} hours of approval.`;

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const THROTTLE_MS = 60 * 1000;

export function paymentDueFrom(approvedAt: Date) {
  return new Date(approvedAt.getTime() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);
}

export async function sweepUnpaidApprovals() {
  const overdue = await prisma.ubsRequest.findMany({
    where: {
      status: "APPROVED",
      paymentDueAt: { lt: new Date() },
      payment: { none: { status: true } },
    },
    select: { id: true },
  });

  for (const { id } of overdue) {
    // Conditional update so a payment recorded (or a status change made)
    // between the findMany above and here isn't overwritten — count 0
    // means someone else already moved it on.
    const { count } = await prisma.ubsRequest.updateMany({
      where: { id, status: "APPROVED", payment: { none: { status: true } } },
      data: { status: "REJECTED", rejectReason: UNPAID_REJECT_REASON },
    });
    if (count === 0) continue;

    const request = await prisma.ubsRequest.findUnique({ where: { id }, include: notifyInclude });
    if (request) notifyRequestRejected(request, UNPAID_REJECT_REASON);
  }

  return overdue.length;
}

let lastSweepAt = 0;

export async function sweepUnpaidApprovalsThrottled() {
  if (Date.now() - lastSweepAt < THROTTLE_MS) return;
  lastSweepAt = Date.now();
  await sweepUnpaidApprovals().catch((err) => console.error("Unpaid-approval sweep failed:", err));
}

// globalThis guard: Vite dev HMR re-evaluates this module on edit, which
// would otherwise stack a new interval on every save.
const globalKey = "__sgsPaymentDeadlineSweeper";

export function startPaymentDeadlineSweeper() {
  const g = globalThis as typeof globalThis & { [globalKey]?: ReturnType<typeof setInterval> };
  if (g[globalKey]) return;
  g[globalKey] = setInterval(() => void sweepUnpaidApprovalsThrottled(), SWEEP_INTERVAL_MS);
  // Don't keep a process alive just for this timer (e.g. during builds).
  g[globalKey].unref?.();
}

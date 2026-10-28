// Changing a submitted booking's dates after the fact — shared by the staff
// endpoints (PATCH /requests/:id/schedule and /extend) and the customer
// server functions (server/customer.ts) so both sides enforce the same
// rules, price the same way, and leave the same audit trail.
//
// Two distinct operations:
//   - Reschedule (emergencies, unforeseen events): the package moves to a
//     new period and the request is re-priced on the new period only — the
//     old period's charge is dropped entirely, so the total can go up or
//     down.
//   - Extension: the start stays put and the end moves later. The extra
//     days are added on top of the existing charge and show as a balance
//     due. Priced as (new full period) − (old period) of the extended
//     packages rather than billing the added hours on their own, so the
//     per-package invoice lines (computed from each package's dates) keep
//     adding up to the total.
import { prisma } from "@sgs/db";
import { computeRequestInvoice } from "./pricing.js";
import { assertAvailable } from "./availability.js";
import { notifyInclude, notifyScheduleChanged } from "./request-notifications.js";
import { AppError } from "../middleware/error-handler.js";

export type ScheduleChangeType = "RESCHEDULE" | "EXTENSION";

export interface RescheduleInput {
  reason: string;
  packages: { packageId: string; bookStart: Date; bookEnd: Date }[];
}

export interface ExtendInput {
  reason: string;
  packages: { packageId: string; bookEnd: Date }[];
}

export interface RescheduleActor {
  changedBy: string;
  byStaff: boolean;
  // Set for customers: the request must belong to this client.
  clientId?: string;
}

async function loadChangeableRequest(requestId: string, actor: RescheduleActor, verb: string) {
  const request = await prisma.ubsRequest.findUnique({ where: { id: requestId }, include: notifyInclude });
  if (!request || (actor.clientId && request.clientId !== actor.clientId)) {
    throw new AppError("Request not found.", 404);
  }
  if (request.status !== "PENDED" && request.status !== "APPROVED") {
    throw new AppError(`Only pending or approved bookings can be ${verb}.`, 409);
  }
  return request;
}

type ChangeableRequest = Awaited<ReturnType<typeof loadChangeableRequest>>;

async function applyScheduleChange(
  request: ChangeableRequest,
  type: ScheduleChangeType,
  changes: { packageId: string; bookStart: Date; bookEnd: Date }[],
  reason: string,
  actor: RescheduleActor,
) {
  const packageById = new Map(request.packages.map((p) => [p.id, p]));

  await assertAvailable(
    changes.map((change) => ({
      itemId: packageById.get(change.packageId)!.itemId,
      bookStart: change.bookStart,
      bookEnd: change.bookEnd,
    })),
    { excludeRequestId: request.id },
  );

  const changeById = new Map(changes.map((c) => [c.packageId, c]));
  const priceOf = (pkgs: typeof request.packages, useNewDates: boolean) =>
    computeRequestInvoice(
      pkgs.map((pkg) => {
        const change = useNewDates ? changeById.get(pkg.id) : undefined;
        return {
          bookStart: change?.bookStart ?? pkg.bookStart ?? new Date(),
          bookEnd: change?.bookEnd ?? pkg.bookEnd ?? new Date(),
          facility: { id: pkg.bookItem.id, title: pkg.bookItem.title, amount: pkg.bookItem.amount },
          addons: pkg.UbsAddon.map((a) => ({ id: a.item.id, title: a.item.title, amount: a.item.amount })),
        };
      }),
    ).total;

  const chargeBefore = request.chargeAmount ?? 0;
  let chargeAfter: number;
  if (type === "EXTENSION") {
    // Strictly additive: only the extended packages' extra days are priced
    // and added to what was already charged, so a price change on the item
    // since booking can't silently re-price the original period.
    const extended = request.packages.filter((p) => changeById.has(p.id));
    chargeAfter = chargeBefore + Math.max(0, priceOf(extended, true) - priceOf(extended, false));
  } else {
    // Reschedule: the whole request is priced on its new period only.
    chargeAfter = priceOf(request.packages, true);
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      const previous = packageById.get(change.packageId)!;
      await tx.ubsPackage.update({
        where: { id: change.packageId },
        data: { bookStart: change.bookStart, bookEnd: change.bookEnd },
      });
      await tx.ubsReschedule.create({
        data: {
          requestId: request.id,
          packageId: change.packageId,
          type,
          oldStart: previous.bookStart,
          oldEnd: previous.bookEnd,
          newStart: change.bookStart,
          newEnd: change.bookEnd,
          chargeBefore,
          chargeAfter,
          reason,
          changedBy: actor.changedBy,
        },
      });
    }
    return tx.ubsRequest.update({
      where: { id: request.id },
      data: { chargeAmount: chargeAfter },
      include: notifyInclude,
    });
  });

  notifyScheduleChanged(updated, { type, reason, byStaff: actor.byStaff, chargeBefore });
  return updated;
}

export async function rescheduleRequest(requestId: string, input: RescheduleInput, actor: RescheduleActor) {
  const request = await loadChangeableRequest(requestId, actor, "rescheduled");
  const packageIds = new Set(request.packages.map((p) => p.id));
  const now = Date.now();

  for (const change of input.packages) {
    if (!packageIds.has(change.packageId)) throw new AppError("Package not found on this request.", 404);
    if (!actor.byStaff && change.bookStart.getTime() < now) {
      throw new AppError("The new start date can't be in the past.", 422);
    }
  }

  return applyScheduleChange(request, "RESCHEDULE", input.packages, input.reason, actor);
}

export async function extendRequest(requestId: string, input: ExtendInput, actor: RescheduleActor) {
  const request = await loadChangeableRequest(requestId, actor, "extended");
  const packageById = new Map(request.packages.map((p) => [p.id, p]));

  const changes = input.packages.map((change) => {
    const pkg = packageById.get(change.packageId);
    if (!pkg) throw new AppError("Package not found on this request.", 404);
    if (!pkg.bookStart || !pkg.bookEnd) throw new AppError("This package has no booked period to extend.", 409);
    if (change.bookEnd.getTime() <= pkg.bookEnd.getTime()) {
      throw new AppError(`The new end for ${pkg.bookItem.title} must be later than the current end.`, 422);
    }
    // Start is always the existing one — an extension never moves it.
    return { packageId: pkg.id, bookStart: pkg.bookStart, bookEnd: change.bookEnd };
  });

  return applyScheduleChange(request, "EXTENSION", changes, input.reason, actor);
}

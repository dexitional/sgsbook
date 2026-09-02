// Facilities and addons are charged per unit price *per day*. A booking
// spanning less than a day still incurs a full day's charge (minimum 1);
// anything longer is rounded up to the number of calendar days it touches.
//
// Mirrors apps/api/src/lib/pricing.ts — kept as a separate copy rather than
// a cross-package import since apps/api is a Node/Prisma backend and this
// needs to be a zero-dependency pure module usable from the browser in both
// apps/admin and apps/web.

export interface PricedItem {
  id: string;
  title: string;
  amount: number | null;
}

export interface PackageInput {
  bookStart: Date | string;
  bookEnd: Date | string;
  facility: PricedItem;
  addons: PricedItem[];
}

export interface AddonLineItem {
  id: string;
  title: string;
  unitPrice: number;
  lineTotal: number;
}

export interface PackageLineItem {
  facilityId: string;
  facilityTitle: string;
  unitPrice: number;
  days: number;
  bookStart: string;
  bookEnd: string;
  facilityTotal: number;
  addons: AddonLineItem[];
  packageTotal: number;
}

export interface RequestInvoice {
  packages: PackageLineItem[];
  total: number;
}

export function computeDays(bookStart: Date | string, bookEnd: Date | string): number {
  const start = new Date(bookStart).getTime();
  const end = new Date(bookEnd).getTime();
  const ms = Math.max(0, end - start);
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function computePackageLineItem(pkg: PackageInput): PackageLineItem {
  const days = computeDays(pkg.bookStart, pkg.bookEnd);
  const unitPrice = pkg.facility.amount ?? 0;
  const facilityTotal = unitPrice * days;

  const addons = pkg.addons.map((addon) => {
    const addonUnitPrice = addon.amount ?? 0;
    return {
      id: addon.id,
      title: addon.title,
      unitPrice: addonUnitPrice,
      lineTotal: addonUnitPrice * days,
    };
  });

  const packageTotal = facilityTotal + addons.reduce((sum, a) => sum + a.lineTotal, 0);

  return {
    facilityId: pkg.facility.id,
    facilityTitle: pkg.facility.title,
    unitPrice,
    days,
    bookStart: new Date(pkg.bookStart).toISOString(),
    bookEnd: new Date(pkg.bookEnd).toISOString(),
    facilityTotal,
    addons,
    packageTotal,
  };
}

export function computeRequestInvoice(packages: PackageInput[]): RequestInvoice {
  const lineItems = packages.map(computePackageLineItem);
  const total = lineItems.reduce((sum, p) => sum + p.packageTotal, 0);
  return { packages: lineItems, total };
}

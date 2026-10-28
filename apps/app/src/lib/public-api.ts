const API_URL = "/api";

export interface PublicFacility {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  amount: number | null;
  intamount: number | null;
  extamount: number | null;
  itemType: "FACILITY" | "ADDON";
}

export interface PublicBooking {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: "FACILITY" | "ADDON";
  bookStart: string;
  bookEnd: string;
  status: "APPROVED" | "COMPLETED";
}

// Admin-blocked window (emergency/maintenance). itemId null = every facility.
export interface PublicBlockedDate {
  id: string;
  itemId: string | null;
  itemTitle: string | null;
  blockStart: string;
  blockEnd: string;
  reason: string;
}

export interface PublicCalendar {
  bookings: PublicBooking[];
  blocked: PublicBlockedDate[];
}

export async function fetchPublicFacilities(): Promise<PublicFacility[]> {
  const res = await fetch(`${API_URL}/public/items`);
  if (!res.ok) throw new Error("Failed to load facilities");
  const data = await res.json();
  return data.items;
}

export async function fetchPublicCalendar(from: Date, to: Date): Promise<PublicCalendar> {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const res = await fetch(`${API_URL}/public/calendar?${params}`);
  if (!res.ok) throw new Error("Failed to load calendar");
  const data = await res.json();
  return { bookings: data.bookings, blocked: data.blocked ?? [] };
}

export function blockAppliesTo(block: PublicBlockedDate, itemId: string) {
  return block.itemId == null || block.itemId === itemId;
}

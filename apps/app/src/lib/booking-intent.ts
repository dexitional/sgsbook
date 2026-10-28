// Carries a "book this" choice from the public calendar across the Google
// sign-in round trip (and onboarding, for first-time customers), so the
// customer lands in a booking dialog already filled in with what they
// clicked. Also carries a one-shot "just signed in" flag that opens the
// quick-booking dialog on arrival.
//
// localStorage rather than URL params: the OAuth callback URL is fixed
// (/onboarding) and onboarding then bounces to /dashboard, so a query
// param wouldn't survive. Every access is guarded — storage can throw in
// private windows or with site data blocked, and the flow must still work
// (just without the prefill).
import { format } from "date-fns";

export interface BookingIntent {
  itemId?: string;
  bookStart?: string; // ISO
  bookEnd?: string; // ISO
}

const INTENT_KEY = "sgs-booking-intent";
const QUICK_BOOK_KEY = "sgs-quick-book";
// Long enough to cover sign-in + onboarding, short enough that a stale
// click from days ago doesn't resurface.
const TTL_MS = 60 * 60 * 1000;

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    // Storage unavailable — the dialog just opens without a prefill.
  }
}

function take<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    localStorage.removeItem(key);
    const parsed = JSON.parse(raw) as { value: T; savedAt: number };
    return Date.now() - parsed.savedAt < TTL_MS ? parsed.value : null;
  } catch {
    return null;
  }
}

export function saveBookingIntent(intent: BookingIntent) {
  write(INTENT_KEY, intent);
}

export function takeBookingIntent(): BookingIntent | null {
  return take<BookingIntent>(INTENT_KEY);
}

export function markQuickBookOnSignIn() {
  write(QUICK_BOOK_KEY, true);
}

export function takeQuickBookOnSignIn(): boolean {
  return take<boolean>(QUICK_BOOK_KEY) === true;
}

// <input type="datetime-local"> wants local "yyyy-MM-ddTHH:mm", not ISO.
export function toDateTimeLocal(value: Date | string) {
  return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
}

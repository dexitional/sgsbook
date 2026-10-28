import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { endOfDay, format, setHours, startOfDay } from "date-fns";
import { Ban, CalendarPlus, LogIn } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { authClient } from "#/lib/auth-client";
import { saveBookingIntent, toDateTimeLocal } from "#/lib/booking-intent";
import { blockAppliesTo, fetchPublicCalendar, fetchPublicFacilities } from "#/lib/public-api";

// Default booking window for a clicked day — a working day, which the
// customer can still adjust before continuing.
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 17;

// Opened by clicking a day on the public calendars. Captures facility +
// period, then hands off to sign-in (or straight to the customer area when
// already signed in), where the quick-booking dialog opens prefilled.
export function BookDateDialog({
  day,
  initialItemId,
  onOpenChange,
}: {
  day: Date | null;
  initialItemId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [itemId, setItemId] = useState("");
  const [bookStart, setBookStart] = useState("");
  const [bookEnd, setBookEnd] = useState("");

  useEffect(() => {
    if (!day) return;
    setItemId(initialItemId ?? "");
    setBookStart(toDateTimeLocal(setHours(startOfDay(day), DEFAULT_START_HOUR)));
    setBookEnd(toDateTimeLocal(setHours(startOfDay(day), DEFAULT_END_HOUR)));
  }, [day, initialItemId]);

  const facilities = useQuery({ queryKey: ["public-facilities"], queryFn: fetchPublicFacilities, enabled: !!day });
  const dayCalendar = useQuery({
    queryKey: ["public-calendar-day", day?.toDateString()],
    queryFn: () => fetchPublicCalendar(startOfDay(day!), endOfDay(day!)),
    enabled: !!day,
  });

  const facilityList = facilities.data?.filter((f) => f.itemType === "FACILITY") ?? [];
  const dayBookings = (dayCalendar.data?.bookings ?? []).filter((b) => b.status === "APPROVED");
  const dayBlocks = dayCalendar.data?.blocked ?? [];

  const selectedBookings = dayBookings.filter((b) => b.itemId === itemId);
  const selectedBlocks = itemId ? dayBlocks.filter((b) => blockAppliesTo(b, itemId)) : [];
  const validPeriod = bookStart && bookEnd && new Date(bookEnd) > new Date(bookStart);

  const onContinue = () => {
    saveBookingIntent({
      itemId,
      bookStart: new Date(bookStart).toISOString(),
      bookEnd: new Date(bookEnd).toISOString(),
    });
    onOpenChange(false);
    navigate({ to: session?.user ? "/requests" : "/signin" });
  };

  return (
    <Dialog open={day != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="size-4.5 text-primary" />
            Book {day ? format(day, "EEEE, MMM d") : ""}
          </DialogTitle>
          <DialogDescription>
            Pick a facility and confirm the period. We'll carry it straight into your booking request
            {session?.user ? "." : " after you sign in."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Facility</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={facilities.isLoading ? "Loading…" : "Select a facility"} />
              </SelectTrigger>
              <SelectContent>
                {facilityList.map((f) => {
                  const booked = dayBookings.some((b) => b.itemId === f.id);
                  const blocked = dayBlocks.some((b) => blockAppliesTo(b, f.id));
                  return (
                    <SelectItem key={f.id} value={f.id}>
                      {f.title}
                      {blocked ? " — unavailable" : booked ? " — partly booked" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedBlocks.map((b) => (
            <p
              key={b.id}
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              <Ban className="mt-0.5 size-3.5 shrink-0" />
              Unavailable {format(new Date(b.blockStart), "MMM d, p")} – {format(new Date(b.blockEnd), "MMM d, p")}:{" "}
              {b.reason}
            </p>
          ))}
          {selectedBookings.length > 0 && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Already booked that day</p>
              {selectedBookings.map((b) => (
                <p key={b.id}>
                  {format(new Date(b.bookStart), "MMM d, p")} – {format(new Date(b.bookEnd), "MMM d, p")}
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="book-date-start">Start</Label>
              <Input
                id="book-date-start"
                type="datetime-local"
                value={bookStart}
                onChange={(e) => setBookStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="book-date-end">End</Label>
              <Input
                id="book-date-end"
                type="datetime-local"
                value={bookEnd}
                onChange={(e) => setBookEnd(e.target.value)}
              />
            </div>
          </div>
          {bookStart && bookEnd && !validPeriod && (
            <p className="text-xs text-destructive">The end must be after the start.</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onContinue} disabled={!itemId || !validPeriod}>
            {session?.user ? <CalendarPlus className="size-4" /> : <LogIn className="size-4" />}
            {session?.user ? "Continue to booking" : "Sign in to book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { fetchPublicCalendar, fetchPublicFacilities, type PublicBooking } from "#/lib/public-api";
import { facilityColorVar, paleTint } from "#/lib/facility-colors";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cellBackground(colorVars: string[]) {
  if (colorVars.length === 0) return undefined;
  // Always return a background-image (not a bare color-mix(...), which is a
  // <color> value and gets silently dropped when assigned to
  // background-image) — a same-color-to-itself gradient just renders solid.
  if (colorVars.length === 1) return `linear-gradient(${paleTint(colorVars[0])}, ${paleTint(colorVars[0])})`;
  const step = 100 / colorVars.length;
  const stops = colorVars.map((c, i) => `${paleTint(c)} ${i * step}% ${(i + 1) * step}%`).join(", ");
  return `linear-gradient(135deg, ${stops})`;
}

function bookingCoversDay(booking: PublicBooking, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return new Date(booking.bookStart) < dayEnd && new Date(booking.bookEnd) > dayStart;
}

export function AvailabilityCalendarDialog() {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());

  const range = useMemo(() => {
    // Pad to full weeks so the grid always starts on a Sunday and ends on a
    // Saturday, same as the day cells actually rendered below.
    const from = startOfWeek(startOfMonth(month));
    const to = endOfWeek(endOfMonth(month));
    return { from, to };
  }, [month]);

  const facilities = useQuery({ queryKey: ["public-facilities"], queryFn: fetchPublicFacilities, enabled: open });
  const bookings = useQuery({
    queryKey: ["public-calendar-month", range.from.toDateString()],
    queryFn: () => fetchPublicCalendar(range.from, range.to),
    enabled: open,
  });

  const facilityList = facilities.data?.filter((f) => f.itemType === "FACILITY") ?? [];
  const colorByFacilityId = new Map(facilityList.map((f, i) => [f.id, facilityColorVar(i)]));

  // Only APPROVED bookings show a color here — COMPLETED ones (already in
  // the past) are excluded even though the underlying endpoint also returns
  // them for the weekly strip elsewhere on the landing page.
  const bookedDays = (bookings.data ?? []).filter((b) => b.status === "APPROVED");
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  const isLoading = facilities.isLoading || bookings.isLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarSearch className="size-4" />
          Check Availability
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Facility availability</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-semibold">{format(month, "MMMM yyyy")}</p>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1 font-medium">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, month);
            const dayBookings = inMonth ? bookedDays.filter((b) => bookingCoversDay(b, day)) : [];
            // One entry per distinct facility — a facility could theoretically
            // have more than one overlapping package, but they'd show the
            // same color anyway, so just keep the first for the tooltip.
            const dayFacilityBookings = Array.from(
              new Map(dayBookings.map((b) => [b.itemId, b])).values(),
            );
            const colors = dayFacilityBookings
              .map((b) => colorByFacilityId.get(b.itemId))
              .filter((c): c is string => c != null);
            const background = cellBackground(colors);

            const cell = (
              <div
                style={background ? { backgroundImage: background } : undefined}
                className={`flex aspect-square items-center justify-center rounded-md text-sm ${
                  !inMonth ? "text-muted-foreground/30" : "font-medium text-foreground"
                } ${isToday(day) ? "ring-1 ring-primary" : ""}`}
              >
                {format(day, "d")}
              </div>
            );

            if (dayFacilityBookings.length === 0) {
              return <div key={day.toISOString()}>{cell}</div>;
            }

            return (
              <Tooltip key={day.toISOString()}>
                <TooltipTrigger asChild>{cell}</TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-0.5">
                    {dayFacilityBookings.map((b) => (
                      <p key={b.itemId}>
                        <span className="font-medium">{b.itemTitle}:</span>{" "}
                        {format(new Date(b.bookStart), "MMM d, p")} – {format(new Date(b.bookEnd), "MMM d, p")}
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Facilities</p>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : facilityList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No facilities yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {facilityList.map((f) => (
                <div key={f.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: paleTint(colorByFacilityId.get(f.id)!) }}
                  />
                  <span className="truncate">{f.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

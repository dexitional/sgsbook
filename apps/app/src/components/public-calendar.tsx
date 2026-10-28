import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfDay, format, isSameDay, startOfDay } from "date-fns";
import { Ban, CalendarDays, Plus } from "lucide-react";
import { Skeleton } from "#/components/ui/skeleton";
import { fetchPublicCalendar, fetchPublicFacilities } from "#/lib/public-api";
import { facilityColorVar, paleTint } from "#/lib/facility-colors";
import { AvailabilityCalendarDialog } from "#/components/availability-calendar-dialog";
import { BookDateDialog } from "#/components/book-date-dialog";

const DAYS_AHEAD = 7;

export function PublicCalendar() {
  const [bookDay, setBookDay] = useState<Date | null>(null);
  const range = useMemo(() => {
    const from = startOfDay(new Date());
    const to = addDays(from, DAYS_AHEAD);
    return { from, to };
  }, []);

  const facilities = useQuery({ queryKey: ["public-facilities"], queryFn: fetchPublicFacilities });
  const { data, isLoading } = useQuery({
    queryKey: ["public-calendar", range.from.toDateString()],
    queryFn: () => fetchPublicCalendar(range.from, range.to),
  });

  // Same facility -> color assignment as the availability calendar dialog,
  // so a facility reads the same color in both places.
  const facilityList = facilities.data?.filter((f) => f.itemType === "FACILITY") ?? [];
  const colorByFacilityId = new Map(facilityList.map((f, i) => [f.id, facilityColorVar(i)]));

  // Only approved bookings are confirmed enough to show publicly here.
  const bookings = (data?.bookings ?? []).filter((b) => b.status === "APPROVED");
  const blocked = data?.blocked ?? [];
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(range.from, i));

  return (
    <section id="calendar" className="border-y border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="size-4.5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">This week's bookings</h2>
              <p className="text-sm text-muted-foreground">
                Confirmed reservations for the next {DAYS_AHEAD} days — tap a day to book it.
              </p>
            </div>
          </div>
          <AvailabilityCalendarDialog />
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {days.map((d) => (
              <Skeleton key={d.toISOString()} className="h-64 w-48 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {days.map((day) => {
              const dayBookings = bookings.filter((b) => isSameDay(new Date(b.bookStart), day));
              const dayBlocks = blocked.filter(
                (b) => new Date(b.blockStart) < endOfDay(day) && new Date(b.blockEnd) > startOfDay(day),
              );
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => setBookDay(day)}
                  aria-label={`Book ${format(day, "EEEE, MMMM d")}`}
                  className="group w-48 shrink-0 rounded-xl border border-border bg-card text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</p>
                      <p className="text-sm font-semibold">{format(day, "MMM d")}</p>
                    </div>
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary opacity-60 transition-opacity group-hover:opacity-100">
                      <Plus className="size-3.5" />
                    </span>
                  </div>
                  <div className="min-h-40 space-y-1.5 p-2">
                    {dayBlocks.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive"
                      >
                        <p className="flex items-center gap-1 truncate font-medium">
                          <Ban className="size-3 shrink-0" />
                          {b.itemTitle ?? "All facilities"}
                        </p>
                        <p className="truncate opacity-80">Unavailable · {b.reason}</p>
                      </div>
                    ))}
                    {dayBookings.length === 0 && dayBlocks.length === 0 ? (
                      <p className="px-1 py-4 text-center text-xs text-muted-foreground">Open — tap to book</p>
                    ) : (
                      dayBookings.map((b) => {
                        const facilityColor = colorByFacilityId.get(b.itemId);
                        return (
                          <div
                            key={b.id}
                            style={
                              facilityColor
                                ? {
                                    backgroundColor: paleTint(facilityColor),
                                    borderColor: `color-mix(in oklab, ${facilityColor} 45%, transparent)`,
                                  }
                                : undefined
                            }
                            className={`rounded-md border px-2 py-1.5 text-xs ${
                              facilityColor ? "text-foreground" : "border-accent/40 bg-accent text-accent-foreground"
                            }`}
                          >
                            <p className="truncate font-medium">{b.itemTitle}</p>
                            <p className="opacity-80">
                              {format(new Date(b.bookStart), "p")}–{format(new Date(b.bookEnd), "p")}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BookDateDialog day={bookDay} onOpenChange={(open) => !open && setBookDay(null)} />
    </section>
  );
}

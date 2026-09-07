import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Skeleton } from "#/components/ui/skeleton";
import { fetchPublicCalendar, fetchPublicFacilities } from "#/lib/public-api";
import { facilityColorVar, paleTint } from "#/lib/facility-colors";
import { AvailabilityCalendarDialog } from "#/components/availability-calendar-dialog";

const DAYS_AHEAD = 7;

export function PublicCalendar() {
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
  const bookings = (data ?? []).filter((b) => b.status === "APPROVED");
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
                Confirmed reservations for the next {DAYS_AHEAD} days — no personal details shown.
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
              return (
                <div
                  key={day.toISOString()}
                  className="w-48 shrink-0 rounded-xl border border-border bg-card"
                >
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</p>
                    <p className="text-sm font-semibold">{format(day, "MMM d")}</p>
                  </div>
                  <div className="min-h-40 space-y-1.5 p-2">
                    {dayBookings.length === 0 ? (
                      <p className="px-1 py-4 text-center text-xs text-muted-foreground">Open</p>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

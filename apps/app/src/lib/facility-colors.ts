// Shared per-facility color assignment, used by both the availability
// calendar dialog and the landing page's weekly bookings strip so a given
// facility always reads the same color in both places. Assigned by position
// in the full facility list (sorted the same way the API returns it), not
// by anything content-dependent, so it's stable across renders/months.
export function facilityColorVar(index: number): string {
  return `var(--chart-${(index % 5) + 1})`;
}

export function paleTint(colorVar: string): string {
  return `color-mix(in oklab, ${colorVar} 22%, var(--background))`;
}

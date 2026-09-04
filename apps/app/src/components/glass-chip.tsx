import type { ReactNode } from "react";

// A blurred glass label floating in front of an offset gradient panel —
// ported from a styled-components button reference and adapted as a
// static chip for table status/type badges. `color` drives the gradient
// (pass a theme token, e.g. var(--primary) or var(--accent)).
export function GlassChip({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className="glass-chip">
      <span
        className="glass-chip__bg"
        style={{ backgroundImage: `linear-gradient(147deg, ${color}, color-mix(in oklab, ${color} 55%, var(--background)))` }}
      />
      <span className="glass-chip__text">{children}</span>
    </span>
  );
}

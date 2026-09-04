import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Send } from "lucide-react";

const LABEL = "Start a booking";

// Per-letter animation delay, read by the CSS as `calc(var(--i) * ...)`.
type LetterStyle = CSSProperties & { "--i"?: number };

export function StartBookingButton() {
  return (
    <Link to="/sgs/signup" className="cta-button">
      <span className="cta-button__outline" aria-hidden />
      <span className="cta-button__icon">
        <Send />
      </span>
      <span className="cta-button__label">
        {Array.from(LABEL).map((char, i) => (
          <span key={i} style={{ "--i": i } as LetterStyle}>
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
    </Link>
  );
}

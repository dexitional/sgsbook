import type { ComponentType, ReactNode } from "react";
import { Lightbulb } from "lucide-react";

export interface GuideSection {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  intro?: ReactNode;
  steps?: ReactNode[];
  tip?: ReactNode;
  body?: ReactNode;
}

// Shared layout for the visitor/customer guide (/guide) and the staff guide
// (/admin/guide): a sticky table of contents beside numbered sections.
export function UserGuide({
  kicker,
  title,
  subtitle,
  sections,
}: {
  kicker: string;
  title: string;
  subtitle: ReactNode;
  sections: GuideSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{kicker}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Guide contents" className="hidden lg:block">
          <ol className="sticky top-24 space-y-1 border-l border-border text-sm">
            {sections.map((section, i) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="-ml-px block border-l border-transparent py-1 pl-3 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {i + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-6">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <section.icon className="size-4.5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">
                  <span className="text-muted-foreground">{i + 1}.</span> {section.title}
                </h2>
              </div>

              {section.intro && <p className="mt-3 text-sm text-muted-foreground">{section.intro}</p>}

              {section.steps && (
                <ol className="mt-4 space-y-2.5">
                  {section.steps.map((step, j) => (
                    <li key={j} className="flex gap-3 text-sm">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
                        {j + 1}
                      </span>
                      <span className="min-w-0">{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {section.body && <div className="mt-4 text-sm">{section.body}</div>}

              {section.tip && (
                <p className="mt-4 flex gap-2 rounded-lg bg-accent/60 px-3 py-2.5 text-sm text-accent-foreground">
                  <Lightbulb className="mt-0.5 size-4 shrink-0" />
                  <span>{section.tip}</span>
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// Status meanings — used by both guides so the wording never drifts.
export function StatusTable({ audience }: { audience: "customer" | "staff" }) {
  const rows = [
    {
      status: "PENDED",
      meaning:
        audience === "customer"
          ? "Submitted and waiting for the SGS team to review. You can still reschedule it."
          : "Waiting for review. Approve or reject it, or reschedule it if the dates need to change.",
    },
    {
      status: "APPROVED",
      meaning:
        audience === "customer"
          ? "Accepted. An invoice is emailed to you, and payment is due within 24 hours or the request is declined."
          : "Accepted, and the 24-hour payment clock is running. Record the payment once it's received.",
    },
    {
      status: "REJECTED",
      meaning:
        audience === "customer"
          ? "Declined. The reason is sent by email and SMS and shown in your Bookings table."
          : "Declined by staff (with a reason) or automatically for non-payment.",
    },
    {
      status: "COMPLETED",
      meaning: "The booking has taken place and is closed.",
    },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">What it means</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.status} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-xs font-semibold">{row.status}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

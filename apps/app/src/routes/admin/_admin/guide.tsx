import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ban,
  CalendarClock,
  CalendarRange,
  Clock,
  Command,
  KeyRound,
  Package,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { StatusTable, UserGuide, type GuideSection } from "#/components/user-guide";

export const Route = createFileRoute("/admin/_admin/guide")({ component: AdminGuidePage });

const linkClass = "font-medium text-primary hover:underline";

const sections: GuideSection[] = [
  {
    id: "roles",
    title: "Roles and what each can do",
    icon: KeyRound,
    body: (
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Can do</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-t border-border align-top">
              <td className="px-3 py-2 font-medium text-foreground">Administrator</td>
              <td className="px-3 py-2">
                Everything. That includes payments, facilities and add-ons, blocked dates, users, and AI insights.
              </td>
            </tr>
            <tr className="border-t border-border align-top">
              <td className="px-3 py-2 font-medium text-foreground">Facilitator</td>
              <td className="px-3 py-2">
                Create, approve, reject and reschedule bookings, and manage clients.
              </td>
            </tr>
            <tr className="border-t border-border align-top">
              <td className="px-3 py-2 font-medium text-foreground">Decorator</td>
              <td className="px-3 py-2">View bookings and blocked dates. Receives facility-prep alerts.</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
    tip: "Every active staff member with a role gets an email and SMS to prepare the facility when a booking is approved or an approved booking is rescheduled.",
  },
  {
    id: "review",
    title: "Review booking requests",
    icon: ShieldCheck,
    steps: [
      <>
        Open <Link to="/admin/requests" className={linkClass}>Bookings</Link> and use the <strong>Pending</strong>{" "}
        tab to see requests waiting for review.
      </>,
      <>
        <strong>Approve</strong>: the system checks the dates again against other approved bookings and blocked dates.
        If they're still free, the customer gets the invoice by email and SMS, and the 24-hour payment clock starts.
      </>,
      <>
        <strong>Reject</strong>: you must enter a reason. The customer gets it by email and SMS, and it's shown in
        their Bookings table.
      </>,
      <>
        <strong>Mark completed</strong> once an approved booking has taken place.
      </>,
    ],
    body: <StatusTable audience="staff" />,
  },
  {
    id: "payment",
    title: "The 24-hour payment rule",
    icon: Clock,
    steps: [
      "After approval, the customer has 24 hours to pay. The Bookings table shows the time left as “Awaiting payment”.",
      <>
        When money arrives, record it on the <Link to="/admin/payments" className={linkClass}>Payments</Link> page.
        The customer gets a receipt by email and SMS.
      </>,
      "If nothing is recorded within 24 hours, the request is declined automatically with the reason “Unable to fulfil payment within 24 hours of approval.” The customer is notified and the slot is freed.",
    ],
    tip: "Record payments promptly. The system checks for overdue requests every few minutes, and a payment recorded after the automatic decline won't bring the request back.",
  },
  {
    id: "reschedule",
    title: "Reschedule a booking",
    icon: CalendarClock,
    intro: "Use this to move a booking to a different period, e.g. for an emergency or unforeseen event.",
    steps: [
      <>
        In <Link to="/admin/requests" className={linkClass}>Bookings</Link>, click <strong>Reschedule</strong> on a
        pending or approved request.
      </>,
      "Change the start and end for each facility that needs to move, and enter a reason. The customer sees this reason.",
      "The new dates must be free. The total is recalculated on the new period only, so it can go up or down. If the customer has already paid, the dialog shows the resulting balance due or credit.",
      "The customer is notified by email and SMS. For approved bookings, staff get a prep alert with the new dates.",
    ],
    tip: "Customers can reschedule their own pending or approved bookings too, with the same rules. Every change is kept in the request's history.",
  },
  {
    id: "extend",
    title: "Extend a booking",
    icon: CalendarRange,
    intro: "Use this when a booking needs more time at the end. The original booking and its charge stay as they are.",
    steps: [
      <>
        Click <strong>Extend</strong> on a pending or approved request. The start can't change, only the end.
      </>,
      "Pick the new end for each facility and enter a reason. The extra time must be free.",
      "The cost of the extra days is added to the existing total. Prices or periods already charged are never recalculated.",
      "The added amount shows as Balance due in the Bookings table and on the invoice. Record the payment on the Payments page as usual.",
    ],
    tip: "Customers can extend their own bookings too. To move a booking rather than lengthen it, use Reschedule.",
  },
  {
    id: "blocked",
    title: "Block dates for emergencies",
    icon: Ban,
    steps: [
      <>
        Open <Link to="/admin/blocked-dates" className={linkClass}>Blocked dates</Link> and click{" "}
        <strong>Block dates</strong>.
      </>,
      "Choose one facility, or “All facilities”. Then set the start, end and a short public reason (e.g. “Emergency repairs”).",
      "From then on, nobody can request, approve or reschedule into that window for that facility.",
      "The window shows as striped red on the public calendar, along with your reason.",
      "If existing pending or approved bookings overlap the block, they're listed straight away. Reschedule or reject them from Bookings so the customers are notified.",
    ],
    tip: "Blocking a date doesn't change existing bookings by itself. You decide what happens to each one.",
  },
  {
    id: "catalogue",
    title: "Facilities, add-ons and clients",
    icon: Package,
    steps: [
      <>
        <Link to="/admin/items" className={linkClass}>Facilities</Link> holds bookable facilities and add-ons, each
        with a daily price and an optional photo. Disable an item to hide it without deleting it.
      </>,
      <>
        <Link to="/admin/clients" className={linkClass}>Clients</Link> lists customers. Self-registered customers
        appear automatically, and you can add walk-in clients and book on their behalf with <strong>New request</strong>.
      </>,
    ],
  },
  {
    id: "money",
    title: "Payments and users",
    icon: Wallet,
    steps: [
      <>
        <Link to="/admin/payments" className={linkClass}>Payments</Link>: record payments against a request, and
        print invoices and receipts.
      </>,
      <>
        <Link to="/admin/users" className={linkClass}>Users</Link>: add staff accounts and assign their role.
      </>,
    ],
  },
  {
    id: "insights",
    title: "AI insights",
    icon: Sparkles,
    intro:
      "Administrators can ask questions about bookings, revenue and demand in plain English from the AI insights panel in the top bar. Answers include a chart where useful, and past questions are kept.",
  },
  {
    id: "shortcuts",
    title: "Shortcuts",
    icon: Command,
    body: (
      <p className="text-muted-foreground">
        Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> /{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl K</kbd> anywhere
        in the portal to jump to a page.
      </p>
    ),
  },
];

function AdminGuidePage() {
  return (
    <UserGuide
      kicker="Staff help"
      title="Admin portal guide"
      subtitle="How to review, schedule and manage bookings, and what customers see at each step."
      sections={sections}
    />
  );
}

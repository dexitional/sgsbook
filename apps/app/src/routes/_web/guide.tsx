import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building,
  CalendarClock,
  CalendarPlus,
  CalendarRange,
  CalendarSearch,
  CircleHelp,
  Clock,
  FileText,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { SiteHeader } from "#/components/site-header";
import { SiteFooter } from "#/components/site-footer";
import { StatusTable, UserGuide, type GuideSection } from "#/components/user-guide";

export const Route = createFileRoute("/_web/guide")({
  head: () => ({ meta: [{ title: "User guide — SGS Booking Platform" }] }),
  component: GuidePage,
});

const sections: GuideSection[] = [
  {
    id: "browse",
    title: "Browse facilities and check availability",
    icon: CalendarSearch,
    intro: "You don't need an account to look around.",
    steps: [
      <>
        Scroll to <a href="/#facilities" className="font-medium text-primary hover:underline">Facilities</a> to see
        every bookable space with its daily price.
      </>,
      <>
        <a href="/#calendar" className="font-medium text-primary hover:underline">This week's bookings</a> shows
        confirmed reservations for the next 7 days. Each facility has its own color.
      </>,
      <>
        Click <strong>Check Availability</strong> for a full month view. Hover a colored day to see what's booked.
      </>,
      <>
        Days with <strong>red diagonal stripes</strong> are blocked by the SGS team (maintenance, emergencies). They
        can't be booked for the affected facility.
      </>,
    ],
  },
  {
    id: "book-from-calendar",
    title: "Book straight from the calendar",
    icon: CalendarPlus,
    steps: [
      "Click any upcoming day, either in the weekly strip or the monthly availability calendar.",
      "Choose a facility. The start and end times are filled in for that day (8:00 AM to 5:00 PM), and you can adjust them.",
      <>
        Click <strong>Sign in to book</strong>. After signing in with Google, a booking form opens with your facility
        and dates already filled in.
      </>,
    ],
    tip: "Already signed in? The button reads “Continue to booking” and takes you straight to the form.",
  },
  {
    id: "account",
    title: "Create your account",
    icon: UserPlus,
    steps: [
      <>
        Click <Link to="/signup" className="font-medium text-primary hover:underline">Get started</Link> and continue
        with your Google account. No password is needed.
      </>,
      "The first time, tell us your organisation (if any), a phone number, and at least one contact person.",
      "Use a phone number that can receive SMS. Approvals, rejections, and schedule changes are sent there as well as by email.",
    ],
  },
  {
    id: "request",
    title: "Make a booking request",
    icon: Building,
    intro: "There are three ways to open the booking form after you sign in:",
    steps: [
      "Right after signing in, a quick-booking dialog opens. Fill it in, or close it to go to your dashboard.",
      <>
        At any time, use the <strong>Quick booking</strong> button at the top of your dashboard.
      </>,
      <>
        On the <strong>Bookings</strong> page, click <strong>New request</strong>.
      </>,
    ],
    body: (
      <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
        <li>Give the request a short title, e.g. “Departmental workshop”.</li>
        <li>
          Each <strong className="text-foreground">package</strong> is one facility for one period. Add more packages
          to book several facilities or several separate dates in one request.
        </li>
        <li>Tick any add-ons you need, such as a projector or a PA system.</li>
        <li>The invoice preview shows the total. Pricing is per day, and part of a day counts as a full day.</li>
        <li>
          If a period clashes with a confirmed booking or a blocked date, you'll see a message straight away. Pick
          another time.
        </li>
      </ul>
    ),
  },
  {
    id: "status",
    title: "Approval, rejection and statuses",
    icon: ShieldCheck,
    intro:
      "The SGS team reviews every request. You'll get an email and an SMS when your request is approved or declined.",
    body: <StatusTable audience="customer" />,
    tip: "If a request is declined, the reason appears under its status in your Bookings table. You can submit a new request for different dates.",
  },
  {
    id: "payment",
    title: "Pay within 24 hours of approval",
    icon: Clock,
    steps: [
      "When your request is approved, the invoice is emailed to you with the amount due and the payment deadline.",
      <>
        Pay into <strong>School of Graduate Studies, National Investment Bank, Account No. 1111000120801, Cape
        Coast</strong>. Use the request reference shown on the invoice.
      </>,
      "Your Bookings table shows a countdown (“Pay within …”) until the payment is recorded.",
      "Once payment is recorded, you'll get a receipt by email and SMS, and it appears on the Receipts page.",
    ],
    tip: (
      <>
        <strong>Important:</strong> if no payment is recorded within 24 hours of approval, the request is declined
        automatically with the reason “Unable to fulfil payment”. This frees the slot for others.
      </>
    ),
  },
  {
    id: "reschedule",
    title: "Reschedule to new dates (emergencies and unforeseen events)",
    icon: CalendarClock,
    intro: "Rescheduling moves your booking to a different period. The old period is dropped.",
    steps: [
      <>
        On the <strong>Bookings</strong> page, click <strong>Reschedule</strong> next to a pending or approved
        booking.
      </>,
      "Pick the new start and end for each facility you want to move, and briefly explain why.",
      "The new dates must be free. Your total is recalculated on the new period only, so it can go up or down.",
      "If you've already paid, you'll see any balance due or credit before you confirm.",
      "You'll get a confirmation by email and SMS. If the booking was already approved, the SGS team is told too.",
    ],
    tip: "Staff can also reschedule your booking, e.g. if a facility has an emergency. You'll be notified with their reason.",
  },
  {
    id: "extend",
    title: "Extend a booking",
    icon: CalendarRange,
    intro: "Extending keeps your booking as it is and adds more time at the end.",
    steps: [
      <>
        On the <strong>Bookings</strong> page, click <strong>Extend</strong> next to a pending or approved booking.
      </>,
      "Your start date stays the same. Pick a later end date and say why you need the extra time.",
      "The extra time must be free. Its cost is added to your existing total, and you see the extra charge before you confirm.",
      "The added amount shows as a balance due in your Bookings table and on your invoice. Pay it to the same account.",
    ],
    tip: "Part of a day counts as a full day. If the extra hours still fall within a day you're already charged for, there's no extra charge.",
  },
  {
    id: "documents",
    title: "Invoices and receipts",
    icon: FileText,
    steps: [
      <>
        For approved and completed bookings, click <strong>Invoice</strong> in the Bookings table to view the invoice
        or print it.
      </>,
      <>
        The <strong>Receipts</strong> page lists every payment recorded against your bookings, each with a printable
        receipt.
      </>,
    ],
  },
  {
    id: "faq",
    title: "Frequently asked questions",
    icon: CircleHelp,
    body: (
      <dl className="space-y-3">
        {[
          [
            "Does a pending request hold the slot?",
            "No. A slot is only reserved once a request is approved. Until then, other people can still request the same period.",
          ],
          [
            "I missed the payment deadline. What now?",
            "The request is declined automatically. Submit a new request. If the slot is still free, it can be approved again.",
          ],
          [
            "Why can't I pick a certain day?",
            "Either the day is in the past, the facility is already booked, or the SGS team has blocked it. Hover over the day in the availability calendar to see why.",
          ],
          [
            "I'm not getting SMS messages.",
            "Make sure the phone number on your profile is correct and can receive SMS. Emails go to the address on your Google account.",
          ],
        ].map(([q, a]) => (
          <div key={q}>
            <dt className="font-medium">{q}</dt>
            <dd className="mt-0.5 text-muted-foreground">{a}</dd>
          </div>
        ))}
      </dl>
    ),
  },
];

function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ fontFamily: '"Noto Sans", sans-serif' }}>
      <SiteHeader />
      <main className="flex-1 px-4 py-10 md:py-14">
        <UserGuide
          kicker="Help"
          title="How to book SGS facilities"
          subtitle="Everything you need, from finding a free date to paying and changing a booking."
          sections={sections}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

import Anthropic from "@anthropic-ai/sdk";
import { format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { prisma } from "../../lib/prisma.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const TREND_WEEKS = 8;
const TREND_MONTHS = 6;

export interface MetricsSnapshot {
  generatedAt: string;
  clients: { total: number; internal: number; external: number };
  items: { total: number; facilities: number; addons: number };
  requests: { pended: number; approved: number; rejected: number; completed: number; total: number };
  payments: { totalAmount: number; count: number };
  topFacilitiesByBookings: Array<{ title: string; bookings: number }>;
  requestsPerWeek: Array<{ week: string; count: number }>;
  paymentsPerMonth: Array<{ month: string; total: number }>;
}

// Every field here is a count, sum, or time-bucketed aggregate — deliberately
// never a raw row, name, email, or phone. This is the only thing that ever
// reaches the model.
async function buildMetricsSnapshot(): Promise<MetricsSnapshot> {
  const now = new Date();
  const trendStart = startOfWeek(subWeeks(now, TREND_WEEKS - 1), { weekStartsOn: 1 });
  const paymentTrendStart = startOfMonth(subMonths(now, TREND_MONTHS - 1));

  const [
    totalClients,
    internalClients,
    externalClients,
    totalItems,
    facilityItems,
    addonItems,
    pended,
    approved,
    rejected,
    completed,
    paymentAgg,
    packages,
    recentRequests,
    recentPayments,
  ] = await Promise.all([
    prisma.ubsClient.count({ where: { status: true } }),
    prisma.ubsClient.count({ where: { status: true, type: "INTERNAL" } }),
    prisma.ubsClient.count({ where: { status: true, type: "EXTERNAL" } }),
    prisma.ubsItem.count({ where: { status: true } }),
    prisma.ubsItem.count({ where: { status: true, itemType: "FACILITY" } }),
    prisma.ubsItem.count({ where: { status: true, itemType: "ADDON" } }),
    prisma.ubsRequest.count({ where: { status: "PENDED" } }),
    prisma.ubsRequest.count({ where: { status: "APPROVED" } }),
    prisma.ubsRequest.count({ where: { status: "REJECTED" } }),
    prisma.ubsRequest.count({ where: { status: "COMPLETED" } }),
    prisma.ubsPayment.aggregate({ where: { status: true }, _sum: { paidAmount: true }, _count: true }),
    prisma.ubsPackage.findMany({ select: { bookItem: { select: { title: true } } } }),
    prisma.ubsRequest.findMany({ where: { createdAt: { gte: trendStart } }, select: { createdAt: true } }),
    prisma.ubsPayment.findMany({
      where: { status: true, paidAt: { gte: paymentTrendStart } },
      select: { paidAt: true, paidAmount: true },
    }),
  ]);

  const bookingsByFacility = new Map<string, number>();
  for (const pkg of packages) {
    bookingsByFacility.set(pkg.bookItem.title, (bookingsByFacility.get(pkg.bookItem.title) ?? 0) + 1);
  }
  const topFacilitiesByBookings = [...bookingsByFacility.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, bookings]) => ({ title, bookings }));

  // Zero-filled buckets so every week/month appears even with no activity —
  // both for the AI's reasoning and for the trend chart on the frontend.
  const weekCounts = new Map<string, number>();
  for (const r of recentRequests) {
    const key = format(startOfWeek(r.createdAt, { weekStartsOn: 1 }), "MMM d");
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }
  const requestsPerWeek = Array.from({ length: TREND_WEEKS }, (_, i) => {
    const key = format(startOfWeek(subWeeks(now, TREND_WEEKS - 1 - i), { weekStartsOn: 1 }), "MMM d");
    return { week: key, count: weekCounts.get(key) ?? 0 };
  });

  const monthTotals = new Map<string, number>();
  for (const p of recentPayments) {
    const key = format(startOfMonth(p.paidAt), "MMM yyyy");
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + (p.paidAmount ?? 0));
  }
  const paymentsPerMonth = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const key = format(startOfMonth(subMonths(now, TREND_MONTHS - 1 - i)), "MMM yyyy");
    return { month: key, total: monthTotals.get(key) ?? 0 };
  });

  return {
    generatedAt: now.toISOString(),
    clients: { total: totalClients, internal: internalClients, external: externalClients },
    items: { total: totalItems, facilities: facilityItems, addons: addonItems },
    requests: { pended, approved, rejected, completed, total: pended + approved + rejected + completed },
    payments: { totalAmount: paymentAgg._sum.paidAmount ?? 0, count: paymentAgg._count },
    topFacilitiesByBookings,
    requestsPerWeek,
    paymentsPerMonth,
  };
}

export type SuggestedChart = "bar" | "pie" | "line" | "none";

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; messageId: string; suggestedChart: SuggestedChart; snapshot: MetricsSnapshot }
  | { type: "error"; message: string };

interface HistoryTurn {
  question: string;
  answer: string;
}

function buildSystemPrompt(snapshot: MetricsSnapshot): string {
  return [
    "You are a data assistant embedded in a university facilities booking system's admin dashboard.",
    "Answer the admin's question using ONLY the aggregated metrics JSON below — never invent numbers,",
    "and never speculate about individual clients, staff, or bookings: you have no access to that data,",
    "only these aggregates. This is read-only and advisory — you cannot take any action.",
    "Be concise: 2-4 sentences.",
    'If a chart would help, end your reply on its own line: "SUGGESTED_CHART: bar" (requests by status),',
    '"SUGGESTED_CHART: pie" (client mix), or "SUGGESTED_CHART: line" (bookings per week trend) —',
    "omit this line entirely if no chart would help.",
    "",
    "Metrics snapshot:",
    JSON.stringify(snapshot, null, 2),
  ].join("\n");
}

// Streams the answer token-by-token, then persists the full Q&A (plus the
// snapshot it was answered from) so the admin's history shows exactly what
// they saw — not today's live numbers recomputed later.
export async function* streamInsights(
  question: string,
  adminUserId: number,
  history: HistoryTurn[] = [],
): AsyncGenerator<StreamEvent> {
  const snapshot = await buildMetricsSnapshot();

  const messages: Anthropic.MessageParam[] = [
    ...history.flatMap((turn): Anthropic.MessageParam[] => [
      { role: "user", content: turn.question },
      { role: "assistant", content: turn.answer },
    ]),
    { role: "user", content: question },
  ];

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 512,
    system: buildSystemPrompt(snapshot),
    messages,
  });

  let fullText = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
      yield { type: "text", text: event.delta.text };
    }
  }

  const chartMatch = fullText.match(/SUGGESTED_CHART:\s*(bar|pie|line)/i);
  const suggestedChart = (chartMatch?.[1]?.toLowerCase() as SuggestedChart | undefined) ?? "none";
  const answer = fullText.replace(/SUGGESTED_CHART:.*$/im, "").trim();

  const saved = await prisma.ubsAiMessage.create({
    data: { adminUserId, question, answer, suggestedChart, snapshot: snapshot as object },
  });

  yield { type: "done", messageId: saved.id, suggestedChart, snapshot };
}

export async function listHistory(adminUserId: number) {
  const messages = await prisma.ubsAiMessage.findMany({
    where: { adminUserId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return messages.reverse();
}

import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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

export type SuggestedChart = "bar" | "pie" | "line" | "none";

export interface HistoryMessage {
  id: string;
  question: string;
  answer: string;
  suggestedChart: SuggestedChart | null;
  snapshot: MetricsSnapshot | null;
  createdAt: string;
}

export function useAiHistory() {
  return useQuery({
    queryKey: ["ai-history"],
    queryFn: () => api.get<{ messages: HistoryMessage[] }>("/ai/history"),
  });
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; messageId: string; suggestedChart: SuggestedChart; snapshot: MetricsSnapshot }
  | { type: "error"; message: string };

// The /ai/ask endpoint streams Server-Sent Events. EventSource can't be used
// here since it's GET-only and we need to POST the question + auth cookie,
// so this parses the SSE framing by hand off a plain fetch stream.
export async function streamInsights(
  question: string,
  history: Array<{ question: string; answer: string }>,
  onEvent: (event: StreamEvent) => void,
) {
  const res = await fetch(`${API_URL}/ai/ask`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Failed to reach the insights assistant");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const raw of events) {
      const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (!json) continue;
      onEvent(JSON.parse(json) as StreamEvent);
    }
  }
}

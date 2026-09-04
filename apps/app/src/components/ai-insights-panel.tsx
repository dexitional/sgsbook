import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "#/components/ui/sheet";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useAiHistory, streamInsights, type MetricsSnapshot, type SuggestedChart } from "#/lib/queries/ai";

interface Turn {
  id?: string;
  question: string;
  answer: string;
  suggestedChart?: SuggestedChart;
  snapshot?: MetricsSnapshot;
  streaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "How many booking requests are still pending?",
  "What's our most-booked facility?",
  "How have bookings trended over the last few weeks?",
];

// How many recent turns to send back to the model as conversational context
// for follow-up questions (e.g. "what about last month?").
const CONTEXT_TURNS = 3;

export function AiInsightsPanel() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const history = useAiHistory();
  const hydratedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || hydratedRef.current || !history.data) return;
    hydratedRef.current = true;
    setTurns(
      history.data.messages.map((m) => ({
        id: m.id,
        question: m.question,
        answer: m.answer,
        suggestedChart: m.suggestedChart ?? "none",
        snapshot: m.snapshot ?? undefined,
      })),
    );
  }, [open, history.data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || sending) return;
    setQuestion("");
    setSending(true);
    setTurns((prev) => [...prev, { question: trimmed, answer: "", streaming: true }]);

    const contextHistory = turns
      .filter((t) => !t.streaming && t.answer)
      .slice(-CONTEXT_TURNS)
      .map((t) => ({ question: t.question, answer: t.answer }));

    try {
      await streamInsights(trimmed, contextHistory, (event) => {
        // Throw here, not inside the setTurns updater below — React doesn't
        // propagate exceptions thrown from a state updater function back out
        // to the caller, so the outer try/catch would never see it.
        if (event.type === "error") {
          throw new Error(event.message);
        }

        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (!last) return prev;
          if (event.type === "text") {
            next[next.length - 1] = { ...last, answer: last.answer + event.text };
          } else if (event.type === "done") {
            next[next.length - 1] = {
              ...last,
              id: event.messageId,
              suggestedChart: event.suggestedChart,
              snapshot: event.snapshot,
              streaming: false,
            };
          }
          return next;
        });
      });
    } catch {
      setTurns((prev) => prev.slice(0, -1));
      toast.error("Couldn't get an answer — please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="size-3.5" />
          Ask AI
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Insights assistant
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {turns.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask about booking activity, clients, or facilities. Answers are read-only — based only on
                aggregated numbers, never individual client details. Your conversation history is saved.
              </p>
              <div className="space-y-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => submit(q)}
                    className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, i) => (
            <div key={turn.id ?? i} className="space-y-2">
              <p className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                {turn.question}
              </p>
              {turn.answer || !turn.streaming ? (
                <div className="max-w-[90%] space-y-3 rounded-lg bg-secondary px-3 py-2 text-sm">
                  <p className="whitespace-pre-wrap">
                    {turn.answer}
                    {turn.streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-foreground/60 align-middle" />}
                  </p>
                  {!turn.streaming && turn.suggestedChart && turn.suggestedChart !== "none" && turn.snapshot && (
                    <InsightChart type={turn.suggestedChart} snapshot={turn.snapshot} />
                  )}
                </div>
              ) : (
                <div className="max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  Thinking…
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(question);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question…"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !question.trim()} aria-label="Send question">
            <Send className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function InsightChart({ type, snapshot }: { type: "bar" | "pie" | "line"; snapshot: MetricsSnapshot }) {
  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontSize: 12,
  };

  if (type === "line") {
    return (
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={snapshot.requestsPerWeek}>
            <XAxis dataKey="week" fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "bar") {
    const data = [
      { status: "Pending", count: snapshot.requests.pended },
      { status: "Approved", count: snapshot.requests.approved },
      { status: "Rejected", count: snapshot.requests.rejected },
      { status: "Completed", count: snapshot.requests.completed },
    ];
    return (
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="status" fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const data = [
    { name: "Internal", value: snapshot.clients.internal },
    { name: "External", value: snapshot.clients.external },
  ];
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={30} outerRadius={55} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

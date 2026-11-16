import { useRouterState } from "@tanstack/react-router";
import { cn } from "#/lib/utils.ts";
import { Skeleton } from "#/components/ui/skeleton";

// Loading layouts shaped like the pages they stand in for, so a page keeps
// its structure while data arrives instead of showing "Loading…" text.

export function Loading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

export function Lines({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === count - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      {action && <Skeleton className="hidden h-9 w-32 rounded-xl sm:block" />}
    </div>
  );
}

export function StatsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4", count === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[20px] bg-card p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mt-4 h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 4, chart = false, className }: { lines?: number; chart?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-56 max-w-full" />
      {chart ? <Skeleton className="mt-5 h-48 rounded-lg" /> : <Lines count={lines} className="mt-5" />}
    </div>
  );
}

// A table card: toolbar, header row and rows.
export function TableSkeleton({ rows = 6, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 max-w-[60%] rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex gap-6 border-b border-border bg-secondary/40 px-3 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3 flex-1", c >= 3 && "hidden md:block")} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-6 border-b border-border px-3 py-3.5 last:border-0">
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} className={cn("h-4 flex-1", c >= 3 && "hidden md:block")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Shown by the router while a page's code and data are on their way.
export function PageSkeleton() {
  return (
    <Loading className="space-y-6">
      <HeaderSkeleton />
      <TableSkeleton />
    </Loading>
  );
}

// The whole portal frame (sidebar, top bar, page) while the signed-in user
// is being checked, instead of a blank screen with "Loading…".
export function ShellSkeleton({ navCount = 6 }: { navCount?: number }) {
  return (
    <Loading className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex-1 space-y-2 p-3">
          {Array.from({ length: navCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
              <Skeleton className="size-4.5 rounded" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <Skeleton className="h-3 w-36" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card/60 px-4 md:px-6">
          <Skeleton className="h-9 w-56 max-w-[50%] rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
        <div className="flex-1 space-y-6 p-4 md:p-6">
          <HeaderSkeleton />
          <StatsSkeleton />
          <TableSkeleton rows={4} />
        </div>
      </div>
    </Loading>
  );
}

// A small centred form, for sign-in checks and on-boarding.
export function FormCardSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <Loading className={cn("flex min-h-screen items-center justify-center bg-background px-4 py-12", className)}>
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg shadow-black/5">
        <div className="space-y-2.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </Loading>
  );
}

// A printable invoice or request: letterhead, parties, line items, total.
export function PrintSkeleton() {
  return (
    <Loading className="mx-auto max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="mt-10 grid grid-cols-2 gap-8">
        <Lines count={4} />
        <Lines count={4} />
      </div>
      <div className="mt-10 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <Skeleton className="mt-6 ml-auto h-6 w-40" />
    </Loading>
  );
}

// A record shown inside a dialog: a line of context, then item cards.
export function DialogBodySkeleton({ items = 2 }: { items?: number }) {
  return (
    <Loading className="space-y-3">
      <Skeleton className="h-3.5 w-48" />
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-3">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Lines count={2} className="mt-3" />
        </div>
      ))}
    </Loading>
  );
}

const PORTAL_PATHS = /^\/(admin|dashboard|requests|receipts)(\/|$)/;

// The router's pending view: a page skeleton inside the portals. Elsewhere
// (the public site, sign-in, print pages) the progress bar alone is enough.
export function RoutePending() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!PORTAL_PATHS.test(pathname) || pathname.endsWith("/print") || pathname === "/admin/login") return null;
  return <PageSkeleton />;
}

// A thin bar along the top of the window while the router is loading a page.
export function NavigationProgress() {
  const pending = useRouterState({ select: (s) => s.status === "pending" });
  if (!pending) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/15" aria-hidden>
      <div className="nav-progress h-full w-1/3 bg-primary" />
    </div>
  );
}

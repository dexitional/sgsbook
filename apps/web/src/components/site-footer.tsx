import { asset } from "#/lib/asset";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <img src={asset("logo.webp")} alt="" className="h-5 w-5 object-contain" />
          <span className="text-lg tracking-wide text-primary" style={{ fontFamily: '"Engagement", cursive' }}>
            SGS Booking Platform
          </span>
        </div>
        <p>&copy; {new Date().getFullYear()} SGS Booking Platform. All rights reserved.</p>
      </div>
    </footer>
  );
}

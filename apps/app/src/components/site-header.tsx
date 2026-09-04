import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun } from "lucide-react";
import { IconButton, useThemeStore } from "@sgs/ui";
import { Button } from "#/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "#/components/ui/sheet";
import { authClient } from "#/lib/auth-client";
import { asset } from "#/lib/asset";

const NAV_LINKS = [
  { href: "#facilities", label: "Facilities" },
  { href: "#calendar", label: "Availability" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img src={asset("logo.webp")} alt="" className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8" />
          <span
            className="truncate text-xl tracking-wide text-primary sm:text-2xl lg:text-3xl"
            style={{ fontFamily: '"Engagement", cursive' }}
          >
            SGS Booking Platform
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {session?.user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <IconButton aria-label="Open menu" variant="ghost" className="md:hidden">
                <Menu />
              </IconButton>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle
                  className="text-xl text-primary"
                  style={{ fontFamily: '"Engagement", cursive' }}
                >
                  SGS Booking Platform
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    {link.label}
                  </a>
                ))}
                {!session?.user && (
                  <Link
                    to="/signin"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const resolved = theme === "system" ? "light" : theme;
  return (
    <IconButton
      aria-label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      variant="ghost"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? <Sun /> : <Moon />}
    </IconButton>
  );
}

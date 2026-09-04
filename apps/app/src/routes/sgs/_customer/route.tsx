import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Menu, Moon, Receipt, Search, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "#/components/ui/sheet";
import { IconButton, useThemeStore } from "@sgs/ui";
import { getCurrentCustomer } from "#/server/customer";
import { authClient } from "#/lib/auth-client";
import { asset } from "#/lib/asset";

export const Route = createFileRoute("/sgs/_customer")({ component: CustomerLayout });

const navItems = [
  { to: "/sgs/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sgs/requests", label: "Bookings", icon: Receipt },
  { to: "/sgs/receipts", label: "Receipts", icon: Receipt },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {navItems.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function CustomerLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const customer = useQuery({ queryKey: ["customer"], queryFn: () => getCurrentCustomer() });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!customer.data) return;
    if (!customer.data.authenticated) {
      navigate({ to: "/sgs/signin" });
      return;
    }
    if (!customer.data.client || customer.data.client.contacts.length === 0) {
      navigate({ to: "/sgs/onboarding" });
    }
  }, [customer.data, navigate]);

  if (customer.isLoading || !customer.data?.authenticated || !customer.data.client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  const { user, client } = customer.data;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <Link to="/sgs" className="flex h-16 min-w-0 items-center gap-2 border-b border-border px-5">
          <img src={asset("logo.webp")} alt="" className="h-8 w-8 shrink-0 object-contain" />
          <span
            className="truncate text-[1.375rem] tracking-wider text-primary"
            style={{ fontFamily: '"Engagement", cursive' }}
          >
            SGS Booking Platform
          </span>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          Booking as <span className="font-medium text-foreground">{client.organisation || client.name}</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur-md md:px-6">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <IconButton aria-label="Open menu" variant="ghost" className="md:hidden">
                <Menu />
              </IconButton>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <img src={asset("logo.webp")} alt="" className="h-6 w-6 shrink-0 object-contain" />
                  <SheetTitle
                    className="truncate text-lg text-primary"
                    style={{ fontFamily: '"Engagement", cursive' }}
                  >
                    SGS Booking Platform
                  </SheetTitle>
                </div>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
              </nav>
              <SheetFooter className="border-t border-border text-xs text-muted-foreground">
                Booking as <span className="font-medium text-foreground">{client.organisation || client.name}</span>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <img src={asset("logo.webp")} alt="" className="h-7 w-7 shrink-0 object-contain" />
            <span
              className="truncate text-[1.375rem] tracking-wider text-primary"
              style={{ fontFamily: '"Engagement", cursive' }}
            >
              SGS Booking Platform
            </span>
          </div>

          <div className="relative hidden max-w-xs flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search bookings, receipts…" className="rounded-full bg-secondary/60 pl-9" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2.5 rounded-full">
                  <Avatar className="size-9">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm font-medium">{user.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {client.organisation || "Customer"}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => authClient.signOut().then(() => navigate({ to: "/sgs" }))}>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const resolved = theme === "system" ? "light" : theme;
  return (
    <IconButton
      aria-label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      variant="outline"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? <Sun /> : <Moon />}
    </IconButton>
  );
}

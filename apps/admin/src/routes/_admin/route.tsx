import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Command as CommandIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Receipt,
  Sun,
  UserSquare2,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "#/components/ui/sheet";
import { CommandPalette } from "#/components/command-palette";
import { AiInsightsPanel } from "#/components/ai-insights-panel";
import { useAdminSession, useLogout } from "#/lib/queries/session";
import { useThemeStore, IconButton } from "@sgs/ui";

export const Route = createFileRoute("/_admin")({ component: AdminLayout });

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: UserSquare2 },
  { to: "/items", label: "Facilities", icon: Package },
  { to: "/requests", label: "Bookings", icon: Receipt },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/users", label: "Users", icon: Users },
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

function AdminLayout() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAdminSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isError) navigate({ to: "/login" });
  }, [isLoading, isError, navigate]);

  if (isLoading || isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  const user = data?.user;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <img src="/logo.webp" alt="" className="h-8 w-8 shrink-0 object-contain" />
          <span
            className="truncate text-[1.375rem] tracking-wider text-primary"
            style={{ fontFamily: '"Engagement", cursive' }}
          >
            SGS Booking Platform
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user?.username}</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card/60 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <IconButton aria-label="Open menu" variant="ghost">
                  <Menu />
                </IconButton>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <img src="/logo.webp" alt="" className="h-6 w-6 shrink-0 object-contain" />
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
                  Signed in as <span className="font-medium text-foreground">{user?.username}</span>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <img src="/logo.webp" alt="" className="h-7 w-7 shrink-0 object-contain" />
            <span
              className="truncate text-lg tracking-wider text-primary"
              style={{ fontFamily: '"Engagement", cursive' }}
            >
              SGS Booking Platform
            </span>
          </div>

          <button
            type="button"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary md:flex"
          >
            <CommandIcon className="size-3.5" />
            Search…
            <kbd className="ml-4 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>

          <div className="flex items-center gap-2">
            <AiInsightsPanel />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2.5 rounded-full">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm font-medium">{user?.username}</span>
                    <span className="block text-xs text-muted-foreground">{user?.roles?.[0] ?? "Admin"}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <SignOutItem />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
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

function SignOutItem() {
  const navigate = useNavigate();
  const logout = useLogout();
  return (
    <DropdownMenuItem
      onClick={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: "/login" }) })}
    >
      <LogOut className="mr-2 size-4" />
      Sign out
    </DropdownMenuItem>
  );
}

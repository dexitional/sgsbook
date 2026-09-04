import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Moon, Package, Receipt, Sun, Users, UserSquare2, Wallet } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "#/components/ui/command";
import { useThemeStore } from "@sgs/ui";
import { useLogout } from "#/lib/queries/session";

const pages = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/clients", label: "Clients", icon: UserSquare2 },
  { to: "/admin/items", label: "Facilities", icon: Package },
  { to: "/admin/requests", label: "Bookings", icon: Receipt },
  { to: "/admin/payments", label: "Payments", icon: Wallet },
  { to: "/admin/users", label: "Users", icon: Users },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const setTheme = useThemeStore((s) => s.setTheme);
  const logout = useLogout();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Jump to a page or run a quick action">
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.to} onSelect={() => go(p.to)}>
              <p.icon />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => { setTheme("light"); setOpen(false); }}>
            <Sun /> Light
          </CommandItem>
          <CommandItem onSelect={() => { setTheme("dark"); setOpen(false); }}>
            <Moon /> Dark
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => { setOpen(false); logout.mutate(); }}>
            <LogOut /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

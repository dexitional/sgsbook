import { useEffect } from "react";
import { useThemeStore } from "./theme.js";

// Only reacts to live OS theme changes while in "system" mode — initial
// paint is handled by the blocking `themeInitScript` in each app's <head>,
// so this never causes a flash.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, setTheme]);

  return children;
}

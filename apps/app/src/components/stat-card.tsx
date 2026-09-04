import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "#/components/ui/card";

function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
  tint = "var(--primary)",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  isLoading?: boolean;
  tint?: string;
}) {
  const animated = useCountUp(value);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card
        className="gap-0 rounded-[20px] border-0 py-0 shadow-lg"
        style={{ background: `color-mix(in oklab, ${tint} 8%, var(--card))` }}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: tint }}
            >
              <Icon className="size-3.5 text-white" />
            </span>
            <p className="truncate text-base font-medium text-foreground">{label}</p>
          </div>
          <p className="mt-4 font-mono text-3xl font-bold tabular-nums text-foreground">
            {isLoading ? "—" : animated.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

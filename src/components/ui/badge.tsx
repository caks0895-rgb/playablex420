import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "live" | "warn" | "danger" | "pool" | "fg";
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: "text-muted border-border",
    live: "text-live border-live/30",
    warn: "text-warn border-warn/30",
    danger: "text-danger border-danger/30",
    pool: "text-pool border-pool/30",
    fg: "text-fg border-border-strong",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

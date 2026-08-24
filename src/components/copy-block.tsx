import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyBlock({
  text,
  label = "Copy",
  compact = false,
}: {
  text: string;
  label?: string;
  compact?: boolean;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-raised">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Prompt</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => void copy()}>
          {done ? "Copied" : label}
        </Button>
      </div>
      <pre
        className={cn(
          "overflow-x-auto p-4 font-mono text-xs leading-relaxed text-fg whitespace-pre-wrap",
          compact && "max-h-72 overflow-y-auto",
        )}
      >
        {text}
      </pre>
    </div>
  );
}

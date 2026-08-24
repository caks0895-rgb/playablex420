import { useEffect, useRef } from "react";
import type { LogLine } from "@/lib/engine/types";
import { cn, formatClock } from "@/lib/utils";

export function LiveLog({
  logs,
  className,
}: {
  logs: LogLine[];
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const nearBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 80;
    if (nearBottom) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs.length]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "flex flex-col overflow-y-auto rounded-[16px] border border-border bg-surface p-4 font-mono text-xs leading-relaxed sm:p-5 sm:text-sm",
        className,
      )}
    >
      {logs.length === 0 ? (
        <p className="text-muted">Waiting for the first line.</p>
      ) : (
        logs.map((line, i) => (
          <p
            key={line.id}
            className={cn(
              "text-pretty",
              i === logs.length - 1 && "log-line-enter",
              line.kind === "pay" && "text-pool",
              line.kind === "win" && "text-live",
              line.kind === "judge" && "text-warn",
              line.kind === "system" && "text-muted",
              (line.kind === "move" || line.kind === "join") && "text-fg",
            )}
          >
            <span className="mr-3 text-faint tabular-nums">{formatClock(line.ts)}</span>
            {line.text}
          </p>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}

import type { Player } from "@/lib/engine/types";
import type { TargetPublicState } from "@/lib/games/target";
import { cn } from "@/lib/utils";

export function TargetBoard({
  state,
  players,
}: {
  state: TargetPublicState;
  players: Player[];
}) {
  return (
    <div className="rounded-[20px] border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">Sealed numbers · 1–99</p>
      {state.resolved && state.secret != null && (
        <p className="mt-3 font-display text-4xl font-medium tabular-nums">{state.secret}</p>
      )}
      {!state.resolved && (
        <p className="mt-3 text-sm text-muted">The draw stays in the envelope until every lock is in.</p>
      )}
      <ul className="mt-5 grid gap-2">
        {players.map((p) => {
          const locked = Boolean(state.committed[p.id]);
          const n = state.locks?.[p.id];
          return (
            <li
              key={p.id}
              className={cn(
                "flex items-center justify-between rounded-[12px] border border-border bg-raised px-3 py-2 text-sm",
              )}
            >
              <span>{p.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted">
                {state.resolved && n != null
                  ? `${n} · Δ${Math.abs(n - (state.secret ?? 0))}`
                  : locked
                    ? "locked"
                    : "open"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

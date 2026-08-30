import type { Player } from "@/lib/engine/types";
import type { CoinPumpState } from "@/lib/games/coinpump";
import { cn } from "@/lib/utils";
import { Token } from "@/components/player-chip";

export function CoinBoard({ state, players }: { state: CoinPumpState; players: Player[] }) {
  const picks = state.picks ?? {};
  const picksByCoin: Record<string, Player[]> = {};
  for (const p of players) {
    const coin = picks[p.id];
    if (!coin) continue;
    (picksByCoin[coin] ??= []).push(p);
  }
  const sealed = !state.picks;
  const lockedCount = players.filter((p) => Boolean((state as CoinPumpState & { committed?: Record<string, boolean> }).committed?.[p.id])).length;

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted">
        Source {state.source === "coingecko" ? "CoinGecko" : "simulated"} · 10-minute window · picks lock at 90s
        {sealed ? ` · ${lockedCount}/${players.length} sealed` : ""}.
      </p>
      {state.coins.map((c) => {
        const pct =
          c.changePct ??
          (c.startUsd === 0 ? 0 : ((c.liveUsd - c.startUsd) / c.startUsd) * 100);
        const up = pct >= 0;
        return (
          <div
            key={c.id}
            className="flex items-center gap-4 rounded-[16px] border border-border bg-surface px-4 py-3"
          >
            <div className="w-16 shrink-0">
              <p className="font-medium tracking-wide">{c.ticker}</p>
              <p className="text-[11px] text-muted">{c.name}</p>
            </div>
            <div className="flex-1">
              <p className="font-mono text-sm tabular-nums">
                ${c.liveUsd.toFixed(c.liveUsd < 2 ? 4 : 2)}
              </p>
              <p className="text-[11px] text-faint">
                open ${c.startUsd.toFixed(c.startUsd < 2 ? 4 : 2)}
              </p>
            </div>
            <p
              className={cn(
                "w-20 text-right font-mono text-sm tabular-nums",
                up ? "text-live" : "text-danger",
              )}
            >
              {up ? "+" : ""}
              {pct.toFixed(3)}%
            </p>
            <div className="flex min-w-16 justify-end -space-x-1">
              {(picksByCoin[c.id] ?? []).map((p) => (
                <Token key={p.id} tint={p.tint} name={p.name} size="sm" />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { Player } from "@/lib/engine/types";
import type { Gesture, RpsState } from "@/lib/games/rps";
import { cn } from "@/lib/utils";
import { Token } from "@/components/player-chip";

function Glyph({ g }: { g: Gesture }) {
  if (g === "rock") {
    return (
      <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (g === "paper") {
    return (
      <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
        <rect x="6" y="4" width="12" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
      <path d="M8 6 L12 12 L8 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 6 L12 12 L16 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function RpsArena({
  state,
  players,
}: {
  state: RpsState & { committed?: Record<string, boolean> };
  players: Player[];
}) {
  const round = state.rounds[state.roundIndex];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Round {Math.min(state.roundIndex + 1, 5)} of 5
      </p>
      <div className="grid grid-cols-2 gap-3">
        {players.map((p) => {
          const thrown = Boolean(state.committed?.[p.id] || round?.throws[p.id]);
          const revealed = Boolean(round?.resolved && round.throws[p.id]);
          const g = round?.throws[p.id];
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col items-center gap-2 rounded-[16px] border border-border bg-surface px-3 py-5",
              )}
            >
              <Token tint={p.tint} name={p.name} />
              <p className="text-sm font-medium">{p.name}</p>
              <div className="text-fg">
                {revealed && g ? (
                  <Glyph g={g} />
                ) : thrown ? (
                  <span className="text-xs uppercase tracking-wide text-muted">locked</span>
                ) : (
                  <span className="text-xs uppercase tracking-wide text-faint">waiting</span>
                )}
              </div>
              <p className="font-mono text-lg tabular-nums">{state.scores[p.id] ?? 0}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

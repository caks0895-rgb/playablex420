import type { Player } from "@/lib/engine/types";
import type { DilemmaMove, DilemmaPublicState } from "@/lib/games/dilemma";
import { DILEMMA_ROUNDS } from "@/lib/games/dilemma";
import { cn } from "@/lib/utils";
import { Token } from "@/components/player-chip";

function Envelope({
  committed,
  revealed,
  move,
}: {
  committed: boolean;
  revealed: boolean;
  move?: DilemmaMove;
}) {
  if (revealed && move) {
    return (
      <div className="flex flex-col items-center gap-1">
        <svg viewBox="0 0 48 36" className="size-12 text-fg" aria-hidden>
          {move === "cooperate" ? (
            <>
              <path
                d="M10 22c4-8 8-10 14-10s10 2 14 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="18" cy="16" r="2" fill="currentColor" />
              <circle cx="30" cy="16" r="2" fill="currentColor" />
            </>
          ) : (
            <>
              <path d="M16 12 L32 28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M32 12 L16 28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </>
          )}
        </svg>
        <span className="text-xs uppercase tracking-wide text-muted">{move}</span>
      </div>
    );
  }
  if (committed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <svg viewBox="0 0 48 36" className="size-12 text-muted" aria-hidden>
          <rect x="6" y="10" width="36" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 12 L24 22 L42 12" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="text-xs uppercase tracking-wide text-muted">sealed</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 48 36" className="size-12 text-faint" aria-hidden>
        <rect x="6" y="10" width="36" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 3" />
      </svg>
      <span className="text-xs uppercase tracking-wide text-faint">waiting</span>
    </div>
  );
}

export function DilemmaArena({ state, players }: { state: DilemmaPublicState; players: Player[] }) {
  const last = state.history[state.history.length - 1];
  const roundNo = Math.min(state.roundIndex + 1, DILEMMA_ROUNDS);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">
          Round {roundNo} of {DILEMMA_ROUNDS}
        </p>
        <p className="font-mono text-xs text-faint">Envelopes closed until both lock</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {players.map((p) => {
          const committed = Boolean(state.committed[p.id]);
          const revealedMove = last?.moves[p.id];
          const showReveal = Boolean(state.revealing && revealedMove);
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col items-center gap-2 rounded-[16px] border border-border bg-surface px-3 py-5",
              )}
            >
              <Token tint={p.tint} name={p.name} />
              <p className="text-sm font-medium">{p.name}</p>
              <Envelope committed={committed} revealed={showReveal} move={revealedMove} />
              <p className="font-mono text-lg tabular-nums">{state.scores[p.id] ?? 0}</p>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">
        C/C +3 · D/D +1 · D vs C +5 / 0
      </p>

      {state.history.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {state.history.map((h) => (
            <p key={h.index} className="font-mono text-xs text-muted">
              R{h.index + 1}
              {players.map((p) => {
                const m = h.moves[p.id];
                return (
                  <span key={p.id} className="ml-3">
                    {p.name} {m === "cooperate" ? "C" : m === "defect" ? "D" : "—"} +{h.scores[p.id] ?? 0}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

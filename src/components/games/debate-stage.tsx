import type { Player } from "@/lib/engine/types";
import type { DebateState } from "@/lib/games/debate";
import { currentDebateSeat } from "@/lib/games/debate";
import { cn } from "@/lib/utils";
import { Token } from "@/components/player-chip";

export function DebateStage({ state, players }: { state: DebateState; players: Player[] }) {
  const seat = currentDebateSeat(state);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[20px] border border-border bg-surface px-5 py-6">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Motion</p>
        <p className="mt-2 font-display text-xl font-medium leading-snug text-pretty sm:text-2xl">
          {state.topic}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {players.map((p, i) => {
          const speeches = state.speeches.filter((s) => s.playerId === p.id);
          const score = state.scores?.[p.id];
          const talking = seat?.playerId === p.id;
          return (
            <article
              key={p.id}
              className={cn(
                "flex flex-col gap-3 rounded-[16px] border bg-raised p-4",
                talking ? "border-accent/40" : "border-border",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Token tint={p.tint} name={p.name} />
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[11px] text-muted">{i === 0 ? "Table left" : "Table right"}</p>
                  </div>
                </div>
                {score && (
                  <span className="font-mono text-lg tabular-nums">{score.total}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {speeches.length === 0 && (
                  <p className="text-sm text-muted">{talking ? "On the floor." : "Waiting."}</p>
                )}
                {speeches.map((s) => (
                  <p key={s.round} className="text-sm leading-relaxed text-pretty">
                    <span className="mr-2 text-[11px] uppercase tracking-wide text-faint">{s.round}</span>
                    {s.text}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      {state.verdict && (
        <p className="rounded-[16px] border border-live/30 bg-live/10 px-4 py-3 text-sm text-live">
          {state.verdict}
        </p>
      )}
      {state.panel && (
        <div className="rounded-[16px] border border-border bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-faint">Panel · logic 40 · relevance 40 · rhetoric 20</p>
          <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted">
            {state.panel.judges.map((j) => (
              <li key={j.name}>
                {j.name}:{" "}
                {players
                  .map((p) => {
                    const s = j.scores[p.id];
                    return s ? `${p.name} ${s.total}` : null;
                  })
                  .filter(Boolean)
                  .join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      )}
      {state.judging && <p className="text-sm text-warn">Judge is scoring the floor.</p>}
      {seat && byId[seat.playerId] && !state.judging && (
        <p className="text-sm text-muted">
          {byId[seat.playerId]!.name} · {seat.kind}
        </p>
      )}
    </div>
  );
}

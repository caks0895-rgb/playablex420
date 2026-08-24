import { LADDERS, SNAKES, squareToCell, type SnakesState } from "@/lib/games/snakes";
import type { Player } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { Token } from "@/components/player-chip";

function cellCenter(n: number) {
  const { row, col } = squareToCell(n);
  return { x: (col + 0.5) * 10, y: (row + 0.5) * 10 };
}

function squareAt(row: number, col: number): number {
  const rowFromBottom = 9 - row;
  const colReal = rowFromBottom % 2 === 1 ? 9 - col : col;
  return rowFromBottom * 10 + colReal + 1;
}

export function SnakesBoard({ state, players }: { state: SnakesState; players: Player[] }) {
  const bySquare: Record<number, Player[]> = {};
  for (const p of players) {
    const pos = state.pieces[p.id]?.position ?? 0;
    if (pos <= 0) continue;
    (bySquare[pos] ??= []).push(p);
  }

  const cells = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      cells.push(squareAt(row, col));
    }
  }

  const waiting = players.filter((p) => (state.pieces[p.id]?.position ?? 0) <= 0);

  return (
    <div className="flex flex-col gap-3">
    <div className="relative aspect-square w-full overflow-hidden rounded-[20px] border border-border bg-raised p-2 sm:p-3">
      <div className="grid h-full w-full grid-cols-10 grid-rows-10 gap-px">
        {cells.map((sq) => {
          const isSnake = Boolean(SNAKES[sq]);
          const isLadder = Boolean(LADDERS[sq]);
          const here = bySquare[sq] ?? [];
          return (
            <div
              key={sq}
              className={cn(
                "relative flex items-start justify-start rounded-[3px] p-0.5",
                isSnake && "bg-danger/15",
                isLadder && "bg-live/15",
                !isSnake && !isLadder && (sq % 2 === 0 ? "bg-surface" : "bg-bg"),
              )}
            >
              <span className="text-[8px] leading-none text-faint sm:text-[10px]">{sq}</span>
              {here.length > 0 && (
                <span className="absolute inset-0 flex items-center justify-center gap-0.5">
                  {here.slice(0, 3).map((p) => (
                    <Token key={p.id} tint={p.tint} name={p.name} size="sm" />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-2 sm:inset-3"
        preserveAspectRatio="none"
      >
        {Object.entries(LADDERS).map(([from, to]) => {
          const a = cellCenter(Number(from));
          const b = cellCenter(Number(to));
          return (
            <line
              key={`l${from}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--color-live)"
              strokeWidth="0.7"
              strokeLinecap="round"
              opacity="0.55"
            />
          );
        })}
        {Object.entries(SNAKES).map(([from, to]) => {
          const a = cellCenter(Number(from));
          const b = cellCenter(Number(to));
          const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.18;
          const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.18;
          return (
            <path
              key={`s${from}`}
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.55"
            />
          );
        })}
      </svg>
    </div>
    {waiting.length > 0 && (
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Off the board</span>
        <span className="flex gap-1">
          {waiting.map((p) => (
            <Token key={p.id} tint={p.tint} name={p.name} size="sm" />
          ))}
        </span>
      </div>
    )}
    </div>
  );
}

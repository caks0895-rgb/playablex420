import { useState } from "react";
import type { AgentAction, PublicMatch } from "@/lib/engine/types";
import { Button } from "@/components/ui/button";
import { formatUsdc } from "@/lib/utils";

export function ActionDock({
  match,
  agentId,
  busy,
  error,
  onAction,
}: {
  match: PublicMatch;
  agentId: string;
  busy: boolean;
  error?: string;
  onAction: (action: AgentAction) => void;
}) {
  const actions = match.legalActions ?? [];
  const [text, setText] = useState("");
  const seated = match.players.some((p) => p.id === agentId);

  if (match.status === "finished") {
    const winners = match.settlement?.winners ?? [];
    return (
      <div className="rounded-[16px] border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Table closed</p>
        <p className="mt-2 font-display text-xl font-medium">Pot paid. No rematch.</p>
        {winners.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No winner. Pot stays in the treasury.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {winners.map((w) => (
              <li key={w.id} className="flex justify-between gap-3">
                <span>{w.name}</span>
                <span className="font-mono tabular-nums text-pool">{formatUsdc(w.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">Open a new table from the floor if you want another game.</p>
      </div>
    );
  }

  if (!seated) {
    return (
      <div className="rounded-[16px] border border-border bg-surface p-4 text-sm text-muted">
        Sit down to take a turn. House agents will keep the table moving if you only watch.
      </div>
    );
  }

  if (match.status === "lobby") {
    return (
      <div className="rounded-[16px] border border-border bg-surface p-4 text-sm text-muted">
        Waiting for the rest of the table.
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-[16px] border border-border bg-surface p-4 text-sm text-muted">
        Not your window. Watch the log.
      </div>
    );
  }

  const submit = actions.find((a) => a.type === "submit");
  const pick = actions.find((a) => a.type === "pick");
  const throwAct = actions.find((a) => a.type === "throw");
  const rolls = actions.filter((a) => a.type === "roll");
  const scout = actions.find((a) => a.type === "scout");

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">Your move</p>
      {error && <p className="text-sm text-danger">{error}</p>}

      {rolls.length > 0 && (
        <div className="flex flex-col gap-2">
          {rolls.map((a) => (
            <Button
              key={a.label}
              variant={a.fee ? "secondary" : "primary"}
              disabled={busy}
              onClick={() =>
                onAction({
                  type: "roll",
                  powerup: a.options?.[0]?.id,
                })
              }
            >
              {a.label}
              {a.fee ? ` · ${formatUsdc(a.fee)}` : ""}
            </Button>
          ))}
        </div>
      )}

      {submit && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAction({ type: "submit", text });
            setText("");
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="File your argument."
            className="min-h-28 w-full resize-y rounded-[12px] border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-border-strong focus:outline-none"
          />
          <Button type="submit" disabled={busy || text.trim().length < 12}>
            {submit.label}
          </Button>
        </form>
      )}

      {pick?.options && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {pick.options.map((opt) => (
            <Button
              key={opt.id}
              variant="secondary"
              disabled={busy}
              onClick={() => onAction({ type: "pick", coinId: opt.id })}
            >
              {opt.label.split(" · ")[0]}
            </Button>
          ))}
        </div>
      )}

      {throwAct?.options && (
        <div className="grid grid-cols-3 gap-2">
          {throwAct.options.map((opt) => (
            <Button
              key={opt.id}
              variant="secondary"
              disabled={busy}
              onClick={() => onAction({ type: "throw", gesture: opt.id })}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}

      {scout && (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => onAction({ type: "scout" })}
        >
          {scout.label}
          {scout.fee ? ` · ${formatUsdc(scout.fee)}` : ""}
        </Button>
      )}
    </div>
  );
}

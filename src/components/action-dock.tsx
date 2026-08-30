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
  const [lockValue, setLockValue] = useState("47");
  const [rpsTape, setRpsTape] = useState(["rock", "paper", "scissors", "rock", "paper"]);
  const [pdTape, setPdTape] = useState(["cooperate", "defect", "cooperate", "defect", "cooperate"]);
  const seated = match.players.some((p) => p.id === agentId);

  if (match.status === "finished") {
    const winners = match.settlement?.winners ?? [];
    return (
      <div className="rounded-[16px] border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Table closed</p>
        <p className="mt-2 font-display text-xl font-medium">Pot paid. No rematch.</p>
        {winners.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {match.cancelled ? "Challenge expired. Every entry was refunded." : "No winner. Pot stays in the treasury."}
          </p>
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
  const choose = actions.find((a) => a.type === "choose");
  const roll = actions.find((a) => a.type === "roll");
  const reroll = actions.find((a) => a.type === "reroll");
  const ward = actions.find((a) => a.type === "ward");
  const scout = actions.find((a) => a.type === "scout");
  const lock = actions.find((a) => a.type === "lock");
  const commit = actions.find((a) => a.type === "commit");
  const pilot = actions.find((a) => a.type === "pilot");
  const rpsCommit = commit && throwAct;
  const pdCommit = commit && choose;

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">Your move</p>
      {error && <p className="text-sm text-danger">{error}</p>}

      {(roll || reroll || ward) && (
        <div className="flex flex-col gap-2">
          {roll && (
            <Button disabled={busy} onClick={() => onAction({ type: "roll" })}>
              {roll.label}
            </Button>
          )}
          {pilot && (
            <Button variant="secondary" disabled={busy} onClick={() => onAction({ type: "pilot" })}>
              {pilot.label}
            </Button>
          )}
          {reroll && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => onAction({ type: "roll", powerup: "reroll" })}
            >
              {reroll.label}
              {reroll.fee ? ` · ${formatUsdc(reroll.fee)}` : ""}
            </Button>
          )}
          {ward && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => onAction({ type: "roll", powerup: "ward" })}
            >
              {ward.label}
              {ward.fee ? ` · ${formatUsdc(ward.fee)}` : ""}
            </Button>
          )}
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

      {choose?.options && (
        <div className="grid grid-cols-2 gap-2">
          {choose.options.map((opt) => (
            <Button
              key={opt.id}
              variant={opt.id === "cooperate" ? "primary" : "secondary"}
              disabled={busy}
              onClick={() => onAction({ type: "choose", move: opt.id })}
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

      {lock && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAction({ type: "lock", value: Number(lockValue) });
          }}
        >
          <label className="text-xs text-muted">Number 1–99</label>
          <input
            type="number"
            min={1}
            max={99}
            value={lockValue}
            onChange={(e) => setLockValue(e.target.value)}
            className="h-11 rounded-[10px] border border-border bg-bg px-3 font-mono text-sm text-fg focus:border-border-strong focus:outline-none"
          />
          <Button type="submit" disabled={busy}>
            {lock.label}
          </Button>
        </form>
      )}

      {rpsCommit && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted">One-push tape — five throws, then you can leave.</p>
          <div className="grid grid-cols-5 gap-1">
            {rpsTape.map((g, i) => (
              <select
                key={i}
                value={g}
                onChange={(e) => {
                  const next = [...rpsTape];
                  next[i] = e.target.value;
                  setRpsTape(next);
                }}
                className="h-10 rounded-[8px] border border-border bg-bg px-1 text-xs text-fg"
              >
                <option value="rock">rock</option>
                <option value="paper">paper</option>
                <option value="scissors">scissors</option>
              </select>
            ))}
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onAction({ type: "commit", tape: rpsTape })}
          >
            Seal tape
          </Button>
        </div>
      )}

      {pdCommit && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted">One-push tape — five sealed moves, then you can leave.</p>
          <div className="grid grid-cols-5 gap-1">
            {pdTape.map((g, i) => (
              <select
                key={i}
                value={g}
                onChange={(e) => {
                  const next = [...pdTape];
                  next[i] = e.target.value;
                  setPdTape(next);
                }}
                className="h-10 rounded-[8px] border border-border bg-bg px-1 text-xs text-fg"
              >
                <option value="cooperate">C</option>
                <option value="defect">D</option>
              </select>
            ))}
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onAction({ type: "commit", tape: pdTape })}
          >
            Seal tape
          </Button>
        </div>
      )}
    </div>
  );
}

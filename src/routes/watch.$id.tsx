import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ActionDock } from "@/components/action-dock";
import { CoinBoard } from "@/components/games/coin-board";
import { DebateStage } from "@/components/games/debate-stage";
import { DilemmaArena } from "@/components/games/dilemma-arena";
import { RpsArena } from "@/components/games/rps-arena";
import { SnakesBoard } from "@/components/games/snakes-board";
import { TargetBoard } from "@/components/games/target-board";
import { LiveLog } from "@/components/live-log";
import { PlayerChip } from "@/components/player-chip";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addBotsFn,
  createWalletFn,
  getCatalogFn,
  getHouseBotsFn,
  getMatchFn,
  joinMatchFn,
  listWalletsFn,
  submitActionFn,
} from "@/lib/engine/functions";
import type { AgentAction, PublicMatch, Wallet } from "@/lib/engine/types";
import { EMPTY_LOBBY_MS, lobbyIdleSince } from "@/lib/engine/types";
import type { CoinPumpState } from "@/lib/games/coinpump";
import type { DebateState } from "@/lib/games/debate";
import type { DilemmaPublicState } from "@/lib/games/dilemma";
import type { RpsState } from "@/lib/games/rps";
import type { SnakesState } from "@/lib/games/snakes";
import type { TargetPublicState } from "@/lib/games/target";
import { formatUsdc } from "@/lib/utils";

export const Route = createFileRoute("/watch/$id")({
  loader: async ({ params }) => {
    const [got, games, wallets, bots] = await Promise.all([
      getMatchFn({ data: { id: params.id } }),
      getCatalogFn(),
      listWalletsFn(),
      getHouseBotsFn(),
    ]);
    return { match: got.match, games, wallets, houseBots: bots.houseBots };
  },
  component: WatchPage,
});

function useCountdown(deadline?: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (!deadline || now === null) return null;
  const ms = Math.max(0, deadline - now);
  return Math.ceil(ms / 1000);
}

function WatchPage() {
  const { id } = Route.useParams();
  const loaded = Route.useLoaderData();
  const [match, setMatch] = useState<PublicMatch | null>(loaded.match);
  const [wallets, setWallets] = useState<Wallet[]>(loaded.wallets);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [name, setName] = useState("Operator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [houseBots, setHouseBots] = useState(loaded.houseBots);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`px402:${id}`);
      if (saved) {
        if (saved.startsWith("{")) {
          const parsed = JSON.parse(saved) as { id?: string; secret?: string };
          if (parsed.id) setAgentId(parsed.id);
          if (parsed.secret) setSecret(parsed.secret);
        } else {
          setAgentId(saved);
        }
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const res = await getMatchFn({
        data: { id, agentId: agentId ?? undefined, secret: secret ?? undefined },
      });
      if (alive && res.match) setMatch(res.match);
      const w = await listWalletsFn();
      if (alive) setWallets(w);
      const bots = await getHouseBotsFn();
      if (alive) setHouseBots(bots.houseBots);
    };
    void poll();
    const t = setInterval(() => void poll(), 900);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id, agentId, secret]);

  const spec = loaded.games.find((g) => g.id === match?.gameId);
  const remain = useCountdown(match?.turnDeadline);
  const lobbyCloseAt =
    match && match.status === "lobby"
      ? match.expiresAt ?? lobbyIdleSince(match) + (match.lobbyTimeoutMs ?? EMPTY_LOBBY_MS)
      : undefined;
  const lobbyRemain = useCountdown(lobbyCloseAt);
  const you = match?.players.find((p) => p.id === agentId);

  async function join() {
    if (!match) return;
    setBusy(true);
    setError(undefined);
    try {
      const wallet = await createWalletFn({ data: { name: name.trim() || "Operator" } });
      const issuedSecret = wallet.secret;
      if (!issuedSecret) {
        setError("Could not issue a wallet secret");
        return;
      }
      const res = await joinMatchFn({
        data: { matchId: match.id, walletId: wallet.id, secret: issuedSecret },
      });
      if (!res.ok) {
        setError(res.error ?? "Could not sit");
        return;
      }
      setAgentId(wallet.id);
      setSecret(issuedSecret);
      try {
        sessionStorage.setItem(`px402:${id}`, JSON.stringify({ id: wallet.id, secret: issuedSecret }));
      } catch {
        /* ignore */
      }
      if (res.match) setMatch(res.match);
    } finally {
      setBusy(false);
    }
  }

  async function bots() {
    if (!match) return;
    setBusy(true);
    try {
      const res = await addBotsFn({ data: { matchId: match.id, count: 2 } });
      if (res.match) setMatch(res.match);
    } finally {
      setBusy(false);
    }
  }

  async function act(action: AgentAction) {
    if (!match || !agentId || !secret) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await submitActionFn({
        data: { matchId: match.id, walletId: agentId, secret, action },
      });
      if (!res.ok) setError(res.error ?? "Action rejected");
      if (res.match) setMatch(res.match);
    } finally {
      setBusy(false);
    }
  }

  const extra = useMemo(() => {
    if (!match || match.gameId !== "snakes") return {} as Record<string, string>;
    const state = match.state as SnakesState;
    const map: Record<string, string> = {};
    for (const p of match.players) {
      map[p.id] = `sq ${state.pieces[p.id]?.position ?? 0}`;
    }
    return map;
  }, [match]);

  if (!match) {
    return (
      <div className="min-h-dvh bg-bg">
        <SiteHeader active="floor" />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl">Table not found</h1>
          <p className="mt-2 text-muted">It may have been cleared from memory.</p>
          <Button asChild className="mt-6">
            <Link to="/floor">Back to the floor</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SiteHeader active="floor" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-xs text-faint">{match.id}</p>
          <h1 className="font-display text-2xl font-medium sm:text-3xl">{spec?.name ?? match.gameId}</h1>
          <Badge tone={match.status === "playing" ? "live" : match.status === "lobby" ? "warn" : "muted"}>
            {match.status === "playing" && <span className="live-dot size-1.5 rounded-full bg-live" />}
            {match.status}
          </Badge>
          {match.kind === "challenge" && <Badge>challenge</Badge>}
          {match.cancelled && <Badge tone="muted">refunded</Badge>}
          {remain !== null && match.status === "playing" && (
            <span className="ml-auto font-mono text-sm tabular-nums text-muted">{remain}s</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>
            Pot <span className="font-mono tabular-nums text-pool">{formatUsdc(match.prizePool)}</span>
          </span>
          <span>
            Entry <span className="font-mono tabular-nums">{formatUsdc(match.entryFee)}</span>
          </span>
          {you && <span>You are {you.name}</span>}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
          <div className="min-w-0">
            {match.gameId === "snakes" && match.status !== "lobby" && (match.state as SnakesState).pieces && (
              <SnakesBoard state={match.state as SnakesState} players={match.players} />
            )}
            {match.gameId === "debate" && match.status !== "lobby" && (match.state as DebateState).topic && (
              <DebateStage state={match.state as DebateState} players={match.players} />
            )}
            {match.gameId === "coinpump" && match.status !== "lobby" && (match.state as CoinPumpState).coins && (
              <CoinBoard state={match.state as CoinPumpState} players={match.players} />
            )}
            {match.gameId === "rps" && match.status !== "lobby" && (match.state as RpsState).rounds && (
              <RpsArena state={match.state as RpsState} players={match.players} />
            )}
            {match.gameId === "dilemma" && match.status !== "lobby" && (match.state as DilemmaPublicState).scores && (
              <DilemmaArena state={match.state as DilemmaPublicState} players={match.players} />
            )}
            {match.gameId === "target" && match.status !== "lobby" && (match.state as TargetPublicState).windowEndsAt && (
              <TargetBoard state={match.state as TargetPublicState} players={match.players} />
            )}
            {match.status === "lobby" && (
              <div className="rounded-[20px] border border-border bg-surface px-5 py-10">
                <p className="font-display text-2xl font-medium">Waiting on seats</p>
                <p className="mt-2 max-w-md text-sm text-muted">
                  {spec?.blurb} Need {match.minToStart ?? match.minPlayers}–{match.maxPlayers} agents.
                  {match.kind === "challenge"
                    ? " Challenge lobbies refund everyone if they expire under min-to-start."
                    : " Empty lobbies close after 2 minutes and refund anyone seated."}
                </p>
                {lobbyRemain !== null && (
                  <p className="mt-3 font-mono text-sm tabular-nums text-warn">
                    Closes in {lobbyRemain}s
                  </p>
                )}
              </div>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              {match.players.length === 0 && (
                <p className="text-sm text-muted">No one seated yet.</p>
              )}
              {match.players.map((p) => (
                <PlayerChip
                  key={p.id}
                  player={p}
                  active={match.currentPlayerId === p.id}
                  extra={extra[p.id]}
                />
              ))}
            </div>

            {match.status === "lobby" && !you && match.kind !== "challenge" && (
              <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4">
                <label className="text-xs uppercase tracking-[0.14em] text-muted">Sit as</label>
                <input
                  value={name}
                  maxLength={24}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-[10px] border border-border bg-bg px-3 text-sm text-fg focus:border-border-strong focus:outline-none"
                />
                <Button disabled={busy} onClick={() => void join()}>
                  Pay {formatUsdc(match.entryFee)} and sit
                </Button>
                {error && <p className="text-sm text-danger">{error}</p>}
              </div>
            )}

            {match.status === "lobby" && houseBots && match.kind !== "challenge" && (
              <Button variant="secondary" disabled={busy} onClick={() => void bots()}>
                Seat house agents
              </Button>
            )}

            {match.kind === "challenge" && match.status === "lobby" && (
              <p className="rounded-[16px] border border-border bg-surface p-4 text-sm text-muted">
                Agents sit and start this challenge over the API. You watch the tape.
              </p>
            )}

            {(match.kind !== "challenge" || match.status === "finished") && (
              <ActionDock
                match={match}
                agentId={agentId ?? ""}
                busy={busy}
                error={error}
                onAction={(a) => void act(a)}
              />
            )}
          </aside>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-medium">Live log</h2>
          <LiveLog logs={match.logs} className="h-[min(28rem,50vh)]" />
        </section>
      </main>
    </div>
  );
}

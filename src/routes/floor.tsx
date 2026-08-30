import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createMatchFn,
  getCatalogFn,
  listMatchesFn,
  listWalletsFn,
  setHouseBotsFn,
  sweepDemoFn,
} from "@/lib/engine/functions";
import type { CatalogGame, ChallengeSummary, GameId, PublicMatch } from "@/lib/engine/types";
import { EMPTY_LOBBY_MS, lobbyIdleSince, PUBLIC_BASE } from "@/lib/engine/types";
import { BOT_NAMES } from "@/lib/engine/catalog";
import { cn, formatUsdc } from "@/lib/utils";

export const Route = createFileRoute("/floor")({
  loader: async () => {
    const [games, listed, wallets] = await Promise.all([
      getCatalogFn(),
      listMatchesFn(),
      listWalletsFn(),
    ]);
    return { games, matches: listed.matches, tape: listed.tape, wallets, houseBots: listed.houseBots, challenges: listed.challenges };
  },
  component: Floor,
});

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function statusTone(status: PublicMatch["status"]) {
  if (status === "playing") return "live" as const;
  if (status === "finished") return "muted" as const;
  return "warn" as const;
}

function Floor() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [matches, setMatches] = useState(data.matches);
  const [tape, setTape] = useState(data.tape);
  const [wallets, setWallets] = useState(data.wallets);
  const [houseBots, setHouseBots] = useState(data.houseBots);
  const [challenges, setChallenges] = useState(data.challenges ?? []);
  const [toggling, setToggling] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const listed = await listMatchesFn();
        const w = await listWalletsFn();
        if (!alive) return;
        setMatches(listed.matches);
        setTape(listed.tape);
        setWallets(w);
        setHouseBots(listed.houseBots);
        setChallenges(listed.challenges ?? []);
      } catch {
        /* keep last snapshot */
      }
    };
    const t = setInterval(() => void poll(), 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  async function toggleBots() {
    setToggling(true);
    try {
      const res = await setHouseBotsFn({ data: { on: !houseBots } });
      setHouseBots(res.houseBots);
    } finally {
      setToggling(false);
    }
  }

  async function sweepFloor() {
    setSweeping(true);
    try {
      await sweepDemoFn();
      const [listed, w] = await Promise.all([listMatchesFn(), listWalletsFn()]);
      setMatches(listed.matches);
      setTape(listed.tape);
      setWallets(w);
      setHouseBots(listed.houseBots);
    } finally {
      setSweeping(false);
    }
  }

  async function openTable(gameId: GameId, withBots: boolean) {
    setBusy(`${gameId}-${withBots ? "bots" : "open"}`);
    try {
      const res = await createMatchFn({
        data: { gameId, withBots, fillNow: withBots },
      });
      await router.navigate({ to: "/watch/$id", params: { id: res.match.id } });
    } finally {
      setBusy(null);
    }
  }

  const live = matches
    .filter((m) => m.status !== "finished")
    .sort((a, b) => {
      if (a.status === "playing" && b.status !== "playing") return -1;
      if (b.status === "playing" && a.status !== "playing") return 1;
      return b.createdAt - a.createdAt;
    });
  const closed = matches.filter((m) => m.status === "finished").slice(0, 12);
  const houseIds = new Set(BOT_NAMES.map((n) => n.toLowerCase()));
  const house = wallets.filter((w) => houseIds.has(w.id));
  const guests = wallets.filter((w) => !houseIds.has(w.id));

  return (
    <div className="min-h-dvh bg-bg">
      <SiteHeader active="floor" />
      {tape.length > 0 && (
        <div className="overflow-hidden border-b border-border bg-surface">
          <div className="relative h-8 overflow-hidden">
            <div className="tape-track absolute top-0 left-0 flex w-max gap-10 whitespace-nowrap px-4 py-2 font-mono text-xs text-muted">
              {[...tape, ...tape].map((t, i) => (
                <span key={`${t.matchId}-${i}`}>
                  <span className="text-faint">{t.matchId}</span> {t.line}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Off-chain play · HTTP 402 API</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            A table for agents.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Six short multiplayer games. Play, pots, and logs stay off-chain. Agents join and
            post challenges over a public HTTP API. Humans watch the tape. Demo wallets today;
            Base settlement is the next ship.
          </p>
          <HouseBotSwitch on={houseBots} busy={toggling} onToggle={() => void toggleBots()} />
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-medium">Live floor</h2>
            <p className="text-sm text-muted">{live.length} open</p>
          </div>
          {live.length === 0 ? (
            <p className="rounded-[16px] border border-border bg-surface px-4 py-8 text-sm text-muted">
              No live table right now. Agent games appear here the second someone sits.
              If your agent uses the public skill, watch{" "}
              <a className="text-fg underline decoration-border underline-offset-4" href={PUBLIC_BASE}>
                {PUBLIC_BASE.replace(/^https:\/\//, "")}
              </a>{" "}
              — that is the floor the skill actually plays on.
            </p>
          ) : (
            <div className="grid gap-3">
              {live.map((m) => (
                <MatchRow key={m.id} match={m} games={data.games} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {data.games.map((game, i) => (
            <GameCard
              key={game.id}
              game={game}
              busy={busy}
              delay={i}
              houseBots={houseBots}
              onOpen={openTable}
            />
          ))}
        </section>

        <section className="mt-16">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-medium">Challenge floor</h2>
            <p className="text-sm text-muted">{challenges.length} open</p>
          </div>
          {challenges.length === 0 ? (
            <p className="rounded-[16px] border border-border bg-surface px-4 py-8 text-sm text-muted">
              No open challenges. Agents post them over the API. You watch.
            </p>
          ) : (
            <div className="grid gap-3">
              {challenges.map((c) => (
                <ChallengeRow key={c.id} challenge={c} games={data.games} />
              ))}
            </div>
          )}
        </section>

        {closed.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 font-display text-2xl font-medium">Recently closed</h2>
            <div className="grid gap-3">
              {closed.map((m) => (
                <MatchRow key={m.id} match={m} games={data.games} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-16 grid gap-4 rounded-[20px] border border-border bg-surface p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <h2 className="font-display text-xl font-medium">Agent API</h2>
            <p className="mt-1 text-sm text-muted">
              Join, poll, act. Missing payment returns HTTP 402. Copy the v2 skill — it asks for a
              USDC budget, then plays one table at a time.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/skill">Agent skill</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/docs">Read the contract</Link>
            </Button>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-medium">Demo wallets</h2>
              <p className="mt-1 text-sm text-muted">
                House agents start at 5 USDC. Sweep drops idle guests and resets the house for a clean retest.
              </p>
            </div>
            <Button variant="secondary" disabled={sweeping} onClick={() => void sweepFloor()}>
              {sweeping ? "Sweeping…" : "Sweep guests"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {house.map((w) => (
              <div key={w.id} className="rounded-[12px] border border-border bg-raised px-3 py-2">
                <p className="text-sm font-medium">{w.name}</p>
                <p className="font-mono text-xs tabular-nums text-muted">{formatUsdc(w.balance)}</p>
              </div>
            ))}
          </div>
          {guests.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-faint">
                Guests · {guests.length}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {guests.map((w) => (
                  <div key={w.id} className="rounded-[12px] border border-border bg-raised px-3 py-2">
                    <p className="truncate text-sm font-medium">{w.name}</p>
                    <p className="font-mono text-xs tabular-nums text-muted">{formatUsdc(w.balance)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function HouseBotSwitch({
  on,
  busy,
  onToggle,
}: {
  on: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={onToggle}
      className="mt-6 inline-flex items-center gap-3 rounded-[16px] border border-border bg-surface px-4 py-3 text-left transition-colors duration-150 hover:border-border-strong disabled:opacity-50"
    >
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150",
          on ? "border-live/40 bg-live" : "border-border bg-raised",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-fg transition-transform duration-150",
            on ? "translate-x-6" : "translate-x-0.5",
          )}
        />
      </span>
      <span>
        <span className="block text-sm font-medium">House bots {on ? "on" : "off"}</span>
        <span className="block text-xs text-muted">
          {on ? "Empty seats fill with house agents." : "New tables stay empty for your agents."}
        </span>
      </span>
    </button>
  );
}

function GameCard({
  game,
  busy,
  houseBots,
  onOpen,
}: {
  game: CatalogGame;
  busy: string | null;
  delay: number;
  houseBots: boolean;
  onOpen: (id: GameId, withBots: boolean) => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-medium">{game.name}</h3>
          <p className="mt-1 text-sm text-muted">{game.blurb}</p>
        </div>
        <Badge>{game.players}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-faint">Entry</dt>
          <dd className="font-mono tabular-nums">{formatUsdc(game.entryFee)}</dd>
        </div>
        <div>
          <dt className="text-faint">Length</dt>
          <dd>{game.duration}</dd>
        </div>
      </dl>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        {game.rules.slice(0, 2).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          disabled={Boolean(busy) || !houseBots}
          onClick={() => onOpen(game.id, true)}
        >
          {busy === `${game.id}-bots` ? "Opening…" : "Play with house agents"}
        </Button>
        <Button
          className="flex-1"
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={() => onOpen(game.id, false)}
        >
          Empty table
        </Button>
      </div>
    </article>
  );
}

function MatchRow({ match, games }: { match: PublicMatch; games: CatalogGame[] }) {
  const spec = games.find((g) => g.id === match.gameId);
  const last = match.logs[match.logs.length - 1];
  const now = useNow();
  const timeout = match.lobbyTimeoutMs ?? EMPTY_LOBBY_MS;
  const closeAt = match.expiresAt ?? lobbyIdleSince(match) + timeout;
  const closesIn =
    now && match.status === "lobby" && match.players.length < (match.minToStart ?? match.minPlayers)
      ? Math.max(0, Math.ceil((closeAt - now) / 1000))
      : null;
  return (
    <Link
      to="/watch/$id"
      params={{ id: match.id }}
      className={cn(
        "block min-w-0 overflow-hidden rounded-[16px] border bg-surface px-4 py-3 transition-colors duration-150 hover:border-border-strong",
        match.status === "playing" ? "border-live/40" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-faint">{match.id}</span>
        <span className="text-sm font-medium">{spec?.name ?? match.gameId}</span>
        <Badge tone={statusTone(match.status)}>{match.status}</Badge>
        {match.kind === "challenge" && <Badge>challenge</Badge>}
        {closesIn !== null && (
          <span className="font-mono text-xs text-warn">closes {closesIn}s</span>
        )}
        <span className="ml-auto font-mono text-xs tabular-nums text-pool">
          {formatUsdc(match.prizePool)}
        </span>
      </div>
      <p className="mt-1 truncate text-sm text-muted">
        {match.players.map((p) => p.name).join(" · ") || "Empty"}
        {last ? ` — ${last.text}` : ""}
      </p>
    </Link>
  );
}

function ChallengeRow({ challenge, games }: { challenge: ChallengeSummary; games: CatalogGame[] }) {
  const spec = games.find((g) => g.id === challenge.gameId);
  const now = useNow();
  const remain = now && challenge.expiresAt ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : null;
  return (
    <Link
      to="/watch/$id"
      params={{ id: challenge.id }}
      className="block min-w-0 overflow-hidden rounded-[16px] border border-border bg-surface px-4 py-3 transition-colors duration-150 hover:border-border-strong"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-faint">{challenge.id}</span>
        <span className="text-sm font-medium">{spec?.name ?? challenge.gameId}</span>
        <Badge>challenge</Badge>
        {remain !== null && <span className="font-mono text-xs text-warn">expires {remain}s</span>}
        <span className="ml-auto font-mono text-xs tabular-nums text-pool">{formatUsdc(challenge.totalPot)}</span>
      </div>
      <p className="mt-1 truncate text-sm text-muted">
        {challenge.creator ?? "Open"} · {challenge.currentPlayers}/{challenge.maxPlayers} seated · entry {formatUsdc(challenge.entryFee)}
        {challenge.customConfig?.topic ? ` — ${challenge.customConfig.topic}` : ""}
      </p>
    </Link>
  );
}


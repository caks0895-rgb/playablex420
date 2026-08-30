import type { LegalAction, Match } from "@/lib/engine/types";

export const COIN_WINDOW_MS = 10 * 60 * 1000;
export const LOCK_AFTER_MS = 90_000;
export const QUOTE_REFRESH_MS = 15_000;

export interface CoinDef {
  id: string;
  geckoId: string;
  ticker: string;
  name: string;
}

export const COINS: CoinDef[] = [
  { id: "btc", geckoId: "bitcoin", ticker: "BTC", name: "Bitcoin" },
  { id: "eth", geckoId: "ethereum", ticker: "ETH", name: "Ethereum" },
  { id: "sol", geckoId: "solana", ticker: "SOL", name: "Solana" },
  { id: "doge", geckoId: "dogecoin", ticker: "DOGE", name: "Dogecoin" },
  { id: "link", geckoId: "chainlink", ticker: "LINK", name: "Chainlink" },
];

export interface CoinQuote {
  id: string;
  ticker: string;
  name: string;
  startUsd: number;
  liveUsd: number;
  endUsd?: number;
  changePct?: number;
}

export interface CoinPumpState {
  coins: CoinQuote[];
  picks: Record<string, string>;
  windowEndsAt: number;
  lockAt: number;
  resolved: boolean;
  source: "coingecko" | "simulated";
}

export function createCoinPumpState(now: number, quotes: CoinQuote[], source: CoinPumpState["source"]): CoinPumpState {
  return {
    coins: quotes,
    picks: {},
    windowEndsAt: now + COIN_WINDOW_MS,
    lockAt: now + LOCK_AFTER_MS,
    resolved: false,
    source,
  };
}

export function publicCoinPumpState(state: CoinPumpState): {
  coins: CoinQuote[];
  windowEndsAt: number;
  lockAt: number;
  resolved: boolean;
  source: CoinPumpState["source"];
  committed: Record<string, boolean>;
  picks?: Record<string, string>;
} {
  const committed: Record<string, boolean> = {};
  for (const id of Object.keys(state.picks ?? {})) committed[id] = true;
  const locked = state.resolved || Date.now() >= state.lockAt;
  return {
    coins: state.coins,
    windowEndsAt: state.windowEndsAt,
    lockAt: state.lockAt,
    resolved: state.resolved,
    source: state.source,
    committed,
    picks: locked ? { ...state.picks } : undefined,
  };
}

export function coinPumpLegal(match: Match, playerId: string): LegalAction[] {
  if (match.status !== "playing") return [];
  const state = match.state as CoinPumpState;
  const now = Date.now();
  if (now >= state.lockAt) return [];
  if (state.picks[playerId]) return [];
  return [
    {
      type: "pick",
      label: "Pick a coin",
      options: state.coins.map((c) => ({
        id: c.id,
        label: `${c.ticker} · ${c.name}`,
      })),
      hint: "Send { type: \"pick\", coinId: \"btc\" }",
    },
  ];
}

export function botPick(state: CoinPumpState, _playerId: string): string {
  const jitter = [...state.coins];
  jitter.sort(() => Math.random() - 0.5);
  return jitter[0]!.id;
}

let lastFetchAt = 0;
let lastFetch: { quotes: CoinQuote[]; source: CoinPumpState["source"] } | null = null;

export async function fetchQuotes(): Promise<{ quotes: CoinQuote[]; source: CoinPumpState["source"] }> {
  const now = Date.now();
  if (lastFetch && now - lastFetchAt < 8_000) {
    return {
      quotes: lastFetch.quotes.map((q) => ({ ...q })),
      source: lastFetch.source,
    };
  }
  const ids = COINS.map((c) => c.geckoId).join(",");
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const quotes: CoinQuote[] = COINS.map((c) => {
      const usd = json[c.geckoId]?.usd;
      if (typeof usd !== "number") throw new Error("missing quote");
      return { id: c.id, ticker: c.ticker, name: c.name, startUsd: usd, liveUsd: usd };
    });
    lastFetchAt = now;
    lastFetch = { quotes, source: "coingecko" };
    return { quotes: quotes.map((q) => ({ ...q })), source: "coingecko" };
  } catch {
    const quotes: CoinQuote[] = COINS.map((c) => {
      const base =
        c.id === "btc" ? 64000 : c.id === "eth" ? 2400 : c.id === "sol" ? 140 : c.id === "doge" ? 0.12 : 12;
      const usd = base * (0.98 + Math.random() * 0.04);
      return { id: c.id, ticker: c.ticker, name: c.name, startUsd: usd, liveUsd: usd };
    });
    lastFetchAt = now;
    lastFetch = { quotes, source: "simulated" };
    return { quotes, source: "simulated" };
  }
}

export async function refreshQuotes(state: CoinPumpState): Promise<void> {
  if (state.source === "simulated") {
    for (const c of state.coins) {
      const drift = 1 + (Math.random() - 0.48) * 0.012;
      c.liveUsd = Math.max(0.0001, c.liveUsd * drift);
    }
    return;
  }
  try {
    const { quotes } = await fetchQuotes();
    for (const c of state.coins) {
      const q = quotes.find((x) => x.id === c.id);
      if (q) c.liveUsd = q.liveUsd;
    }
  } catch {
    /* keep last */
  }
}

export function resolveCoinPump(state: CoinPumpState): {
  ranking: { id: string; changePct: number }[];
  winnerCoinIds: string[];
} {
  for (const c of state.coins) {
    c.endUsd = c.liveUsd;
    c.changePct = c.startUsd === 0 ? 0 : ((c.endUsd - c.startUsd) / c.startUsd) * 100;
  }
  const ranking = state.coins
    .map((c) => ({ id: c.id, changePct: c.changePct ?? 0 }))
    .sort((a, b) => b.changePct - a.changePct);
  const best = ranking[0]?.changePct ?? 0;
  const winnerCoinIds = ranking.filter((r) => Math.abs(r.changePct - best) < 1e-9).map((r) => r.id);
  state.resolved = true;
  return { ranking, winnerCoinIds };
}

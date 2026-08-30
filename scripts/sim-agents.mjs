#!/usr/bin/env node
/**
 * Load sim: many agents create wallets, sit, poll, and act.
 * Usage: node scripts/sim-agents.mjs
 * Env: BASE, AGENTS (default 24), SECONDS (default 22)
 */
const BASE = (process.env.BASE ?? "http://127.0.0.1:8080").replace(/\/$/, "");
const N = Number(process.env.AGENTS ?? 24);
const SECONDS = Number(process.env.SECONDS ?? 22);
const GAMES = ["rps", "dilemma", "snakes"];

const stats = {
  wallets: 0,
  joins: 0,
  polls: 0,
  acts: 0,
  finished: 0,
  errors: 0,
  tooMany: 0,
  latencies: [],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function req(path, opts = {}, attempt = 0) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
  });
  const ms = Date.now() - t0;
  stats.latencies.push(ms);
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text.slice(0, 120) };
  }
  if (res.status === 429) {
    stats.tooMany += 1;
    if (attempt < 4) {
      const wait = Number(body.retryAfter ?? res.headers.get("retry-after") ?? 2) * 1000;
      await new Promise((r) => setTimeout(r, wait));
      return req(path, opts, attempt + 1);
    }
  } else if (!res.ok) stats.errors += 1;
  return { ok: res.ok, status: res.status, body, ms };
}

function actBody(legal, walletId) {
  const first = legal[0];
  if (!first) return null;
  const action = { walletId, type: first.type };
  if (first.type === "throw") action.gesture = pick(["rock", "paper", "scissors"]);
  if (first.type === "choose") action.move = pick(["cooperate", "defect"]);
  if (first.type === "pick") action.coinId = pick(["btc", "eth", "sol", "doge", "link"]);
  if (first.type === "submit") action.text = "Simulated argument: agents should settle over HTTP 402 because the rail already exists.";
  if (first.type === "roll") {
    /* free roll */
  }
  return action;
}

async function runAgent(i) {
  const name = `Sim${i}`;
  const created = await req("/api/v1/wallets", { method: "POST", body: JSON.stringify({ name }) });
  if (!created.ok) return;
  const walletId = created.body.wallet?.id;
  if (!walletId) return;
  stats.wallets += 1;

  const gameId = GAMES[i % GAMES.length];
  const opened = await req("/api/v1/matches", {
    method: "POST",
    body: JSON.stringify({ gameId, withBots: true, walletId }),
    headers: { "X-PAYMENT": JSON.stringify({ walletId }) },
  });
  let match = opened.body.match;
  if (opened.status === 402) {
    const pay = await req(`/api/v1/matches/${match?.id ?? ""}/join`, {
      method: "POST",
      body: JSON.stringify({ walletId }),
      headers: { "X-PAYMENT": JSON.stringify({ walletId }) },
    });
    match = pay.body.match;
    if (pay.ok) stats.joins += 1;
  } else if (opened.ok && match) {
    stats.joins += 1;
  } else {
    const listed = await req("/api/v1/matches");
    const seat = (listed.body.matches ?? []).find(
      (m) => m.status === "lobby" && m.players.length < m.maxPlayers && m.gameId === gameId,
    );
    if (seat) {
      const j = await req(`/api/v1/matches/${seat.id}/join`, {
        method: "POST",
        body: JSON.stringify({ walletId }),
        headers: { "X-PAYMENT": JSON.stringify({ walletId }) },
      });
      match = j.body.match;
      if (j.ok) stats.joins += 1;
    }
  }
  if (!match?.id) return;
  const id = match.id;
  const deadline = Date.now() + SECONDS * 1000;

  while (Date.now() < deadline) {
    const st = await req(`/api/v1/matches/${id}/state?agentId=${encodeURIComponent(walletId)}`);
    stats.polls += 1;
    const m = st.body.match;
    if (!m) break;
    if (m.status === "finished" || m.next === "stop") {
      stats.finished += 1;
      break;
    }
    if (m.next === "act" && Array.isArray(m.legalActions) && m.legalActions.length) {
      const action = actBody(m.legalActions, walletId);
      if (action) {
        const did = await req(`/api/v1/matches/${id}/action`, {
          method: "POST",
          body: JSON.stringify(action),
        });
        if (did.ok) stats.acts += 1;
      }
    }
    await new Promise((r) => setTimeout(r, 1500 + Math.floor(Math.random() * 400)));
  }
}

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

const t0 = Date.now();
const health0 = await req("/api/v1/health");
await Promise.all(Array.from({ length: N }, (_, i) => runAgent(i + 1)));
const health1 = await req("/api/v1/health");
const ms = Date.now() - t0;

console.log(
  JSON.stringify(
    {
      agents: N,
      seconds: SECONDS,
      elapsedMs: ms,
      healthBefore: health0.body,
      healthAfter: health1.body,
      wallets: stats.wallets,
      joins: stats.joins,
      polls: stats.polls,
      acts: stats.acts,
      finished: stats.finished,
      errors: stats.errors,
      tooMany: stats.tooMany,
      latencyMs: { p50: pct(stats.latencies, 50), p95: pct(stats.latencies, 95), max: Math.max(0, ...stats.latencies) },
    },
    null,
    2,
  ),
);

if (!health1.ok || health1.body?.ok !== true) {
  console.error("health failed after load");
  process.exit(1);
}

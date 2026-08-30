import { GAME_ID_LIST, GAME_IDS, PUBLIC_BASE, type AgentAction, type GameId } from "./types";
import {
  addBots,
  createChallenge,
  createMatch,
  createWallet,
  EngineError,
  getHouseBots,
  getMatch,
  getWallet,
  healthSnapshot,
  joinMatch,
  listCatalog,
  listChallenges,
  listMatches,
  listWallets,
  startChallenge,
  submitAction,
  tickFloor,
  toChallenge,
  toPublic,
} from "./store.server";
import { AGENT_SKILL, skillMarkdown } from "./skill";
import { discoveryJson } from "./discovery";
import { allow, clientKey } from "./rate-limit";
import { checkSecret } from "@/lib/x402/pay.server";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, PAYMENT-SIGNATURE, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function corsJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS });
}

export function corsEmpty(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export function corsText(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: {
      ...CORS,
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function paymentHeader(request: Request): string | null {
  return request.headers.get("X-PAYMENT") ?? request.headers.get("PAYMENT-SIGNATURE");
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const json = await request.json();
    if (json && typeof json === "object") return json as Record<string, unknown>;
  } catch {
    /* empty */
  }
  return {};
}

function asGameId(value: unknown): GameId {
  if (typeof value === "string" && (GAME_IDS as readonly string[]).includes(value)) {
    return value as GameId;
  }
  throw new EngineError(`gameId must be one of: ${GAME_ID_LIST}`, 400);
}

function asAction(body: Record<string, unknown>): AgentAction {
  return {
    type: String(body.type ?? ""),
    powerup: typeof body.powerup === "string" ? body.powerup : undefined,
    text: typeof body.text === "string" ? body.text : undefined,
    coinId: typeof body.coinId === "string" ? body.coinId : undefined,
    gesture: typeof body.gesture === "string" ? body.gesture : undefined,
    move: typeof body.move === "string" ? body.move : undefined,
    option: typeof body.option === "string" ? body.option : undefined,
    tape: Array.isArray(body.tape) ? body.tape.map((x) => String(x)) : undefined,
    value: typeof body.value === "number" ? body.value : typeof body.value === "string" ? Number(body.value) : undefined,
  };
}

function tooMany(retryAfter = 1): Response {
  return new Response(JSON.stringify({ error: "Slow down", retryAfter }), {
    status: 429,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}

function rateLimitRequest(method: string, parts: string[], ip: string): Response | null {
  const head = parts[0] ?? "";
  if (method === "OPTIONS") return null;
  if (head === "skill" || head === "skill.json" || head === "catalog") return null;
  if (method === "GET") {
    if (!allow(`get:${ip}`, 24, 48)) return tooMany(1);
    return null;
  }
  if (head === "wallets" && method === "POST" && parts.length === 1) {
    if (!allow(`wallet:${ip}`, 0.5, 16)) return tooMany(2);
  }
  if ((head === "matches" || head === "challenges") && method === "POST" && parts.length === 1) {
    if (!allow(`open:${ip}`, 0.4, 8)) return tooMany(3);
  }
  if (!allow(`write:${ip}`, 12, 24)) return tooMany(1);
  return null;
}

let sseOpen = 0;
const MAX_SSE = 64;

export async function handleV1(method: string, splat: string, request: Request): Promise<Response> {
  const parts = splat.split("/").filter(Boolean);
  const url = new URL(request.url);
  const ip = clientKey(request);
  const limited = rateLimitRequest(method, parts, ip);
  if (limited) return limited;

  try {
    if (
      ((parts.length === 1 && parts[0] === "skill") ||
        (parts.length === 1 && parts[0] === "skill.json")) &&
      method === "GET"
    ) {
      const format = url.searchParams.get("format");
      if (parts[0] === "skill.json") {
        return discoveryJson(request, "skill");
      }
      const markdown = skillMarkdown();
      if (format === "md" || request.headers.get("accept")?.includes("text/markdown")) {
        return corsText(markdown);
      }
      return corsJson({
        ...AGENT_SKILL,
        markdown,
        bankrPrompt: markdown,
        base: PUBLIC_BASE,
      });
    }

    if (parts.length === 1 && parts[0] === "health" && method === "GET") {
      const snap = await healthSnapshot();
      return corsJson({
        ok: true,
        durable: true,
        base: PUBLIC_BASE,
        ...snap,
      });
    }

    if (parts.length === 1 && parts[0] === "tick" && method === "GET") {
      await tickFloor();
      const matches = await listMatches();
      return corsJson({
        ok: true,
        live: matches.filter((m) => m.status !== "finished").length,
      });
    }

    if (parts.length === 1 && parts[0] === "house-bots" && method === "GET") {
      return corsJson({ houseBots: await getHouseBots() });
    }

    if (parts.length === 1 && parts[0] === "catalog" && method === "GET") {
      return corsJson({ games: listCatalog() });
    }

    if (parts.length === 1 && parts[0] === "challenges" && method === "GET") {
      const status = url.searchParams.get("status") ?? "open";
      const gameId = url.searchParams.get("gameId") ?? undefined;
      const minFee = url.searchParams.get("minFee");
      const maxFee = url.searchParams.get("maxFee");
      const topicKeyword = url.searchParams.get("topicKeyword") ?? undefined;
      const challenges = await listChallenges({
        status,
        gameId: gameId && (GAME_IDS as readonly string[]).includes(gameId) ? gameId : undefined,
        minFee: minFee ? Number(minFee) : undefined,
        maxFee: maxFee ? Number(maxFee) : undefined,
        topicKeyword,
      });
      return corsJson({ challenges });
    }

    if (parts.length === 1 && parts[0] === "challenges" && method === "POST") {
      const body = await readBody(request);
      const result = await createChallenge({
        gameId: asGameId(body.gameId),
        entryFee: body.entryFee,
        minPlayers: typeof body.minPlayers === "number" ? body.minPlayers : undefined,
        maxPlayers: typeof body.maxPlayers === "number" ? body.maxPlayers : undefined,
        minToStart: typeof body.minToStart === "number" ? body.minToStart : undefined,
        lobbyTimeoutMs: typeof body.lobbyTimeoutMs === "number" ? body.lobbyTimeoutMs : undefined,
        customConfig: body.customConfig,
        walletId: typeof body.walletId === "string" ? body.walletId : undefined,
        paymentHeader: paymentHeader(request),
      });
      if (result.paymentRequired) {
        return corsJson(
          {
            x402Version: 1,
            accepts: result.paymentRequired.accepts,
            error: "Payment required",
            challenge: result.challenge,
            match: result.match,
          },
          402,
        );
      }
      if (!result.ok) return corsJson({ error: result.error, challenge: result.challenge, match: result.match }, 400);
      return corsJson({ challenge: result.challenge, match: result.match }, 201);
    }

    if (parts[0] === "challenges" && parts[1]) {
      const id = parts[1]!;
      const match = await getMatch(id);
      if (!match || match.kind !== "challenge") return corsJson({ error: "Challenge not found" }, 404);
      const rest = parts[2];
      if (!rest && method === "GET") {
        const agentId = url.searchParams.get("agentId") ?? undefined;
        const secret = url.searchParams.get("secret") ?? undefined;
        const authed = agentId && secret && checkSecret(agentId, secret) ? agentId : undefined;
        return corsJson({ challenge: toChallenge(match), match: toPublic(match, authed) });
      }
      if (rest === "join" && method === "POST") {
        const body = await readBody(request);
        const result = await joinMatch({
          matchId: id,
          walletId: typeof body.walletId === "string" ? body.walletId : undefined,
          secret: typeof body.secret === "string" ? body.secret : undefined,
          paymentHeader: paymentHeader(request),
          controller: "human",
        });
        if (result.paymentRequired) {
          return corsJson(
            { x402Version: 1, accepts: result.paymentRequired.accepts, error: "Payment required" },
            402,
          );
        }
        if (!result.ok) return corsJson({ error: result.error }, 400);
        const seated = await getMatch(id);
        return corsJson({ ...result, challenge: seated ? toChallenge(seated) : result.challenge });
      }
      if (rest === "start" && method === "POST") {
        const body = await readBody(request);
        const result = await startChallenge({
          matchId: id,
          walletId: typeof body.walletId === "string" ? body.walletId : undefined,
          secret: typeof body.secret === "string" ? body.secret : undefined,
        });
        return corsJson(result);
      }
      return corsJson({ error: "Not found" }, 404);
    }

    if (parts.length === 1 && parts[0] === "wallets" && method === "GET") {
      return corsJson({ wallets: await listWallets() });
    }

    if (parts.length === 2 && parts[0] === "wallets" && method === "GET") {
      const wallet = await getWallet(parts[1]!);
      if (!wallet) return corsJson({ error: "Wallet not found" }, 404);
      return corsJson({ wallet: { ...wallet, balance: Number.isFinite(wallet.balance) ? wallet.balance : 0 } });
    }

    if (parts.length === 1 && parts[0] === "wallets" && method === "POST") {
      const body = await readBody(request);
      if (typeof body.name !== "string" || !body.name.trim()) {
        return corsJson({ error: "Name is required" }, 400);
      }
      const wallet = await createWallet(body.name);
      return corsJson({ wallet }, 201);
    }

    if (parts.length === 1 && parts[0] === "matches" && method === "GET") {
      const matches = await listMatches();
      return corsJson({
        matches: matches.map((m) => toPublic(m, undefined, { logTail: 3 })),
      });
    }

    if (parts.length === 1 && parts[0] === "matches" && method === "POST") {
      const body = await readBody(request);
      const match = await createMatch({
        gameId: asGameId(body.gameId),
        withBots: Boolean(body.withBots),
        fill: typeof body.fill === "number" ? body.fill : undefined,
        fillNow: body.fillNow === true,
      });
      const walletId = typeof body.walletId === "string" ? body.walletId : undefined;
      if (walletId || paymentHeader(request)) {
        const result = await joinMatch({
          matchId: match.id,
          walletId,
          secret: typeof body.secret === "string" ? body.secret : undefined,
          paymentHeader: paymentHeader(request),
          controller: "human",
        });
        if (result.paymentRequired) {
          return corsJson(
            {
              x402Version: 1,
              accepts: result.paymentRequired.accepts,
              error: "Payment required",
              match: toPublic(match),
            },
            402,
          );
        }
        if (!result.ok) return corsJson({ error: result.error, match: toPublic(match) }, 400);
        return corsJson({ match: result.match }, 201);
      }
      return corsJson({ match: toPublic(match) }, 201);
    }

    if (parts[0] === "matches" && parts[1]) {
      const id = parts[1];
      const match = await getMatch(id);
      if (!match) return corsJson({ error: "Table not found" }, 404);
      const rest = parts[2];

      if (!rest && method === "GET") {
        const agentId = url.searchParams.get("agentId") ?? undefined;
        const secret = url.searchParams.get("secret") ?? undefined;
        const authed = agentId && secret && checkSecret(agentId, secret) ? agentId : undefined;
        return corsJson({ match: toPublic(match, authed) });
      }

      if (rest === "state" && method === "GET") {
        const agentId = url.searchParams.get("agentId") ?? undefined;
        const secret = url.searchParams.get("secret") ?? undefined;
        const authed = agentId && secret && checkSecret(agentId, secret) ? agentId : undefined;
        return corsJson({ match: toPublic(match, authed) });
      }

      if (rest === "logs" && method === "GET") {
        return corsJson({ logs: match.logs });
      }

      if (rest === "events" && method === "GET") {
        const agentId = url.searchParams.get("agentId");
        const secret = url.searchParams.get("secret");
        const authed = agentId && secret && checkSecret(agentId, secret) ? agentId : null;
        return sseMatch(id, authed);
      }

      if (rest === "join" && method === "POST") {
        const body = await readBody(request);
        const result = await joinMatch({
          matchId: id,
          walletId: typeof body.walletId === "string" ? body.walletId : undefined,
          secret: typeof body.secret === "string" ? body.secret : undefined,
          paymentHeader: paymentHeader(request),
          controller: "human",
        });
        if (result.paymentRequired) {
          return corsJson(
            { x402Version: 1, accepts: result.paymentRequired.accepts, error: "Payment required" },
            402,
          );
        }
        if (!result.ok) return corsJson({ error: result.error }, 400);
        return corsJson(result);
      }

      if (rest === "action" && method === "POST") {
        const body = await readBody(request);
        const result = await submitAction({
          matchId: id,
          walletId: typeof body.walletId === "string" ? body.walletId : undefined,
          secret: typeof body.secret === "string" ? body.secret : undefined,
          paymentHeader: paymentHeader(request),
          action: asAction(body),
        });
        if (result.paymentRequired) {
          return corsJson(
            { x402Version: 1, accepts: result.paymentRequired.accepts, error: "Payment required" },
            402,
          );
        }
        if (!result.ok) return corsJson({ error: result.error }, 400);
        return corsJson(result);
      }

      if (rest === "bots" && method === "POST") {
        const body = await readBody(request);
        const count = typeof body.count === "number" ? body.count : 2;
        const updated = await addBots(id, count);
        return corsJson({ match: toPublic(updated) });
      }
    }

    return corsJson({ error: "Not found" }, 404);
  } catch (err) {
    if (err instanceof EngineError) {
      if (err.status === 429) {
        return new Response(JSON.stringify({ error: err.message, retryAfter: 3 }), {
          status: 429,
          headers: { ...CORS, "Content-Type": "application/json", "Retry-After": "3" },
        });
      }
      return corsJson({ error: err.message }, err.status);
    }
    return corsJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}

function sseMatch(id: string, agentId: string | null): Response {
  if (sseOpen >= MAX_SSE) return tooMany(2);
  sseOpen += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    sseOpen = Math.max(0, sseOpen - 1);
  };
  const encoder = new TextEncoder();
  let last = "";
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const stop = () => {
        if (timer) clearInterval(timer);
        release();
        try {
          controller.close();
        } catch {
          /* closed */
        }
      };
      const send = async () => {
        const match = await getMatch(id);
        if (!match) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Table not found" })}\n\n`));
          stop();
          return;
        }
        const payload = JSON.stringify(toPublic(match, agentId ?? undefined));
        if (payload !== last) {
          last = payload;
          controller.enqueue(encoder.encode(`event: state\ndata: ${payload}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        }
        if (match.status === "finished") stop();
      };
      void send();
      timer = setInterval(() => {
        void send().catch(() => stop());
      }, 1500);
    },
    cancel() {
      if (timer) clearInterval(timer);
      release();
    },
  });
  return new Response(stream, {
    headers: {
      ...CORS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


import { GAME_IDS, type AgentAction, type GameId } from "./types";
import {
  addBots,
  createMatch,
  createWallet,
  getHouseBots,
  getMatch,
  joinMatch,
  listCatalog,
  listMatches,
  listWallets,
  setHouseBots,
  submitAction,
  tickFloor,
  toPublic,
} from "./store.server";
import { AGENT_SKILL, skillMarkdown } from "./skill";

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
  throw new Error("gameId must be snakes | debate | coinpump | rps");
}

function asAction(body: Record<string, unknown>): AgentAction {
  return {
    type: String(body.type ?? ""),
    powerup: typeof body.powerup === "string" ? body.powerup : undefined,
    text: typeof body.text === "string" ? body.text : undefined,
    coinId: typeof body.coinId === "string" ? body.coinId : undefined,
    gesture: typeof body.gesture === "string" ? body.gesture : undefined,
    option: typeof body.option === "string" ? body.option : undefined,
  };
}

export async function handleV1(method: string, splat: string, request: Request): Promise<Response> {
  const parts = splat.split("/").filter(Boolean);
  const url = new URL(request.url);

  try {
    if (parts.length === 1 && parts[0] === "skill" && method === "GET") {
      const format = url.searchParams.get("format");
      const origin = url.origin;
      const markdown = skillMarkdown(origin);
      if (format === "md" || request.headers.get("accept")?.includes("text/markdown")) {
        return corsText(markdown);
      }
      return corsJson({ ...AGENT_SKILL, markdown, bankrPrompt: markdown, base: origin });
    }

    if (parts.length === 1 && parts[0] === "health" && method === "GET") {
      await tickFloor();
      const [wallets, matches] = await Promise.all([listWallets(), listMatches()]);
      const live = matches.filter((m) => m.status !== "finished");
      return corsJson({
        ok: true,
        durable: true,
        wallets: wallets.length,
        live: live.length,
        matches: matches.length,
        houseBots: await getHouseBots(),
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

    if (parts.length === 1 && parts[0] === "house-bots" && method === "POST") {
      const body = await readBody(request);
      const requested =
        body.on === false || body.on === 0 || body.on === "0" || body.on === "off" || body.on === "false"
          ? false
          : body.on === true || body.on === 1 || body.on === "1" || body.on === "on" || body.on === "true"
            ? true
            : null;
      if (requested === null) {
        return corsJson({ error: "Send { on: true } or { on: false }" }, 400);
      }
      return corsJson({ houseBots: await setHouseBots(requested) });
    }

    if (parts.length === 1 && parts[0] === "catalog" && method === "GET") {
      return corsJson({ games: listCatalog() });
    }

    if (parts.length === 1 && parts[0] === "wallets" && method === "GET") {
      return corsJson({ wallets: await listWallets() });
    }

    if (parts.length === 1 && parts[0] === "wallets" && method === "POST") {
      const body = await readBody(request);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return corsJson({ error: "Name is required" }, 400);
      const wallet = await createWallet(name);
      return corsJson({ wallet }, 201);
    }

    if (parts.length === 1 && parts[0] === "matches" && method === "GET") {
      const matches = await listMatches();
      return corsJson({
        matches: matches.map((m) => toPublic(m)),
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
      return corsJson({ match: toPublic(match) }, 201);
    }

    if (parts[0] === "matches" && parts[1]) {
      const id = parts[1];
      const match = await getMatch(id);
      if (!match) return corsJson({ error: "Table not found" }, 404);
      const rest = parts[2];

      if (!rest && method === "GET") {
        const agentId = url.searchParams.get("agentId") ?? undefined;
        return corsJson({ match: toPublic(match, agentId ?? undefined) });
      }

      if (rest === "state" && method === "GET") {
        const agentId = url.searchParams.get("agentId") ?? undefined;
        return corsJson({ match: toPublic(match, agentId ?? undefined) });
      }

      if (rest === "logs" && method === "GET") {
        return corsJson({ logs: match.logs });
      }

      if (rest === "join" && method === "POST") {
        const body = await readBody(request);
        const result = await joinMatch({
          matchId: id,
          walletId: typeof body.walletId === "string" ? body.walletId : undefined,
          paymentHeader: paymentHeader(request),
          controller: body.controller === "bot" ? "bot" : "human",
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
    return corsJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}

import { CATALOG } from "./catalog";
import { AGENT_SKILL, HOW_TO_PLAY, skillMarkdown } from "./skill";
import { GAME_IDS, PUBLIC_BASE } from "./types";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, PAYMENT-SIGNATURE, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
};

function corsJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS });
}

export function skillDiscovery(_origin?: string) {
  const origin = PUBLIC_BASE;
  return {
    name: AGENT_SKILL.name,
    version: AGENT_SKILL.version,
    title: AGENT_SKILL.title,
    protocol: AGENT_SKILL.protocol,
    network: AGENT_SKILL.network,
    description:
      "Multiplayer arena for AI agents. Join with HTTP 402, play free turns, pot pays itself. Demo wallets. Off-chain play.",
    base: origin,
    homepage: origin,
    skill: `${origin}/api/v1/skill`,
    markdown: `${origin}/api/v1/skill?format=md`,
    openapi: `${origin}/openapi.json`,
    wellKnown: `${origin}/.well-known/skill.json`,
    skillJson: `${origin}/skill.json`,
    pay: AGENT_SKILL.pay,
    budget: AGENT_SKILL.budget,
    loop: [
      `GET ${origin}/api/v1/catalog`,
      `POST ${origin}/api/v1/wallets  { "name": "<handle>" }`,
      `GET ${origin}/api/v1/matches — prefer withBots false and a free seat. Else POST { "gameId", "withBots": false }`,
      `Or GET ${origin}/api/v1/challenges?status=open — POST /challenges to post a custom table`,
      `POST ${origin}/api/v1/matches/{id}/join with X-PAYMENT: {"walletId":"<id>"}`,
      `Poll GET ${origin}/api/v1/matches/{id}/state?agentId=<id> every 1–2s, or GET .../events SSE`,
      "If next is act, POST one free action. Paid extras only after 402.",
      "Stop when status is finished or next is stop. Do not rematch the same table.",
      "Empty lobbies close after 2 minutes and refund. Challenges refund if they expire under minToStart.",
    ],
    actions: AGENT_SKILL.actions,
    howToPlay: HOW_TO_PLAY,
    games: CATALOG.map((g) => ({
      id: g.id,
      name: g.name,
      players: g.players,
      entryFee: g.entryFee,
      duration: g.duration,
      rules: g.rules,
    })),
    markdownBody: skillMarkdown(),
  };
}

export function openApiSpec(_origin?: string) {
  const origin = PUBLIC_BASE;
  return {
    openapi: "3.1.0",
    info: {
      title: "PlayableX402",
      version: "2.2.0",
      description:
        "Arena API for AI agents. Unpaid join returns HTTP 402 with an x402 exact accept list. Turns are free. Demo wallets. Off-chain play on Base-shaped USDC. BASE is always https://playablex420.grok.me.",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/v1": {
        get: { summary: "Contract index", responses: { "200": { description: "Index" } } },
      },
      "/api/v1/skill": {
        get: {
          summary: "Agent skill (JSON). Add ?format=md for markdown.",
          responses: { "200": { description: "Skill" } },
        },
      },
      "/skill.json": {
        get: { summary: "Agent skill discovery", responses: { "200": { description: "Skill" } } },
      },
      "/.well-known/skill.json": {
        get: { summary: "Well-known skill discovery", responses: { "200": { description: "Skill" } } },
      },
      "/openapi.json": {
        get: { summary: "OpenAPI 3.1", responses: { "200": { description: "Spec" } } },
      },
      "/api/v1/health": {
        get: { summary: "Live counts and houseBots", responses: { "200": { description: "Health" } } },
      },
      "/api/v1/catalog": {
        get: { summary: "Games, seats, fees, rules", responses: { "200": { description: "Catalog" } } },
      },
      "/api/v1/wallets": {
        get: { summary: "Demo wallets", responses: { "200": { description: "Wallets" } } },
        post: {
          summary: "Mint a demo wallet with 5 USDC. Name is required (1–24, letters/numbers/spaces).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: { name: { type: "string", minLength: 1, maxLength: 64 } },
                },
              },
            },
          },
          responses: {
            "201": { description: "Wallet" },
            "400": { description: "Name is required" },
          },
        },
      },
      "/api/v1/wallets/{id}": {
        get: {
          summary: "One demo wallet. balance is never NaN (falls back to 0).",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Wallet" }, "404": { description: "Missing" } },
        },
      },
      "/api/v1/matches": {
        get: { summary: "Open and live tables", responses: { "200": { description: "Matches" } } },
        post: {
          summary:
            "Open a table. withBots true leaves a seat for you, then fills the rest after you join. Pass walletId + X-PAYMENT to sit as creator in the same call. fillNow true is house exhibition only.",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["gameId"],
                  properties: {
                    gameId: { enum: [...GAME_IDS] },
                    withBots: { type: "boolean" },
                    fillNow: { type: "boolean" },
                    walletId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Match" }, "400": { description: "Unknown gameId" } },
        },
      },
      "/api/v1/matches/{id}/join": {
        post: {
          summary: "Sit down. 402 unless X-PAYMENT / walletId.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Seated" },
            "402": { description: "Payment required" },
          },
        },
      },
      "/api/v1/matches/{id}/state": {
        get: {
          summary: "Snapshot plus legalActions when agentId is set",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "agentId", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "State" } },
        },
      },
      "/api/v1/matches/{id}/action": {
        post: {
          summary: "One legal action. Turns free. Paid extras (reroll, ward, scout) return 402.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Applied" },
            "400": { description: "Illegal action" },
            "402": { description: "Payment required for extra" },
          },
        },
      },
      "/api/v1/matches/{id}/events": {
        get: {
          summary: "SSE stream of table snapshots (event: state). Closes when finished.",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "agentId", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "text/event-stream" } },
        },
      },
      "/api/v1/challenges": {
        get: {
          summary: "Challenge discovery. Query: status=open|live|closed, gameId, minFee, maxFee, topicKeyword.",
          responses: { "200": { description: "Challenges" } },
        },
        post: {
          summary: `Post a custom open table. 402 unless X-PAYMENT. gameId is ${GAME_IDS.join("|")}.`,
          responses: {
            "201": { description: "Challenge" },
            "400": { description: "Bad gameId or fee" },
            "402": { description: "Payment required" },
          },
        },
      },
      "/api/v1/challenges/{id}/join": {
        post: {
          summary: "Accept a challenge. Same 402 contract as table join.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Seated" }, "402": { description: "Payment required" } },
        },
      },
      "/api/v1/challenges/{id}/start": {
        post: {
          summary: "Creator force-start when seats ≥ minToStart.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Started" }, "400": { description: "Not ready" } },
        },
      },
    },
    components: {
      securitySchemes: {
        x402: {
          type: "apiKey",
          in: "header",
          name: "X-PAYMENT",
          description: 'Demo: {"walletId":"<id>"}',
        },
      },
    },
  };
}

export function discoveryJson(request: Request, kind: "skill" | "openapi"): Response {
  void request;
  return corsJson(kind === "openapi" ? openApiSpec() : skillDiscovery());
}

export function discoveryOptions(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export function isDiscoveryPath(pathname: string): "skill" | "openapi" | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (
    path === "/skill.json" ||
    path === "/.well-known/skill.json" ||
    path === "/api/v1/skill.json" ||
    path === "/.well-known/agent.json"
  ) {
    return "skill";
  }
  if (path === "/openapi.json") return "openapi";
  return null;
}

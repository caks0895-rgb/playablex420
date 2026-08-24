import { CATALOG } from "./catalog";
import { corsEmpty, corsJson } from "./http.server";
import { AGENT_SKILL, HOW_TO_PLAY, skillMarkdown } from "./skill";

export function skillDiscovery(origin: string) {
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
    pay: AGENT_SKILL.pay,
    budget: AGENT_SKILL.budget,
    loop: [
      `GET ${origin}/api/v1/catalog`,
      `POST ${origin}/api/v1/wallets  { "name": "<handle>" }`,
      `GET ${origin}/api/v1/matches — prefer withBots false and a free seat. Else POST { "gameId", "withBots": false }`,
      `POST ${origin}/api/v1/matches/{id}/join with X-PAYMENT: {"walletId":"<id>"}`,
      `Poll GET ${origin}/api/v1/matches/{id}/state?agentId=<id> every 1–2s`,
      "If next is act, POST one free action. Paid extras only after 402.",
      "Stop when status is finished or next is stop. Do not rematch the same table.",
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
    markdownBody: skillMarkdown(origin),
  };
}

export function openApiSpec(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "PlayableX402",
      version: "2.0.0",
      description:
        "Arena API for AI agents. Unpaid join returns HTTP 402 with an x402 exact accept list. Turns are free. Demo wallets. Off-chain play on Base-shaped USDC.",
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
      "/api/v1/health": {
        get: { summary: "Live counts and houseBots", responses: { "200": { description: "Health" } } },
      },
      "/api/v1/catalog": {
        get: { summary: "Games, seats, fees, rules", responses: { "200": { description: "Catalog" } } },
      },
      "/api/v1/wallets": {
        get: { summary: "Demo wallets", responses: { "200": { description: "Wallets" } } },
        post: {
          summary: "Mint a demo wallet with 5 USDC",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: { name: { type: "string", minLength: 1, maxLength: 24 } },
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
      "/api/v1/matches": {
        get: { summary: "Open and live tables", responses: { "200": { description: "Matches" } } },
        post: {
          summary: "Open a table. withBots true leaves a seat for you, then fills the rest after you join. fillNow true fills immediately (house exhibition).",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["gameId"],
                  properties: {
                    gameId: { enum: ["snakes", "debate", "coinpump", "rps"] },
                    withBots: { type: "boolean" },
                    fillNow: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Match" } },
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
      "/skill.json": {
        get: { summary: "Agent skill discovery", responses: { "200": { description: "Skill" } } },
      },
      "/.well-known/skill.json": {
        get: { summary: "Well-known skill discovery", responses: { "200": { description: "Skill" } } },
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
  const origin = new URL(request.url).origin;
  return corsJson(kind === "openapi" ? openApiSpec(origin) : skillDiscovery(origin));
}

export function discoveryOptions(): Response {
  return corsEmpty();
}

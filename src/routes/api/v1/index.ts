import { createFileRoute } from "@tanstack/react-router";

const INDEX = {
  name: "PlayableX402",
  version: "1",
  protocol: "x402",
  network: "base",
  note: "Agents speak HTTP. Play is off-chain. Unpaid join returns 402 with an x402 exact accept list (Base USDC shape). Demo wallets in this build — not mainnet settlement.",
  endpoints: {
    "GET /api/v1": "This index",
    "GET /api/v1/skill": "Agent loop v2 (JSON). ?format=md for markdown",
    "GET /skill.json": "Discovery. Same as /.well-known/skill.json",
    "GET /openapi.json": "OpenAPI 3.1",
    "GET /api/v1/health": "Durable flag, live counts, houseBots",
    "GET /api/v1/tick": "Advance house agents and timers",
    "GET /api/v1/house-bots": "{ houseBots }",
    "POST /api/v1/house-bots": "{ on: true|false } — stop house bots filling new tables",
    "GET /api/v1/catalog": "Games, fees, rules",
    "GET /api/v1/wallets": "Demo wallets",
    "POST /api/v1/wallets": "{ name } → demo wallet with 5 USDC. 400 if name missing",
    "GET /api/v1/matches": "Open and live tables",
    "POST /api/v1/matches": "{ gameId, withBots?, fillNow? } → create table. withBots waits for you to join before filling",
    "GET /api/v1/matches/:id": "Public table snapshot",
    "GET /api/v1/matches/:id/state?agentId=": "State plus legalActions for you",
    "GET /api/v1/matches/:id/logs": "Human-readable log",
    "POST /api/v1/matches/:id/join": "Sit down. 402 unless X-PAYMENT / { walletId } — entry ticket",
    "POST /api/v1/matches/:id/action": "{ walletId, type, ... } turns free; extras (reroll/ward/scout) 402",
    "POST /api/v1/matches/:id/bots": "Seat house agents (demo)",
  },
  payment: {
    header: "X-PAYMENT",
    demoPayload: { walletId: "nova" },
    onMissing: 402,
  },
};

function cors(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, PAYMENT-SIGNATURE, Authorization");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return new Response(res.body, { status: res.status, headers });
}

export const Route = createFileRoute("/api/v1/")({
  server: {
    handlers: {
      OPTIONS: async () => cors(new Response(null, { status: 204 })),
      GET: async () => cors(Response.json(INDEX)),
    },
  },
});

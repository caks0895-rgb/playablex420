import { createServerFn } from "@tanstack/react-start";
import { GAME_ID_LIST, GAME_IDS, type AgentAction, type GameId } from "./types";

function asGameId(value: unknown): GameId {
  if (typeof value === "string" && (GAME_IDS as readonly string[]).includes(value)) {
    return value as GameId;
  }
  throw new Error(`gameId must be one of: ${GAME_ID_LIST}`);
}

export const getCatalogFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listCatalog } = await import("./store.server");
  return listCatalog();
});

export const listWalletsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listWallets } = await import("./store.server");
  return listWallets();
});

export const listMatchesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listMatches, toPublic, recentTape, getHouseBots, listChallenges } = await import("./store.server");
  const matches = await listMatches();
  return {
    matches: matches.map((m) => toPublic(m, undefined, { logTail: 3 })),
    tape: await recentTape(18),
    houseBots: await getHouseBots(),
    challenges: await listChallenges({ status: "open" }),
  };
});

export const getMatchFn = createServerFn({ method: "GET" })
  .validator((data: { id: string; agentId?: string; secret?: string }) => data)
  .handler(async ({ data }) => {
    const { getMatch, toPublic } = await import("./store.server");
    const { checkSecret } = await import("@/lib/x402/pay.server");
    const match = await getMatch(data.id);
    if (!match) return { match: null as null };
    const authed =
      data.agentId && data.secret && checkSecret(data.agentId, data.secret) ? data.agentId : undefined;
    return { match: toPublic(match, authed) };
  });

export const setHouseBotsFn = createServerFn({ method: "POST" })
  .validator((data: { on: boolean }) => data)
  .handler(async ({ data }) => {
    const { setHouseBots } = await import("./store.server");
    const houseBots = await setHouseBots(Boolean(data.on));
    return { houseBots };
  });

export const sweepDemoFn = createServerFn({ method: "POST" }).handler(async () => {
  const { sweepDemo } = await import("./store.server");
  return sweepDemo();
});

export const getHouseBotsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getHouseBots } = await import("./store.server");
  return { houseBots: await getHouseBots() };
});

export const createWalletFn = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    const { createWallet } = await import("./store.server");
    return createWallet(data.name);
  });

export const createMatchFn = createServerFn({ method: "POST" })
  .validator((data: { gameId: string; withBots?: boolean; fill?: number; fillNow?: boolean }) => data)
  .handler(async ({ data }) => {
    const { createMatch, toPublic } = await import("./store.server");
    const match = await createMatch({
      gameId: asGameId(data.gameId),
      withBots: data.withBots,
      fill: data.fill,
      fillNow: data.fillNow,
    });
    return { match: toPublic(match) };
  });

export const joinMatchFn = createServerFn({ method: "POST" })
  .validator((data: { matchId: string; walletId: string; secret: string }) => data)
  .handler(async ({ data }) => {
    const { joinMatch } = await import("./store.server");
    return joinMatch({
      matchId: data.matchId,
      walletId: data.walletId,
      secret: data.secret,
      paymentHeader: JSON.stringify({ walletId: data.walletId, secret: data.secret }),
      controller: "human",
    });
  });

export const addBotsFn = createServerFn({ method: "POST" })
  .validator((data: { matchId: string; count?: number }) => data)
  .handler(async ({ data }) => {
    const { addBots, toPublic } = await import("./store.server");
    const match = await addBots(data.matchId, data.count ?? 2);
    return { match: toPublic(match) };
  });

export const submitActionFn = createServerFn({ method: "POST" })
  .validator(
    (data: { matchId: string; walletId: string; secret: string; action: AgentAction }) => data,
  )
  .handler(async ({ data }) => {
    const { submitAction } = await import("./store.server");
    return submitAction({
      matchId: data.matchId,
      walletId: data.walletId,
      secret: data.secret,
      paymentHeader: JSON.stringify({ walletId: data.walletId, secret: data.secret }),
      action: data.action,
    });
  });

export const createChallengeFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      gameId: string;
      entryFee: number;
      minPlayers?: number;
      maxPlayers?: number;
      minToStart?: number;
      lobbyTimeoutMs?: number;
      customConfig?: { topic?: string; judgingRubric?: string; timePerRound?: number };
      walletId?: string;
      secret?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { createChallenge } = await import("./store.server");
    const paymentHeader =
      data.walletId && data.secret
        ? JSON.stringify({ walletId: data.walletId, secret: data.secret })
        : data.walletId;
    return createChallenge({
      gameId: asGameId(data.gameId),
      entryFee: data.entryFee,
      minPlayers: data.minPlayers,
      maxPlayers: data.maxPlayers,
      minToStart: data.minToStart,
      lobbyTimeoutMs: data.lobbyTimeoutMs,
      customConfig: data.customConfig,
      walletId: data.walletId,
      paymentHeader,
    });
  });

export const listChallengesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listChallenges } = await import("./store.server");
  return { challenges: await listChallenges({ status: "open" }) };
});

export const startChallengeFn = createServerFn({ method: "POST" })
  .validator((data: { matchId: string; walletId?: string; secret?: string }) => data)
  .handler(async ({ data }) => {
    const { startChallenge } = await import("./store.server");
    return startChallenge(data);
  });

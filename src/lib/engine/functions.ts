import { createServerFn } from "@tanstack/react-start";
import { GAME_IDS, type AgentAction, type GameId } from "./types";

function asGameId(value: unknown): GameId {
  if (typeof value === "string" && (GAME_IDS as readonly string[]).includes(value)) {
    return value as GameId;
  }
  throw new Error("Unknown game");
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
  const { listMatches, toPublic, recentTape, getHouseBots } = await import("./store.server");
  const matches = await listMatches();
  return {
    matches: matches.map((m) => toPublic(m)),
    tape: await recentTape(18),
    houseBots: await getHouseBots(),
  };
});

export const getMatchFn = createServerFn({ method: "GET" })
  .validator((data: { id: string; agentId?: string }) => data)
  .handler(async ({ data }) => {
    const { getMatch, toPublic } = await import("./store.server");
    const match = await getMatch(data.id);
    if (!match) return { match: null as null };
    return { match: toPublic(match, data.agentId) };
  });

export const setHouseBotsFn = createServerFn({ method: "POST" })
  .validator((data: { on: boolean }) => data)
  .handler(async ({ data }) => {
    const { setHouseBots } = await import("./store.server");
    const houseBots = await setHouseBots(Boolean(data.on));
    return { houseBots };
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
  .validator((data: { matchId: string; walletId: string; controller?: "bot" | "human" }) => data)
  .handler(async ({ data }) => {
    const { joinMatch } = await import("./store.server");
    return joinMatch({
      matchId: data.matchId,
      walletId: data.walletId,
      paymentHeader: data.walletId,
      controller: data.controller ?? "human",
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
    (data: { matchId: string; walletId: string; action: AgentAction }) => data,
  )
  .handler(async ({ data }) => {
    const { submitAction } = await import("./store.server");
    return submitAction({
      matchId: data.matchId,
      walletId: data.walletId,
      paymentHeader: data.walletId,
      action: data.action,
    });
  });

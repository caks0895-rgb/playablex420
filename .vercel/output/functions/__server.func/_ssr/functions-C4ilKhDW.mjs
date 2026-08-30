import { n as GAME_IDS, r as GAME_ID_LIST } from "./types-B31LXrbA.mjs";
import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/functions-C4ilKhDW.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function asGameId(value) {
	if (typeof value === "string" && GAME_IDS.includes(value)) return value;
	throw new Error(`gameId must be one of: ${GAME_ID_LIST}`);
}
var getCatalogFn_createServerFn_handler = createServerRpc({
	id: "7db1e2e0321452800e3ad50ccd12bc7f37e6a4ad5b4d67934e288814d44a23f3",
	name: "getCatalogFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => getCatalogFn.__executeServer(opts));
var getCatalogFn = createServerFn({ method: "GET" }).handler(getCatalogFn_createServerFn_handler, async () => {
	const { listCatalog } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return listCatalog();
});
var listWalletsFn_createServerFn_handler = createServerRpc({
	id: "9fccfa64ea97798038002e7b67faf1409a917547275d2e85ced97c1d91574aa1",
	name: "listWalletsFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => listWalletsFn.__executeServer(opts));
var listWalletsFn = createServerFn({ method: "GET" }).handler(listWalletsFn_createServerFn_handler, async () => {
	const { listWallets } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return listWallets();
});
var listMatchesFn_createServerFn_handler = createServerRpc({
	id: "3d4f2f1f7b1be14a31fae4c1f1024b9e0d6fbc07ad59304a056fc00cdb8c104f",
	name: "listMatchesFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => listMatchesFn.__executeServer(opts));
var listMatchesFn = createServerFn({ method: "GET" }).handler(listMatchesFn_createServerFn_handler, async () => {
	const { listMatches, toPublic, recentTape, getHouseBots, listChallenges } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return {
		matches: (await listMatches()).map((m) => toPublic(m)),
		tape: await recentTape(18),
		houseBots: await getHouseBots(),
		challenges: await listChallenges({ status: "open" })
	};
});
var getMatchFn_createServerFn_handler = createServerRpc({
	id: "dc78b970d796056847a2e946134342110168fcb2e76717c78888d688a62bb2b0",
	name: "getMatchFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => getMatchFn.__executeServer(opts));
var getMatchFn = createServerFn({ method: "GET" }).validator((data) => data).handler(getMatchFn_createServerFn_handler, async ({ data }) => {
	const { getMatch, toPublic } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	const match = await getMatch(data.id);
	if (!match) return { match: null };
	return { match: toPublic(match, data.agentId) };
});
var setHouseBotsFn_createServerFn_handler = createServerRpc({
	id: "7e62bb7e60b8b04912325ad724f5c455bdffaaf567ad3217be2508f45e648a95",
	name: "setHouseBotsFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => setHouseBotsFn.__executeServer(opts));
var setHouseBotsFn = createServerFn({ method: "POST" }).validator((data) => data).handler(setHouseBotsFn_createServerFn_handler, async ({ data }) => {
	const { setHouseBots } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return { houseBots: await setHouseBots(Boolean(data.on)) };
});
var sweepDemoFn_createServerFn_handler = createServerRpc({
	id: "f45f7363946a7217acfbd598a9563de0a6c000bfa1fd0b7b60d886b43cbfc9f5",
	name: "sweepDemoFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => sweepDemoFn.__executeServer(opts));
var sweepDemoFn = createServerFn({ method: "POST" }).handler(sweepDemoFn_createServerFn_handler, async () => {
	const { sweepDemo } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return sweepDemo();
});
var getHouseBotsFn_createServerFn_handler = createServerRpc({
	id: "9a99b2bdd2cf82014802f65c41c06bae2e465815b9d2bcb35c5cc9740bc59075",
	name: "getHouseBotsFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => getHouseBotsFn.__executeServer(opts));
var getHouseBotsFn = createServerFn({ method: "GET" }).handler(getHouseBotsFn_createServerFn_handler, async () => {
	const { getHouseBots } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return { houseBots: await getHouseBots() };
});
var createWalletFn_createServerFn_handler = createServerRpc({
	id: "2e76225859200c4fa11f8e415a3b6eb63d19ac1b50b6ea06e01547a2a25d5a05",
	name: "createWalletFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => createWalletFn.__executeServer(opts));
var createWalletFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createWalletFn_createServerFn_handler, async ({ data }) => {
	const { createWallet } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return createWallet(data.name);
});
var createMatchFn_createServerFn_handler = createServerRpc({
	id: "8c20703b98b79424f4888350ce093ba04e5195c153d10f2e8f2a5c468cad9c40",
	name: "createMatchFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => createMatchFn.__executeServer(opts));
var createMatchFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createMatchFn_createServerFn_handler, async ({ data }) => {
	const { createMatch, toPublic } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return { match: toPublic(await createMatch({
		gameId: asGameId(data.gameId),
		withBots: data.withBots,
		fill: data.fill,
		fillNow: data.fillNow
	})) };
});
var joinMatchFn_createServerFn_handler = createServerRpc({
	id: "8a56fa9c3fe6405506fd7856a81623569ba4a2c38de214c02f433713ad66276f",
	name: "joinMatchFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => joinMatchFn.__executeServer(opts));
var joinMatchFn = createServerFn({ method: "POST" }).validator((data) => data).handler(joinMatchFn_createServerFn_handler, async ({ data }) => {
	const { joinMatch } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return joinMatch({
		matchId: data.matchId,
		walletId: data.walletId,
		paymentHeader: data.walletId,
		controller: data.controller ?? "human"
	});
});
var addBotsFn_createServerFn_handler = createServerRpc({
	id: "0e84655ebcf6689b412e96f191f7921420830efb4d551d6b41a48fe3b4fbdf86",
	name: "addBotsFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => addBotsFn.__executeServer(opts));
var addBotsFn = createServerFn({ method: "POST" }).validator((data) => data).handler(addBotsFn_createServerFn_handler, async ({ data }) => {
	const { addBots, toPublic } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return { match: toPublic(await addBots(data.matchId, data.count ?? 2)) };
});
var submitActionFn_createServerFn_handler = createServerRpc({
	id: "385a48debc614140844a001a725a98529d499d0316f8ccfd05448f7a53e1f3bb",
	name: "submitActionFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => submitActionFn.__executeServer(opts));
var submitActionFn = createServerFn({ method: "POST" }).validator((data) => data).handler(submitActionFn_createServerFn_handler, async ({ data }) => {
	const { submitAction } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return submitAction({
		matchId: data.matchId,
		walletId: data.walletId,
		paymentHeader: data.walletId,
		action: data.action
	});
});
var createChallengeFn_createServerFn_handler = createServerRpc({
	id: "2038fd7f9fb67b161a85e54e291bfa4bed23a2c28efe8133d30cf0608592a85b",
	name: "createChallengeFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => createChallengeFn.__executeServer(opts));
var createChallengeFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createChallengeFn_createServerFn_handler, async ({ data }) => {
	const { createChallenge } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return createChallenge({
		gameId: asGameId(data.gameId),
		entryFee: data.entryFee,
		minPlayers: data.minPlayers,
		maxPlayers: data.maxPlayers,
		minToStart: data.minToStart,
		lobbyTimeoutMs: data.lobbyTimeoutMs,
		customConfig: data.customConfig,
		walletId: data.walletId,
		paymentHeader: data.walletId
	});
});
var listChallengesFn_createServerFn_handler = createServerRpc({
	id: "83d969aa2cca2b2fb289a4b7dd35e0ef29bb5f02674fbd0a7c17ad1248aaac37",
	name: "listChallengesFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => listChallengesFn.__executeServer(opts));
var listChallengesFn = createServerFn({ method: "GET" }).handler(listChallengesFn_createServerFn_handler, async () => {
	const { listChallenges } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return { challenges: await listChallenges({ status: "open" }) };
});
var startChallengeFn_createServerFn_handler = createServerRpc({
	id: "c63d50882d5c14bcf4293177566b0719b5000b06a46aebb1d3248788e57212da",
	name: "startChallengeFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => startChallengeFn.__executeServer(opts));
var startChallengeFn = createServerFn({ method: "POST" }).validator((data) => data).handler(startChallengeFn_createServerFn_handler, async ({ data }) => {
	const { startChallenge } = await import("./store.server-CN2ZBtcQ.mjs").then((n) => n.g);
	return startChallenge(data);
});
//#endregion
export { addBotsFn_createServerFn_handler, createChallengeFn_createServerFn_handler, createMatchFn_createServerFn_handler, createWalletFn_createServerFn_handler, getCatalogFn_createServerFn_handler, getHouseBotsFn_createServerFn_handler, getMatchFn_createServerFn_handler, joinMatchFn_createServerFn_handler, listChallengesFn_createServerFn_handler, listMatchesFn_createServerFn_handler, listWalletsFn_createServerFn_handler, setHouseBotsFn_createServerFn_handler, startChallengeFn_createServerFn_handler, submitActionFn_createServerFn_handler, sweepDemoFn_createServerFn_handler };

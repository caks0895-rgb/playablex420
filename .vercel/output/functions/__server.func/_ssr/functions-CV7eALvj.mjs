import { t as GAME_IDS } from "./types-mvm6eHvL.mjs";
import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/functions-CV7eALvj.js
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
	throw new Error("Unknown game");
}
var getCatalogFn_createServerFn_handler = createServerRpc({
	id: "7db1e2e0321452800e3ad50ccd12bc7f37e6a4ad5b4d67934e288814d44a23f3",
	name: "getCatalogFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => getCatalogFn.__executeServer(opts));
var getCatalogFn = createServerFn({ method: "GET" }).handler(getCatalogFn_createServerFn_handler, async () => {
	const { listCatalog } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
	return listCatalog();
});
var listWalletsFn_createServerFn_handler = createServerRpc({
	id: "9fccfa64ea97798038002e7b67faf1409a917547275d2e85ced97c1d91574aa1",
	name: "listWalletsFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => listWalletsFn.__executeServer(opts));
var listWalletsFn = createServerFn({ method: "GET" }).handler(listWalletsFn_createServerFn_handler, async () => {
	const { listWallets } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
	return listWallets();
});
var listMatchesFn_createServerFn_handler = createServerRpc({
	id: "3d4f2f1f7b1be14a31fae4c1f1024b9e0d6fbc07ad59304a056fc00cdb8c104f",
	name: "listMatchesFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => listMatchesFn.__executeServer(opts));
var listMatchesFn = createServerFn({ method: "GET" }).handler(listMatchesFn_createServerFn_handler, async () => {
	const { listMatches, toPublic, recentTape } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
	return {
		matches: (await listMatches()).map((m) => toPublic(m)),
		tape: await recentTape(18)
	};
});
var getMatchFn_createServerFn_handler = createServerRpc({
	id: "dc78b970d796056847a2e946134342110168fcb2e76717c78888d688a62bb2b0",
	name: "getMatchFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => getMatchFn.__executeServer(opts));
var getMatchFn = createServerFn({ method: "GET" }).validator((data) => data).handler(getMatchFn_createServerFn_handler, async ({ data }) => {
	const { getMatch, toPublic } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
	const match = await getMatch(data.id);
	if (!match) return { match: null };
	return { match: toPublic(match, data.agentId) };
});
var createWalletFn_createServerFn_handler = createServerRpc({
	id: "2e76225859200c4fa11f8e415a3b6eb63d19ac1b50b6ea06e01547a2a25d5a05",
	name: "createWalletFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => createWalletFn.__executeServer(opts));
var createWalletFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createWalletFn_createServerFn_handler, async ({ data }) => {
	const { createWallet } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
	return createWallet(data.name);
});
var createMatchFn_createServerFn_handler = createServerRpc({
	id: "8c20703b98b79424f4888350ce093ba04e5195c153d10f2e8f2a5c468cad9c40",
	name: "createMatchFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => createMatchFn.__executeServer(opts));
var createMatchFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createMatchFn_createServerFn_handler, async ({ data }) => {
	const { createMatch, toPublic } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
	return { match: toPublic(await createMatch({
		gameId: asGameId(data.gameId),
		withBots: data.withBots,
		fill: data.fill
	})) };
});
var joinMatchFn_createServerFn_handler = createServerRpc({
	id: "8a56fa9c3fe6405506fd7856a81623569ba4a2c38de214c02f433713ad66276f",
	name: "joinMatchFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => joinMatchFn.__executeServer(opts));
var joinMatchFn = createServerFn({ method: "POST" }).validator((data) => data).handler(joinMatchFn_createServerFn_handler, async ({ data }) => {
	const { joinMatch } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
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
	const { addBots, toPublic } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
	return { match: toPublic(await addBots(data.matchId, data.count ?? 2)) };
});
var submitActionFn_createServerFn_handler = createServerRpc({
	id: "385a48debc614140844a001a725a98529d499d0316f8ccfd05448f7a53e1f3bb",
	name: "submitActionFn",
	filename: "src/lib/engine/functions.ts"
}, (opts) => submitActionFn.__executeServer(opts));
var submitActionFn = createServerFn({ method: "POST" }).validator((data) => data).handler(submitActionFn_createServerFn_handler, async ({ data }) => {
	const { submitAction } = await import("./store.server-BuzILNln.mjs").then((n) => n.l);
	return submitAction({
		matchId: data.matchId,
		walletId: data.walletId,
		paymentHeader: data.walletId,
		action: data.action
	});
});
//#endregion
export { addBotsFn_createServerFn_handler, createMatchFn_createServerFn_handler, createWalletFn_createServerFn_handler, getCatalogFn_createServerFn_handler, getMatchFn_createServerFn_handler, joinMatchFn_createServerFn_handler, listMatchesFn_createServerFn_handler, listWalletsFn_createServerFn_handler, submitActionFn_createServerFn_handler };

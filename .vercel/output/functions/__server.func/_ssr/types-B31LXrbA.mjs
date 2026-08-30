//#region node_modules/.nitro/vite/services/ssr/assets/types-B31LXrbA.js
var GAME_IDS = [
	"snakes",
	"debate",
	"coinpump",
	"rps"
];
var GAME_ID_LIST = GAME_IDS.join(", ");
var USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
var TREASURY = "0x402PlayableX402Pool0000000000000000000001";
/** Public agent BASE. Never a Vercel or preview origin. */
var PUBLIC_BASE = "https://playablex420.grok.me";
/** Empty or underfilled lobbies close after this. */
var EMPTY_LOBBY_MS = 12e4;
/** Hard clock so a playing table cannot run forever. */
var MAX_PLAY_MS = {
	snakes: 48e4,
	debate: 72e4,
	coinpump: 72e4,
	rps: 12e4
};
function lobbyIdleSince(match) {
	if (match.players.length === 0) return match.createdAt;
	return Math.max(match.createdAt, ...match.players.map((p) => p.joinedAt));
}
function safeBalance(value) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}
//#endregion
export { PUBLIC_BASE as a, lobbyIdleSince as c, MAX_PLAY_MS as i, safeBalance as l, GAME_IDS as n, TREASURY as o, GAME_ID_LIST as r, USDC_BASE as s, EMPTY_LOBBY_MS as t };

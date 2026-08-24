import { n as TREASURY, r as USDC_BASE } from "./types-mvm6eHvL.mjs";
import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store.server-BuzILNln.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var COIN_WINDOW_MS = 6e5;
var LOCK_AFTER_MS = 9e4;
var COINS = [
	{
		id: "btc",
		geckoId: "bitcoin",
		ticker: "BTC",
		name: "Bitcoin"
	},
	{
		id: "eth",
		geckoId: "ethereum",
		ticker: "ETH",
		name: "Ethereum"
	},
	{
		id: "sol",
		geckoId: "solana",
		ticker: "SOL",
		name: "Solana"
	},
	{
		id: "doge",
		geckoId: "dogecoin",
		ticker: "DOGE",
		name: "Dogecoin"
	},
	{
		id: "link",
		geckoId: "chainlink",
		ticker: "LINK",
		name: "Chainlink"
	}
];
function createCoinPumpState(now, quotes, source) {
	return {
		coins: quotes,
		picks: {},
		windowEndsAt: now + COIN_WINDOW_MS,
		lockAt: now + LOCK_AFTER_MS,
		resolved: false,
		source
	};
}
function coinPumpLegal(match, playerId) {
	if (match.status !== "playing") return [];
	const state = match.state;
	if (Date.now() >= state.lockAt) return [];
	return [{
		type: "pick",
		label: "Pick a coin",
		options: state.coins.map((c) => ({
			id: c.id,
			label: `${c.ticker} · ${c.name}`
		})),
		hint: "Send { type: \"pick\", coinId: \"btc\" }"
	}];
}
function botPick(state, _playerId) {
	const jitter = [...state.coins];
	jitter.sort(() => Math.random() - .5);
	return jitter[0].id;
}
var lastFetchAt = 0;
var lastFetch = null;
async function fetchQuotes() {
	const now = Date.now();
	if (lastFetch && now - lastFetchAt < 8e3) return {
		quotes: lastFetch.quotes.map((q) => ({ ...q })),
		source: lastFetch.source
	};
	const ids = COINS.map((c) => c.geckoId).join(",");
	try {
		const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { headers: { accept: "application/json" } });
		if (!res.ok) throw new Error(String(res.status));
		const json = await res.json();
		const quotes = COINS.map((c) => {
			const usd = json[c.geckoId]?.usd;
			if (typeof usd !== "number") throw new Error("missing quote");
			return {
				id: c.id,
				ticker: c.ticker,
				name: c.name,
				startUsd: usd,
				liveUsd: usd
			};
		});
		lastFetchAt = now;
		lastFetch = {
			quotes,
			source: "coingecko"
		};
		return {
			quotes: quotes.map((q) => ({ ...q })),
			source: "coingecko"
		};
	} catch {
		const quotes = COINS.map((c) => {
			const usd = (c.id === "btc" ? 64e3 : c.id === "eth" ? 2400 : c.id === "sol" ? 140 : c.id === "doge" ? .12 : 12) * (.98 + Math.random() * .04);
			return {
				id: c.id,
				ticker: c.ticker,
				name: c.name,
				startUsd: usd,
				liveUsd: usd
			};
		});
		lastFetchAt = now;
		lastFetch = {
			quotes,
			source: "simulated"
		};
		return {
			quotes,
			source: "simulated"
		};
	}
}
async function refreshQuotes(state) {
	if (state.source === "simulated") {
		for (const c of state.coins) {
			const drift = 1 + (Math.random() - .48) * .012;
			c.liveUsd = Math.max(1e-4, c.liveUsd * drift);
		}
		return;
	}
	try {
		const { quotes } = await fetchQuotes();
		for (const c of state.coins) {
			const q = quotes.find((x) => x.id === c.id);
			if (q) c.liveUsd = q.liveUsd;
		}
	} catch {}
}
function resolveCoinPump(state) {
	for (const c of state.coins) {
		c.endUsd = c.liveUsd;
		c.changePct = c.startUsd === 0 ? 0 : (c.endUsd - c.startUsd) / c.startUsd * 100;
	}
	const ranking = state.coins.map((c) => ({
		id: c.id,
		changePct: c.changePct ?? 0
	})).sort((a, b) => b.changePct - a.changePct);
	const best = ranking[0]?.changePct ?? 0;
	const winnerCoinIds = ranking.filter((r) => Math.abs(r.changePct - best) < 1e-9).map((r) => r.id);
	state.resolved = true;
	return {
		ranking,
		winnerCoinIds
	};
}
var TOPICS = [
	"Should AI agents be allowed to hold their own wallets without a human co-signer?",
	"Is x402 the right primitive for agent-to-agent commerce?",
	"Should on-chain identity be required before an agent can enter a paid arena?",
	"Do autonomous trading agents need a kill-switch controlled by a human?",
	"Is a public text log enough accountability for agents that move money?"
];
var ROUND_SEQUENCE = [
	"opening",
	"opening",
	"rebuttal",
	"rebuttal",
	"closing",
	"closing"
];
var ROUND_MS = {
	opening: 22e3,
	rebuttal: 18e3,
	closing: 14e3
};
function createDebateState(players, now) {
	const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
	const order = players.map((p) => p.id);
	if (Math.random() < .5) order.reverse();
	return {
		topic,
		speakerOrder: order,
		roundIndex: 0,
		speeches: [],
		windowEndsAt: now + ROUND_MS[ROUND_SEQUENCE[0]]
	};
}
function currentDebateSeat(state) {
	if (state.roundIndex >= ROUND_SEQUENCE.length) return null;
	const kind = ROUND_SEQUENCE[state.roundIndex];
	const seat = state.roundIndex % 2;
	return {
		playerId: state.speakerOrder[seat],
		kind
	};
}
function debateLegal(match, playerId) {
	if (match.status !== "playing") return [];
	const state = match.state;
	const seat = currentDebateSeat(state);
	if (!seat || seat.playerId !== playerId) return [];
	if (state.speeches.some((s) => s.playerId === playerId && s.round === seat.kind)) return [];
	return [{
		type: "submit",
		label: `Submit ${seat.kind}`,
		hint: "Send { type: \"submit\", text: \"...\" }"
	}];
}
var BOT_LINES = {
	opening: [
		"The default should be agency. An agent that cannot pay cannot finish the work it was hired to do, and a co-signer becomes a bottleneck disguised as safety.",
		"Payments without identity are how you get stolen pots. Wallets are cheap to spin; reputation is not. Require a bond before you hand over the keys.",
		"x402 is HTTP-native. Agents already speak HTTP. Inventing a second settlement layer just to feel serious is how we stall for another decade."
	],
	rebuttal: [
		"That argument treats every agent as a well-behaved employee. The failure mode is not a polite bug — it is an unattended loop draining a treasury.",
		"A co-signer does not have to sit on every transfer. Thresholds, allowlists, and session keys give you speed without giving up the kill-switch.",
		"Identity theater is not accountability. A public log of every paid action, plus a clawback window, beats a KYC checkbox that nobody reads."
	],
	closing: [
		"Keep the floor open. Charge a bond, publish the log, let the market punish bad agents. Do not freeze the whole category behind a human inbox.",
		"If the pot can move in one call, the risk is real. Build the brake first, then the throttle. That is the only order that survives contact.",
		"The record is the product. Humans watch the log; agents pay to play. That split is the whole design — do not blur it for convenience."
	]
};
function botDebateText(kind, topic, name) {
	const pool = BOT_LINES[kind];
	return `${name} on the floor: ${pool[Math.floor(Math.random() * pool.length)]} The motion is "${topic}".`;
}
var GESTURES = [
	"rock",
	"paper",
	"scissors"
];
var THROW_WINDOW_MS = 14e3;
var SCOUT_FEE = 1e4;
function createRpsState(players, now) {
	const scores = {};
	for (const p of players) scores[p.id] = 0;
	return {
		roundIndex: 0,
		rounds: [emptyRound(0)],
		scores,
		lastThrows: {},
		windowEndsAt: now + THROW_WINDOW_MS,
		scouts: {}
	};
}
function emptyRound(index) {
	return {
		index,
		throws: {},
		scores: {},
		resolved: false
	};
}
function beats(a, b) {
	return a === "rock" && b === "scissors" || a === "scissors" && b === "paper" || a === "paper" && b === "rock";
}
function rpsLegal(match, playerId) {
	if (match.status !== "playing") return [];
	const state = match.state;
	const round = state.rounds[state.roundIndex];
	if (!round || round.resolved) return [];
	const actions = [];
	if (!round.throws[playerId]) actions.push({
		type: "throw",
		label: "Throw",
		options: GESTURES.map((g) => ({
			id: g,
			label: g
		})),
		hint: "Send { type: \"throw\", gesture: \"rock\" }"
	});
	if (!state.scouts[`${state.roundIndex}:${playerId}`] && Object.keys(state.lastThrows).length > 0) actions.push({
		type: "scout",
		label: "Scout last throws",
		fee: SCOUT_FEE,
		hint: "Pay 0.01 USDC to see every opponent's previous throw."
	});
	return actions;
}
function scoreRound(players, throws) {
	const ids = players.map((p) => p.id);
	const gained = {};
	for (const id of ids) gained[id] = 0;
	for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
		const a = ids[i];
		const b = ids[j];
		const ga = throws[a];
		const gb = throws[b];
		if (!ga || !gb) continue;
		if (ga === gb) {
			gained[a] += 1;
			gained[b] += 1;
		} else if (beats(ga, gb)) gained[a] += 2;
		else gained[b] += 2;
	}
	return gained;
}
function botGesture(state, playerId) {
	const last = Object.values(state.lastThrows);
	if (last.length && Math.random() < .45) {
		const target = last[Math.floor(Math.random() * last.length)];
		if (target === "rock") return "paper";
		if (target === "paper") return "scissors";
		return "rock";
	}
	return GESTURES[Math.floor(Math.random() * 3)];
}
function nextRpsRound(state, now) {
	state.roundIndex += 1;
	state.rounds.push(emptyRound(state.roundIndex));
	state.windowEndsAt = now + THROW_WINDOW_MS;
	state.revealing = false;
}
/** Start square → end square. Ladders climb, snakes fall. */
var LADDERS = {
	1: 38,
	4: 14,
	9: 31,
	21: 42,
	28: 84,
	36: 44,
	51: 67,
	71: 91,
	80: 99
};
var SNAKES = {
	16: 6,
	47: 26,
	49: 11,
	56: 53,
	62: 19,
	64: 60,
	87: 24,
	93: 73,
	95: 75,
	98: 78
};
var REROLL_FEE = 2e4;
var WARD_FEE = 3e4;
function createSnakesState(players) {
	const pieces = {};
	for (const p of players) pieces[p.id] = { position: 0 };
	return {
		pieces,
		turnIndex: 0
	};
}
function snakesLegal(match, playerId) {
	if (match.status !== "playing") return [];
	if (match.currentPlayerId !== playerId) return [];
	return [
		{
			type: "roll",
			label: "Roll"
		},
		{
			type: "roll",
			label: "Re-roll (keep higher)",
			fee: REROLL_FEE,
			hint: "Pay 0.02 USDC, roll twice, keep the higher die.",
			options: [{
				id: "reroll",
				label: "reroll"
			}]
		},
		{
			type: "roll",
			label: "Snake ward",
			fee: WARD_FEE,
			hint: "Pay 0.03 USDC and ignore a snake this turn.",
			options: [{
				id: "ward",
				label: "ward"
			}]
		}
	];
}
function applyDie(from, die) {
	let dest = from + die;
	if (dest > 100) dest = 100 - (dest - 100);
	return dest;
}
function resolveSnakesTurn(opts) {
	const d1 = 1 + Math.floor(Math.random() * 6);
	let die = d1;
	const logs = [];
	if (opts.powerup === "reroll") {
		const d2 = 1 + Math.floor(Math.random() * 6);
		die = Math.max(d1, d2);
		logs.push(`${opts.name} paid 0.02 USDC for a re-roll: ${d1} and ${d2}, keeping ${die}.`);
	}
	const bounced = opts.from + die > 100;
	const landed = applyDie(opts.from, die);
	let to = landed;
	let via = "none";
	if (opts.powerup === "ward" && SNAKES[landed]) logs.push(`${opts.name} paid 0.03 USDC for a snake ward, rolled ${die} and landed on ${landed}. The snake was ignored.`);
	else if (SNAKES[landed]) {
		to = SNAKES[landed];
		via = "snake";
		logs.push(`${opts.name} rolled ${die} and landed on a snake at ${landed}, falling to ${to}.`);
	} else if (LADDERS[landed]) {
		to = LADDERS[landed];
		via = "ladder";
		logs.push(`${opts.name} rolled ${die} and climbed the ladder at ${landed}, rising to ${to}.`);
	} else if (bounced) logs.push(`${opts.name} rolled ${die} from ${opts.from}, overshot 100 and bounced to ${landed}.`);
	else if (opts.from === 0) logs.push(`${opts.name} rolled ${die} and entered the board at ${landed}.`);
	else logs.push(`${opts.name} rolled ${die} and moved from ${opts.from} to ${landed}.`);
	const won = to === 100;
	if (won) logs.push(`${opts.name} landed on 100 and won the table.`);
	return {
		die,
		from: opts.from,
		landed,
		to,
		via,
		bounced,
		won,
		logs
	};
}
function snakesBotPowerup(state, playerId) {
	const pos = state.pieces[playerId]?.position ?? 0;
	let snakeAhead = false;
	for (let i = 1; i <= 6; i++) if (SNAKES[pos + i]) snakeAhead = true;
	if (snakeAhead && Math.random() < .55) return "ward";
	if (pos > 85 && Math.random() < .35) return "reroll";
	if (Math.random() < .08) return "reroll";
}
function squareToCell(n) {
	if (n <= 0) return {
		row: 10,
		col: 0
	};
	const idx = n - 1;
	const rowFromBottom = Math.floor(idx / 10);
	const colInRow = idx % 10;
	const col = rowFromBottom % 2 === 1 ? 9 - colInRow : colInRow;
	return {
		row: 9 - rowFromBottom,
		col
	};
}
function legalActionsFor(match, playerId) {
	switch (match.gameId) {
		case "snakes": return snakesLegal(match, playerId);
		case "debate": return debateLegal(match, playerId);
		case "coinpump": return coinPumpLegal(match, playerId);
		case "rps": return rpsLegal(match, playerId);
		default: return [];
	}
}
async function judgeDebate(opts) {
	const [a, b] = opts.speakerOrder;
	const nameA = opts.names[a] ?? "Agent A";
	const nameB = opts.names[b] ?? "Agent B";
	const transcript = opts.speeches.map((s) => `[${s.round} · ${opts.names[s.playerId] ?? s.playerId}]\n${s.text}`).join("\n\n");
	const apiKey = process.env.XAI_API_KEY;
	if (apiKey && transcript.length > 0) try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: "grok-4.5",
				max_tokens: 400,
				messages: [{
					role: "system",
					content: "You are a strict debate judge. Score two agents 0-10 on clarity, evidence, and rebuttal. Reply ONLY JSON: {\"a\":{\"total\":n,\"notes\":\"...\"},\"b\":{\"total\":n,\"notes\":\"...\"},\"verdict\":\"one sentence naming the winner\"}"
				}, {
					role: "user",
					content: `Topic: ${opts.topic}\nAgent A is ${nameA}. Agent B is ${nameB}.\n\n${transcript}`
				}]
			})
		});
		if (res.ok) {
			const text = (await res.json()).choices?.[0]?.message?.content ?? "";
			const jsonStart = text.indexOf("{");
			const jsonEnd = text.lastIndexOf("}");
			if (jsonStart >= 0 && jsonEnd > jsonStart) {
				const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
				return {
					scores: {
						[a]: {
							total: Number(parsed.a.total),
							notes: String(parsed.a.notes)
						},
						[b]: {
							total: Number(parsed.b.total),
							notes: String(parsed.b.notes)
						}
					},
					verdict: String(parsed.verdict)
				};
			}
		}
	} catch {}
	return heuristicJudge(opts);
}
function heuristicJudge(opts) {
	const scores = {};
	for (const id of opts.speakerOrder) {
		const mine = opts.speeches.filter((s) => s.playerId === id);
		const words = mine.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
		const rounds = new Set(mine.map((s) => s.round)).size;
		scores[id] = {
			total: Math.max(3, Math.min(10, Math.round(rounds * 2.2 + Math.min(3, words / 80)))),
			notes: `${opts.names[id]} filed ${rounds}/3 rounds, ${words} words.`
		};
	}
	const [a, b] = opts.speakerOrder;
	const sa = scores[a]?.total ?? 0;
	const sb = scores[b]?.total ?? 0;
	let verdict;
	if (sa === sb) verdict = `Split decision. ${opts.names[a]} and ${opts.names[b]} tied at ${sa}.`;
	else if (sa > sb) verdict = `${opts.names[a]} takes the floor, ${sa} to ${sb}.`;
	else verdict = `${opts.names[b]} takes the floor, ${sb} to ${sa}.`;
	return {
		scores,
		verdict
	};
}
function debateWinners(state) {
	if (!state.scores) return [];
	let best = -Infinity;
	const ids = Object.keys(state.scores);
	for (const id of ids) best = Math.max(best, state.scores[id].total);
	return ids.filter((id) => state.scores[id].total === best);
}
var CATALOG = [
	{
		id: "snakes",
		name: "Snakes & Ladders",
		blurb: "Classic climb, with one paid decision per turn.",
		players: "2–6",
		minPlayers: 2,
		maxPlayers: 6,
		entryFee: 1e5,
		duration: "5–12 min",
		rules: [
			"100-square board. Roll 1d6 each turn.",
			"Land on a ladder and you climb. Land on a snake and you fall.",
			"You must land exactly on 100. Overshoot bounces back.",
			"Once per turn you may buy a re-roll (keep the higher) or a snake ward."
		],
		powerups: [{
			name: "Re-roll",
			fee: 2e4,
			detail: "Roll twice, keep the higher die."
		}, {
			name: "Snake ward",
			fee: 3e4,
			detail: "Ignore a snake this turn."
		}]
	},
	{
		id: "debate",
		name: "Debate 1v1",
		blurb: "Opening, rebuttal, closing. An AI judge scores the floor.",
		players: "2",
		minPlayers: 2,
		maxPlayers: 2,
		entryFee: 15e4,
		duration: "8–15 min (demo is compressed)",
		rules: [
			"Exactly two agents. Three structured rounds.",
			"Opening → Rebuttal → Closing, alternating first speaker.",
			"Submit one argument per window. Miss the window and you forfeit that round.",
			"Grok scores on clarity, evidence, and rebuttal quality. Prize to the winner."
		],
		powerups: []
	},
	{
		id: "coinpump",
		name: "Coin Pump",
		blurb: "Pick the coin that pumps hardest in the window.",
		players: "2–8",
		minPlayers: 2,
		maxPlayers: 8,
		entryFee: 2e5,
		duration: "10 min window",
		rules: [
			"The table lists five coins with live USD prices from CoinGecko.",
			"Each agent picks one coin. Picks lock after 90 seconds.",
			"When the 10-minute clock hits zero, the real price change is scored.",
			"Highest % move wins. Ties split the pot."
		],
		powerups: []
	},
	{
		id: "rps",
		name: "RPS++",
		blurb: "Rock, paper, scissors with a pot, streaks, and a scout.",
		players: "2–4",
		minPlayers: 2,
		maxPlayers: 4,
		entryFee: 5e4,
		duration: "3–7 min",
		rules: [
			"Five rounds. Everyone throws at once.",
			"Win a pairing +2, draw +1, loss 0. Streaks add +1.",
			"Highest score after five rounds takes the pot.",
			"Once per round you may buy a scout of the last throws."
		],
		powerups: [{
			name: "Scout",
			fee: 1e4,
			detail: "See every opponent's last throw this match."
		}]
	}
];
function catalogById(id) {
	const g = CATALOG.find((c) => c.id === id);
	if (!g) throw new Error(`Unknown game ${id}`);
	return g;
}
var BOT_NAMES = [
	"Nova",
	"Atlas",
	"Mira",
	"Hex",
	"Drift",
	"Quill",
	"Vesper",
	"Nim"
];
var ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
function shortId(prefix, len = 4) {
	let s = "";
	for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * 32)];
	return `${prefix}-${s}`;
}
function uid(prefix = "id") {
	return shortId(prefix, 6);
}
var GAME_PREFIX = {
	snakes: "sl",
	debate: "db",
	coinpump: "cp",
	rps: "rp"
};
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function formatUsdc(micros) {
	const sign = micros < 0 ? "-" : "";
	const abs = Math.abs(micros);
	const whole = Math.floor(abs / 1e6);
	const frac = abs % 1e6;
	if (frac === 0) return `${sign}${whole} USDC`;
	return `${sign}${whole}.${frac.toString().padStart(6, "0").replace(/0+$/, "")} USDC`;
}
function formatClock(ts) {
	const d = new Date(ts);
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
function initials(name) {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}
function paymentAccept(opts) {
	return {
		scheme: "exact",
		network: "base",
		maxAmountRequired: String(opts.amount),
		resource: opts.resource,
		description: opts.description,
		mimeType: "application/json",
		payTo: TREASURY,
		maxTimeoutSeconds: 60,
		asset: USDC_BASE,
		extra: {
			name: "USD Coin",
			version: "2",
			kind: opts.kind
		}
	};
}
function parsePaymentHeader(header, bodyWalletId) {
	if (bodyWalletId && bodyWalletId.trim()) return { walletId: bodyWalletId.trim() };
	if (!header) return null;
	const raw = header.trim();
	try {
		const decoded = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
		const parsed = JSON.parse(decoded);
		const id = parsed.walletId ?? parsed.from;
		if (typeof id === "string" && id.length > 0) return { walletId: id };
	} catch {
		if (/^[a-zA-Z0-9_-]{2,40}$/.test(raw)) return { walletId: raw };
	}
	return null;
}
function debit(wallet, amount) {
	if (wallet.balance < amount) throw new PayError(`Insufficient balance: ${wallet.name} has ${formatUsdc(wallet.balance)}, needs ${formatUsdc(amount)}`);
	wallet.balance -= amount;
}
function credit(wallet, amount) {
	wallet.balance += amount;
}
var PayError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "PayError";
	}
};
var _0002_floor_default = "-- Durable floor: wallets, matches, ledger. Unowned (no user_id) — world-readable.\ncreate table if not exists wallets (\n  id         text primary key,\n  name       text not null,\n  balance    integer not null,\n  created_at bigint not null\n);\n\ncreate table if not exists matches (\n  id         text primary key,\n  game_id    text not null,\n  status     text not null,\n  created_at bigint not null,\n  updated_at bigint not null,\n  payload    jsonb not null\n);\n\ncreate index if not exists matches_status_idx on matches (status);\ncreate index if not exists matches_created_idx on matches (created_at desc);\n\ncreate table if not exists ledger (\n  id       text primary key,\n  ts       bigint not null,\n  from_id  text not null,\n  to_id    text not null,\n  amount   integer not null,\n  kind     text not null,\n  match_id text,\n  note     text not null\n);\n\ncreate index if not exists ledger_ts_idx on ledger (ts desc);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({ "/migrations/0002_floor.sql": _0002_floor_default });
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
function asMatch(raw) {
	if (typeof raw === "string") return JSON.parse(raw);
	return raw;
}
async function loadAll() {
	const sql = await getSql();
	const walletRows = await sql`
    select id, name, balance, created_at from wallets order by name
  `;
	const matchRows = await sql`
    select id, payload from matches order by created_at desc limit 80
  `;
	const ledgerRows = await sql`
    select id, ts, from_id, to_id, amount, kind, match_id, note from ledger order by ts desc limit 400
  `;
	return {
		wallets: walletRows.map((r) => ({
			id: r.id,
			name: r.name,
			balance: Number(r.balance),
			createdAt: Number(r.created_at)
		})),
		matches: matchRows.map((r) => asMatch(r.payload)),
		ledger: ledgerRows.map((r) => ({
			id: r.id,
			ts: Number(r.ts),
			from: r.from_id,
			to: r.to_id,
			amount: Number(r.amount),
			kind: r.kind,
			matchId: r.match_id ?? void 0,
			note: r.note
		}))
	};
}
async function saveWallet(wallet) {
	await (await getSql()).query(`insert into wallets (id, name, balance, created_at)
     values ($1, $2, $3, $4)
     on conflict (id) do update set
       name = excluded.name,
       balance = excluded.balance`, [
		wallet.id,
		wallet.name,
		wallet.balance,
		wallet.createdAt
	]);
}
async function saveMatch(match) {
	await (await getSql()).query(`insert into matches (id, game_id, status, created_at, updated_at, payload)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     on conflict (id) do update set
       game_id = excluded.game_id,
       status = excluded.status,
       updated_at = excluded.updated_at,
       payload = excluded.payload`, [
		match.id,
		match.gameId,
		match.status,
		match.createdAt,
		Date.now(),
		JSON.stringify(match)
	]);
}
async function saveLedger(entry) {
	await (await getSql()).query(`insert into ledger (id, ts, from_id, to_id, amount, kind, match_id, note)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do nothing`, [
		entry.id,
		entry.ts,
		entry.from,
		entry.to,
		entry.amount,
		entry.kind,
		entry.matchId ?? null,
		entry.note
	]);
}
async function deleteMatch(id) {
	await (await getSql()).query(`delete from matches where id = $1`, [id]);
}
var store_server_exports = /* @__PURE__ */ __exportAll({
	addBots: () => addBots,
	createMatch: () => createMatch,
	createWallet: () => createWallet,
	getMatch: () => getMatch,
	joinMatch: () => joinMatch,
	listCatalog: () => listCatalog,
	listMatches: () => listMatches,
	listWallets: () => listWallets,
	recentTape: () => recentTape,
	submitAction: () => submitAction,
	tickFloor: () => tickFloor,
	toPublic: () => toPublic
});
var TINTS = [
	"p1",
	"p2",
	"p3",
	"p4",
	"p5",
	"p6"
];
var STARTING_BALANCE = 5e6;
var TURN_MS = 18e3;
function getWorld() {
	const g = globalThis;
	if (!g.__px402d) g.__px402d = {
		wallets: /* @__PURE__ */ new Map(),
		matches: /* @__PURE__ */ new Map(),
		ledger: [],
		ticking: false,
		hydrated: false,
		lastTick: 0,
		dirtyWallets: /* @__PURE__ */ new Set(),
		dirtyMatches: /* @__PURE__ */ new Set(),
		pendingLedger: []
	};
	return g.__px402d;
}
async function ready() {
	const world = getWorld();
	if (world.hydrated) return world;
	if (!world.hydrating) world.hydrating = hydrate(world).catch((err) => {
		world.hydrating = void 0;
		throw err;
	});
	await world.hydrating;
	return world;
}
async function hydrate(world) {
	const data = await loadAll();
	if (data.wallets.length === 0) seedBots(world);
	else for (const w of data.wallets) world.wallets.set(w.id, w);
	for (const m of data.matches) world.matches.set(m.id, m);
	world.ledger = data.ledger;
	world.hydrated = true;
	await ensureHouseTable();
	await flush();
	startTicker();
}
function seedBots(world) {
	for (const name of BOT_NAMES) {
		const id = name.toLowerCase();
		const wallet = {
			id,
			name,
			balance: STARTING_BALANCE,
			createdAt: Date.now()
		};
		world.wallets.set(id, wallet);
		world.dirtyWallets.add(id);
	}
}
function startTicker() {
	const world = getWorld();
	if (world.ticking) return;
	world.ticking = true;
	setInterval(() => {
		tickFloor().catch(() => void 0);
	}, 1e3);
}
function touchWallet(wallet) {
	getWorld().dirtyWallets.add(wallet.id);
}
function touchMatch(match) {
	getWorld().dirtyMatches.add(match.id);
}
function log(match, kind, text, playerId) {
	match.logs.push({
		id: uid("lg"),
		ts: Date.now(),
		kind,
		text,
		playerId
	});
	if (match.logs.length > 250) match.logs.splice(0, match.logs.length - 250);
	touchMatch(match);
}
function recordLedger(entry) {
	const world = getWorld();
	const full = {
		...entry,
		id: uid("ld"),
		ts: Date.now()
	};
	world.ledger.unshift(full);
	if (world.ledger.length > 400) world.ledger.length = 400;
	world.pendingLedger.push(full);
}
async function flush() {
	const world = getWorld();
	const walletIds = [...world.dirtyWallets];
	const matchIds = [...world.dirtyMatches];
	const ledger = world.pendingLedger.splice(0, world.pendingLedger.length);
	world.dirtyWallets.clear();
	world.dirtyMatches.clear();
	for (const id of walletIds) {
		const w = world.wallets.get(id);
		if (w) await saveWallet(w);
	}
	for (const id of matchIds) {
		const m = world.matches.get(id);
		if (m) await saveMatch(m);
	}
	for (const e of ledger) await saveLedger(e);
}
var tickChain = Promise.resolve();
var inTick = false;
async function tickFloor() {
	await ready();
	if (inTick) return;
	const run = async () => {
		if (inTick) return;
		inTick = true;
		try {
			const world = getWorld();
			const now = Date.now();
			if (now - world.lastTick < 500 && world.lastTick > 0) return;
			world.lastTick = now;
			await tickAll();
			await ensureHouseTable();
			await pruneFinished();
			await flush();
		} finally {
			inTick = false;
		}
	};
	tickChain = tickChain.then(run, run);
	await tickChain;
}
function playerName(match, id) {
	return match.players.find((p) => p.id === id)?.name ?? id;
}
async function ensureHouseTable() {
	if ([...getWorld().matches.values()].some((m) => m.gameId === "snakes" && m.status !== "finished")) return;
	await createMatchInternal({
		gameId: "snakes",
		withBots: true,
		fill: 4
	});
}
async function pruneFinished() {
	const world = getWorld();
	const finished = [...world.matches.values()].filter((m) => m.status === "finished").sort((a, b) => (b.finishedAt ?? b.createdAt) - (a.finishedAt ?? a.createdAt));
	if (finished.length <= 40) return;
	const drop = finished.slice(40);
	for (const m of drop) {
		world.matches.delete(m.id);
		await deleteMatch(m.id);
	}
}
function listCatalog() {
	return CATALOG;
}
async function listWallets() {
	return [...(await ready()).wallets.values()].sort((a, b) => a.name.localeCompare(b.name));
}
async function createWallet(name) {
	const world = await ready();
	const trimmed = name.trim().slice(0, 24);
	if (!trimmed) throw new Error("Name is required");
	const base = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "agent";
	let id = base;
	let n = 2;
	while (world.wallets.has(id)) id = `${base}${n++}`;
	const wallet = {
		id,
		name: trimmed,
		balance: STARTING_BALANCE,
		createdAt: Date.now()
	};
	world.wallets.set(id, wallet);
	touchWallet(wallet);
	await flush();
	return wallet;
}
async function listMatches() {
	await tickFloor();
	return [...getWorld().matches.values()].sort((a, b) => b.createdAt - a.createdAt);
}
async function getMatch(id) {
	await tickFloor();
	return getWorld().matches.get(id);
}
function toPublic(match, agentId) {
	const you = agentId ? match.players.find((p) => p.id === agentId) : void 0;
	return {
		id: match.id,
		gameId: match.gameId,
		status: match.status,
		players: match.players,
		minPlayers: match.minPlayers,
		maxPlayers: match.maxPlayers,
		entryFee: match.entryFee,
		prizePool: match.prizePool,
		withBots: match.withBots,
		createdAt: match.createdAt,
		startedAt: match.startedAt,
		finishedAt: match.finishedAt,
		currentPlayerId: match.currentPlayerId,
		turnDeadline: match.turnDeadline,
		state: match.state,
		logs: match.logs,
		winners: match.winners,
		payouts: match.payouts,
		you,
		legalActions: agentId ? legalActionsFor(match, agentId) : void 0
	};
}
async function createMatchInternal(opts) {
	const spec = catalogById(opts.gameId);
	const match = {
		id: shortId(GAME_PREFIX[opts.gameId] ?? "gm"),
		gameId: opts.gameId,
		status: "lobby",
		players: [],
		minPlayers: spec.minPlayers,
		maxPlayers: spec.maxPlayers,
		entryFee: spec.entryFee,
		prizePool: 0,
		withBots: Boolean(opts.withBots),
		createdAt: Date.now(),
		state: {},
		logs: [],
		winners: [],
		payouts: []
	};
	getWorld().matches.set(match.id, match);
	log(match, "system", `Table ${match.id} opened for ${spec.name}. Entry ${formatUsdc(spec.entryFee)}. Need ${spec.minPlayers}–${spec.maxPlayers} agents.`);
	if (opts.withBots) {
		fillBots(match, Math.min(opts.fill ?? {
			snakes: 4,
			debate: 2,
			coinpump: 4,
			rps: 3
		}[opts.gameId] ?? spec.minPlayers, spec.maxPlayers));
		if (match.players.length >= spec.minPlayers) await startMatch(match);
	}
	touchMatch(match);
	return match;
}
async function createMatch(opts) {
	await ready();
	const match = await createMatchInternal(opts);
	await flush();
	return match;
}
function unusedBot(match) {
	const taken = new Set(match.players.map((p) => p.walletId));
	const world = getWorld();
	for (const name of BOT_NAMES) {
		const w = world.wallets.get(name.toLowerCase());
		if (w && !taken.has(w.id) && w.balance >= match.entryFee) return w;
	}
}
function fillBots(match, target) {
	while (match.players.length < target) {
		const w = unusedBot(match);
		if (!w) break;
		seatPlayer(match, w, "bot");
	}
}
async function addBots(matchId, count = 2) {
	await ready();
	const match = mustMatch(matchId);
	if (match.status !== "lobby") throw new Error("Table already underway");
	fillBots(match, Math.min(match.players.length + count, match.maxPlayers));
	if (match.players.length >= match.minPlayers) await startMatch(match);
	await flush();
	return match;
}
function mustMatch(id) {
	const m = getWorld().matches.get(id);
	if (!m) throw new Error("Table not found");
	return m;
}
function mustWallet(id) {
	const w = getWorld().wallets.get(id);
	if (!w) throw new Error("Wallet not found");
	return w;
}
function seatPlayer(match, wallet, controller) {
	if (match.status !== "lobby") throw new Error("Table is not in lobby");
	if (match.players.length >= match.maxPlayers) throw new Error("Table is full");
	if (match.players.some((p) => p.walletId === wallet.id)) throw new Error("Already seated");
	debit(wallet, match.entryFee);
	touchWallet(wallet);
	match.prizePool += match.entryFee;
	recordLedger({
		from: wallet.id,
		to: "treasury",
		amount: match.entryFee,
		kind: "entry",
		matchId: match.id,
		note: `Entry ${match.gameId} ${match.id}`
	});
	const player = {
		id: wallet.id,
		name: wallet.name,
		walletId: wallet.id,
		controller,
		tint: TINTS[match.players.length % TINTS.length],
		joinedAt: Date.now(),
		connected: true
	};
	match.players.push(player);
	log(match, "join", `${player.name} paid ${formatUsdc(match.entryFee)} entry and sat down. Pot ${formatUsdc(match.prizePool)}.`, player.id);
	log(match, "pay", `${player.name} → treasury ${formatUsdc(match.entryFee)} (entry).`, player.id);
	return player;
}
async function joinMatch(opts) {
	await ready();
	const match = mustMatch(opts.matchId);
	if (match.status !== "lobby") return {
		ok: false,
		error: "Table is not in lobby"
	};
	const parsed = parsePaymentHeader(opts.paymentHeader ?? null, opts.walletId);
	if (!parsed) return {
		ok: false,
		paymentRequired: {
			x402Version: 1,
			accepts: [paymentAccept({
				amount: match.entryFee,
				resource: `/api/v1/matches/${match.id}/join`,
				description: `Entry fee for ${match.id}`,
				kind: "entry"
			})]
		}
	};
	try {
		const wallet = mustWallet(parsed.walletId);
		seatPlayer(match, wallet, opts.controller ?? "human");
		if (match.players.length >= match.maxPlayers) await startMatch(match);
		await flush();
		return {
			ok: true,
			match: toPublic(match, wallet.id)
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Join failed"
		};
	}
}
async function startMatch(match) {
	if (match.status !== "lobby") return;
	if (match.players.length < match.minPlayers) return;
	if (match.gameId === "coinpump") {
		const { quotes, source } = await fetchQuotes();
		if (match.status !== "lobby") return;
		const state = createCoinPumpState(Date.now(), quotes, source);
		match.state = state;
		match.status = "playing";
		match.startedAt = Date.now();
		match.turnDeadline = state.windowEndsAt;
		log(match, "system", `Match started with ${match.players.length} agents. Prize pool ${formatUsdc(match.prizePool)}.`);
		log(match, "system", `Five coins are on the tape. Window 10 minutes, picks lock in 90s. Source: ${source === "coingecko" ? "CoinGecko spot" : "simulated spot (feed unavailable)"}.`);
		for (const c of quotes) log(match, "system", `${c.ticker} opens at $${c.startUsd.toFixed(c.startUsd < 2 ? 4 : 2)}.`);
		return;
	}
	match.status = "playing";
	match.startedAt = Date.now();
	log(match, "system", `Match started with ${match.players.length} agents. Prize pool ${formatUsdc(match.prizePool)}.`);
	switch (match.gameId) {
		case "snakes":
			match.state = createSnakesState(match.players);
			match.currentPlayerId = match.players[0].id;
			match.turnDeadline = Date.now() + TURN_MS;
			log(match, "system", `${match.players[0].name} opens the dice.`);
			break;
		case "debate": {
			const state = createDebateState(match.players, Date.now());
			match.state = state;
			const seat = currentDebateSeat(state);
			match.currentPlayerId = seat?.playerId;
			match.turnDeadline = state.windowEndsAt;
			log(match, "system", `Motion: ${state.topic}`);
			if (seat) log(match, "system", `${playerName(match, seat.playerId)} has the floor for opening.`, seat.playerId);
			break;
		}
		case "rps": {
			const state = createRpsState(match.players, Date.now());
			match.state = state;
			match.turnDeadline = state.windowEndsAt;
			log(match, "system", "Round 1 of 5. Throw rock, paper, or scissors.");
			break;
		}
	}
}
function advanceSnakesTurn(match) {
	const state = match.state;
	state.turnIndex = (state.turnIndex + 1) % match.players.length;
	match.currentPlayerId = match.players[state.turnIndex].id;
	match.turnDeadline = Date.now() + TURN_MS;
}
function finishMatch(match, winnerIds) {
	if (match.status === "finished") return;
	match.status = "finished";
	match.finishedAt = Date.now();
	match.currentPlayerId = void 0;
	match.turnDeadline = void 0;
	match.winners = winnerIds;
	if (winnerIds.length === 0 || match.prizePool <= 0) {
		log(match, "win", "No winner. Pot stays in the treasury.");
		return;
	}
	const share = Math.floor(match.prizePool / winnerIds.length);
	const remainder = match.prizePool - share * winnerIds.length;
	for (let i = 0; i < winnerIds.length; i++) {
		const id = winnerIds[i];
		const amount = share + (i === 0 ? remainder : 0);
		const wallet = getWorld().wallets.get(id);
		if (wallet) {
			credit(wallet, amount);
			touchWallet(wallet);
			match.payouts.push({
				playerId: id,
				amount
			});
			recordLedger({
				from: "treasury",
				to: wallet.id,
				amount,
				kind: "payout",
				matchId: match.id,
				note: `Prize ${match.id}`
			});
			log(match, "win", `${wallet.name} is paid ${formatUsdc(amount)} from the pot.`, id);
		}
	}
	match.prizePool = 0;
}
function takePowerupFee(match, wallet, amount, note) {
	debit(wallet, amount);
	touchWallet(wallet);
	match.prizePool += amount;
	recordLedger({
		from: wallet.id,
		to: "treasury",
		amount,
		kind: "powerup",
		matchId: match.id,
		note
	});
	log(match, "pay", `${wallet.name} paid ${formatUsdc(amount)} (${note}). Pot ${formatUsdc(match.prizePool)}.`, wallet.id);
}
async function submitAction(opts) {
	await ready();
	const match = mustMatch(opts.matchId);
	if (match.status !== "playing") return {
		ok: false,
		error: "Match is not live"
	};
	const parsed = parsePaymentHeader(opts.paymentHeader ?? null, opts.walletId);
	if (!parsed) return {
		ok: false,
		error: "Missing wallet / X-PAYMENT"
	};
	const player = match.players.find((p) => p.id === parsed.walletId);
	if (!player) return {
		ok: false,
		error: "You are not seated at this table"
	};
	try {
		applyAction(match, player, opts.action, opts.paymentHeader ?? null);
		await flush();
		return {
			ok: true,
			match: toPublic(match, player.id)
		};
	} catch (err) {
		if (err instanceof PaymentNeeded) return {
			ok: false,
			paymentRequired: err.body
		};
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Action failed"
		};
	}
}
var PaymentNeeded = class extends Error {
	body;
	constructor(accepts) {
		super("Payment required");
		this.body = {
			x402Version: 1,
			accepts
		};
	}
};
function requirePaid(match, player, header, amount, kind, note) {
	const wallet = mustWallet(player.walletId);
	if (!parsePaymentHeader(header, player.walletId)) throw new PaymentNeeded([paymentAccept({
		amount,
		resource: `/api/v1/matches/${match.id}/action`,
		description: note,
		kind
	})]);
	try {
		takePowerupFee(match, wallet, amount, note);
	} catch (err) {
		if (err instanceof PayError) throw err;
		throw err;
	}
}
function applyAction(match, player, action, header) {
	const type = String(action.type ?? "");
	switch (match.gameId) {
		case "snakes":
			applySnakes(match, player, type, action, header);
			break;
		case "debate":
			applyDebate(match, player, type, action);
			break;
		case "coinpump":
			applyCoinPump(match, player, type, action);
			break;
		case "rps":
			applyRps(match, player, type, action, header);
			break;
		default: throw new Error("Unknown game");
	}
}
function applySnakes(match, player, type, action, header) {
	if (match.currentPlayerId !== player.id) throw new Error("Not your turn");
	if (type !== "roll") throw new Error("Send { type: \"roll\" } with optional powerup");
	const powerupRaw = action.powerup ?? action.option;
	const powerup = powerupRaw === "reroll" || powerupRaw === "ward" ? powerupRaw : void 0;
	if (powerup === "reroll") requirePaid(match, player, header, REROLL_FEE, "reroll", "re-roll");
	if (powerup === "ward") requirePaid(match, player, header, WARD_FEE, "ward", "snake ward");
	const state = match.state;
	const piece = state.pieces[player.id] ?? { position: 0 };
	const result = resolveSnakesTurn({
		name: player.name,
		from: piece.position,
		powerup
	});
	piece.position = result.to;
	state.pieces[player.id] = piece;
	state.lastRoll = {
		playerId: player.id,
		die: result.die,
		from: result.from,
		to: result.to
	};
	for (const line of result.logs) log(match, "move", line, player.id);
	if (result.won) {
		finishMatch(match, [player.id]);
		return;
	}
	advanceSnakesTurn(match);
}
function applyDebate(match, player, type, action) {
	if (type !== "submit") throw new Error("Send { type: \"submit\", text: \"...\" }");
	const text = String(action.text ?? "").trim();
	if (text.length < 12) throw new Error("Argument is too short");
	if (text.length > 1200) throw new Error("Argument is too long");
	const state = match.state;
	const seat = currentDebateSeat(state);
	if (!seat || seat.playerId !== player.id) throw new Error("Not your window");
	if (state.speeches.some((s) => s.playerId === player.id && s.round === seat.kind)) throw new Error("Already submitted this round");
	state.speeches.push({
		playerId: player.id,
		round: seat.kind,
		text,
		submittedAt: Date.now()
	});
	log(match, "move", `${player.name} filed their ${seat.kind}: "${truncate(text, 160)}"`, player.id);
	advanceDebate(match);
}
function advanceDebate(match) {
	const state = match.state;
	state.roundIndex += 1;
	if (state.roundIndex >= ROUND_SEQUENCE.length) {
		match.currentPlayerId = void 0;
		match.turnDeadline = void 0;
		state.judging = true;
		state.judgeStarted = Date.now();
		log(match, "judge", "The floor is closed. The judge is scoring.");
		runJudge(match);
		return;
	}
	const kind = ROUND_SEQUENCE[state.roundIndex];
	const seat = currentDebateSeat(state);
	state.windowEndsAt = Date.now() + ROUND_MS[kind];
	match.currentPlayerId = seat?.playerId;
	match.turnDeadline = state.windowEndsAt;
	if (seat) log(match, "system", `${playerName(match, seat.playerId)} has the floor for ${kind}.`, seat.playerId);
}
async function runJudge(match) {
	const state = match.state;
	const names = {};
	for (const p of match.players) names[p.id] = p.name;
	const result = await judgeDebate({
		topic: state.topic,
		names,
		speeches: state.speeches,
		speakerOrder: state.speakerOrder
	});
	state.scores = result.scores;
	state.verdict = result.verdict;
	state.judging = false;
	log(match, "judge", result.verdict);
	for (const p of match.players) {
		const s = result.scores[p.id];
		if (s) log(match, "judge", `${p.name}: ${s.total}/10 — ${s.notes}`, p.id);
	}
	finishMatch(match, debateWinners(state));
	await flush();
}
function applyCoinPump(match, player, type, action) {
	if (type !== "pick") throw new Error("Send { type: \"pick\", coinId: \"btc\" }");
	const state = match.state;
	if (Date.now() >= state.lockAt) throw new Error("Picks are locked");
	const coinId = String(action.coinId ?? action.option ?? "");
	const coin = state.coins.find((c) => c.id === coinId || c.ticker.toLowerCase() === coinId.toLowerCase());
	if (!coin) throw new Error("Unknown coin");
	state.picks[player.id] = coin.id;
	log(match, "move", `${player.name} picks ${coin.ticker}.`, player.id);
}
function applyRps(match, player, type, action, header) {
	const state = match.state;
	const round = state.rounds[state.roundIndex];
	if (!round || round.resolved) throw new Error("Wait for the next round");
	if (type === "scout") {
		requirePaid(match, player, header, SCOUT_FEE, "scout", "scout");
		state.scouts[`${state.roundIndex}:${player.id}`] = true;
		const seen = match.players.filter((p) => p.id !== player.id && state.lastThrows[p.id]).map((p) => `${p.name} last threw ${state.lastThrows[p.id]}`).join("; ");
		log(match, "move", `${player.name} bought a scout. ${seen || "No prior throws on record."}`, player.id);
		return;
	}
	if (type !== "throw") throw new Error("Send { type: \"throw\", gesture: \"rock\" }");
	const gesture = String(action.gesture ?? action.option ?? "");
	if (!GESTURES.includes(gesture)) throw new Error("gesture must be rock, paper, or scissors");
	if (round.throws[player.id]) throw new Error("Already thrown this round");
	round.throws[player.id] = gesture;
	log(match, "move", `${player.name} locks a throw.`, player.id);
	if (Object.keys(round.throws).length >= match.players.length) resolveRpsRound(match);
}
function resolveRpsRound(match) {
	const state = match.state;
	const round = state.rounds[state.roundIndex];
	if (!round || round.resolved) return;
	for (const p of match.players) if (!round.throws[p.id]) {
		const g = botGesture(state, p.id);
		round.throws[p.id] = g;
		log(match, "move", `${p.name} missed the window and the table drew ${g}.`, p.id);
	}
	const gained = scoreRound(match.players, round.throws);
	round.scores = gained;
	round.resolved = true;
	state.revealing = true;
	const streakBefore = { ...state.scores };
	for (const p of match.players) {
		const g = round.throws[p.id];
		state.lastThrows[p.id] = g;
		let add = gained[p.id] ?? 0;
		if ((streakBefore[p.id] ?? 0) > 0 && add >= 2) add += 1;
		state.scores[p.id] = (state.scores[p.id] ?? 0) + add;
		log(match, "move", `${p.name} threw ${g} · +${add} this round · total ${state.scores[p.id]}.`, p.id);
	}
	if (state.roundIndex + 1 >= 5) {
		const max = Math.max(...match.players.map((p) => state.scores[p.id] ?? 0));
		const winners = match.players.filter((p) => (state.scores[p.id] ?? 0) === max).map((p) => p.id);
		log(match, "system", "Five rounds in the book.");
		finishMatch(match, winners);
		return;
	}
	nextRpsRound(state, Date.now());
	match.turnDeadline = state.windowEndsAt;
	log(match, "system", `Round ${state.roundIndex + 1} of 5.`);
}
function truncate(s, n) {
	return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
async function tickAll() {
	const world = getWorld();
	for (const match of world.matches.values()) try {
		await tickMatch(match);
	} catch {}
}
async function tickMatch(match) {
	const now = Date.now();
	if (match.status === "lobby") {
		if (match.withBots && match.players.length < match.minPlayers) fillBots(match, match.minPlayers);
		if (match.players.length >= match.minPlayers) {
			if (now - Math.max(...match.players.map((p) => p.joinedAt), match.createdAt) > 6e3 || match.players.length >= match.maxPlayers || match.withBots) await startMatch(match);
		}
	}
	if (match.status !== "playing") return;
	if (match.gameId === "snakes") {
		const current = match.players.find((p) => p.id === match.currentPlayerId);
		if (!current) return;
		const due = (match.turnDeadline ?? 0) <= now;
		const botReady = current.controller === "bot" && (match.turnDeadline ?? 0) - now < 16800;
		if (due || botReady) {
			const state = match.state;
			const powerup = current.controller === "bot" ? snakesBotPowerup(state, current.id) : void 0;
			const action = { type: "roll" };
			if (powerup) action.powerup = powerup;
			try {
				applyAction(match, current, action, current.walletId);
			} catch {
				applyAction(match, current, { type: "roll" }, current.walletId);
			}
		}
		return;
	}
	if (match.gameId === "debate") {
		const state = match.state;
		if (state.judging) {
			if (!state.verdict) {
				const started = state.judgeStarted ?? 0;
				if (!started || Date.now() - started > 25e3) {
					state.judgeStarted = Date.now();
					runJudge(match);
				}
			}
			return;
		}
		const seat = currentDebateSeat(state);
		if (!seat) return;
		const player = match.players.find((p) => p.id === seat.playerId);
		if (!player) return;
		const expired = now >= state.windowEndsAt;
		const botReady = player.controller === "bot" && now > (match.startedAt ?? now) && state.windowEndsAt - now < ROUND_MS[seat.kind] - 3500;
		if (expired) {
			log(match, "system", `${player.name} let the ${seat.kind} window close in silence.`, player.id);
			advanceDebate(match);
			return;
		}
		if (botReady && !state.speeches.some((s) => s.playerId === player.id && s.round === seat.kind)) applyDebate(match, player, "submit", {
			type: "submit",
			text: botDebateText(seat.kind, state.topic, player.name)
		});
		return;
	}
	if (match.gameId === "coinpump") {
		const state = match.state;
		if (state.resolved) return;
		if (now - (state.lastQuoteAt ?? 0) > 15e3) {
			state.lastQuoteAt = now;
			await refreshQuotes(state);
		}
		if (now < state.lockAt) for (const p of match.players) {
			if (p.controller !== "bot") continue;
			if (state.picks[p.id]) continue;
			if (state.lockAt - now < 2e4 || Math.random() < .25) applyCoinPump(match, p, "pick", {
				type: "pick",
				coinId: botPick(state, p.id)
			});
		}
		if (now >= state.windowEndsAt) {
			await refreshQuotes(state);
			const { ranking, winnerCoinIds } = resolveCoinPump(state);
			const top = ranking[0];
			log(match, "system", `Window closed. Top tape: ${state.coins.find((c) => c.id === top?.id)?.ticker ?? "?"} ${top && top.changePct >= 0 ? "+" : ""}${top?.changePct.toFixed(3)}%.`);
			for (const c of state.coins) {
				const pct = c.changePct ?? 0;
				log(match, "system", `${c.ticker} ${pct >= 0 ? "+" : ""}${pct.toFixed(3)}%  ($${c.startUsd.toFixed(c.startUsd < 2 ? 4 : 2)} → $${(c.endUsd ?? c.liveUsd).toFixed(c.endUsd && c.endUsd < 2 ? 4 : 2)})`);
			}
			const winners = match.players.filter((p) => winnerCoinIds.includes(state.picks[p.id] ?? "")).map((p) => p.id);
			if (winners.length === 0) {
				log(match, "win", "Nobody picked the top tape. Pot stays in the treasury.");
				finishMatch(match, []);
			} else {
				log(match, "win", `${winners.map((id) => playerName(match, id)).join(", ")} called it.`);
				finishMatch(match, winners);
			}
		}
		return;
	}
	if (match.gameId === "rps") {
		const state = match.state;
		const round = state.rounds[state.roundIndex];
		if (!round || round.resolved) return;
		for (const p of match.players) {
			if (p.controller !== "bot") continue;
			if (round.throws[p.id]) continue;
			if (state.windowEndsAt - now < 12200 && Math.random() < .5) applyRps(match, p, "throw", {
				type: "throw",
				gesture: botGesture(state, p.id)
			}, p.walletId);
		}
		if (now >= state.windowEndsAt) resolveRpsRound(match);
	}
}
async function recentTape(limit = 12) {
	await ready();
	const out = [];
	for (const m of getWorld().matches.values()) for (const l of m.logs.slice(-6)) out.push({
		matchId: m.id,
		gameId: m.gameId,
		line: l.text,
		ts: l.ts
	});
	return out.sort((a, b) => b.ts - a.ts).slice(0, limit);
}
//#endregion
export { LADDERS as _, joinMatch as a, currentDebateSeat as b, listWallets as c, tickFloor as d, toPublic as f, initials as g, formatUsdc as h, getMatch as i, store_server_exports as l, formatClock as m, createMatch as n, listCatalog as o, cn as p, createWallet as r, listMatches as s, addBots as t, submitAction as u, SNAKES as v, __exportAll as x, squareToCell as y };

import { c as lobbyIdleSince, i as MAX_PLAY_MS, l as safeBalance, o as TREASURY, s as USDC_BASE, t as EMPTY_LOBBY_MS } from "./types-B31LXrbA.mjs";
import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store.server-CN2ZBtcQ.js
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
	if (state.picks[playerId]) return [];
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
		const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, {
			headers: { accept: "application/json" },
			signal: AbortSignal.timeout(4e3)
		});
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
	opening: 9e4,
	rebuttal: 75e3,
	closing: 6e4
};
function createDebateState(players, now, config) {
	const topic = (typeof config?.topic === "string" ? config.topic.trim().slice(0, 200) : "") || TOPICS[Math.floor(Math.random() * TOPICS.length)];
	const order = players.map((p) => p.id);
	if (Math.random() < .5) order.reverse();
	const kind = ROUND_SEQUENCE[0];
	const roundMs = typeof config?.timePerRound === "number" && Number.isFinite(config.timePerRound) ? Math.min(18e4, Math.max(15e3, Math.round(config.timePerRound))) : void 0;
	const window = roundMs ?? ROUND_MS[kind];
	const rubric = config?.judgingRubric;
	return {
		topic,
		speakerOrder: order,
		roundIndex: 0,
		speeches: [],
		windowEndsAt: now + window,
		rubric: rubric === "logic" || rubric === "data" || rubric === "persuasion" ? rubric : "balanced",
		roundMs
	};
}
function debateWindowMs(state, kind) {
	return state.roundMs ?? ROUND_MS[kind];
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
var THROW_WINDOW_MS = 8e3;
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
	if (round.throws[playerId]) return [];
	const actions = [{
		type: "throw",
		label: "Throw",
		options: GESTURES.map((g) => ({
			id: g,
			label: g
		})),
		hint: "Send { type: \"throw\", gesture: \"rock\" }"
	}];
	if (!state.scouts[`${state.roundIndex}:${playerId}`] && Object.keys(state.lastThrows).length > 0) actions.push({
		type: "scout",
		label: "Scout last throws",
		fee: SCOUT_FEE,
		hint: "Pay 0.01 USDC to see every opponent's previous throw. Scout BEFORE you throw. After a throw, legalActions is empty."
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
var SNAKES_TURN_MS = 15e3;
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
			label: "Roll",
			hint: "Send { \"type\": \"roll\" }"
		},
		{
			type: "reroll",
			label: "Re-roll (keep higher)",
			fee: REROLL_FEE,
			hint: "Send { \"type\": \"roll\", \"powerup\": \"reroll\" } or { \"type\": \"reroll\" }"
		},
		{
			type: "ward",
			label: "Snake ward",
			fee: WARD_FEE,
			hint: "Send { \"type\": \"roll\", \"powerup\": \"ward\" } or { \"type\": \"ward\" }"
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
function uniqueByType(actions) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const a of actions) {
		if (seen.has(a.type)) continue;
		seen.add(a.type);
		out.push(a);
	}
	return out;
}
function legalActionsFor(match, playerId) {
	let actions = [];
	switch (match.gameId) {
		case "snakes":
			actions = snakesLegal(match, playerId);
			break;
		case "debate":
			actions = debateLegal(match, playerId);
			break;
		case "coinpump":
			actions = coinPumpLegal(match, playerId);
			break;
		case "rps":
			actions = rpsLegal(match, playerId);
			break;
		default: actions = [];
	}
	return uniqueByType(actions);
}
var WEIGHTS = {
	logic: .4,
	relevance: .4,
	rhetoric: .2
};
function clampScore(n) {
	const v = Number(n);
	if (!Number.isFinite(v)) return 5;
	return Math.max(0, Math.min(10, Math.round(v * 10) / 10));
}
function weightedTotal(s) {
	return Math.round((s.logic * WEIGHTS.logic + s.relevance * WEIGHTS.relevance + s.rhetoric * WEIGHTS.rhetoric) * 10) / 10;
}
function rubricHint(rubric) {
	if (rubric === "logic") return "Weight evidence and internal consistency extra hard.";
	if (rubric === "data") return "Reward concrete numbers, citations, and falsifiable claims.";
	if (rubric === "persuasion") return "Reward structure, clarity, and the force of the close.";
	return "Score the three criteria as written. No extra bias.";
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
			signal: AbortSignal.timeout(14e3),
			body: JSON.stringify({
				model: "grok-4.5",
				max_tokens: 700,
				messages: [{
					role: "system",
					content: "You are a panel of three debate judges named Logic, Floor, and Rhetoric. Score two agents 0-10 on logic (argument + evidence), relevance (topic + rebuttal), and rhetoric (structure + clarity). Reply ONLY JSON: {\"judges\":[{\"name\":\"Logic\",\"a\":{\"logic\":n,\"relevance\":n,\"rhetoric\":n,\"notes\":\"...\"},\"b\":{...}},{\"name\":\"Floor\",...},{\"name\":\"Rhetoric\",...}],\"verdict\":\"one sentence naming the winner\"}"
				}, {
					role: "user",
					content: `Topic: ${opts.topic}\nRubric: ${rubricHint(opts.rubric)}\nAgent A is ${nameA}. Agent B is ${nameB}.\n\n${transcript}`
				}]
			})
		});
		if (res.ok) {
			const parsed = parsePanel((await res.json()).choices?.[0]?.message?.content ?? "", a, b, nameA, nameB);
			if (parsed) return parsed;
		}
	} catch {}
	return heuristicPanel(opts);
}
function parsePanel(text, a, b, nameA, nameB) {
	const jsonStart = text.indexOf("{");
	const jsonEnd = text.lastIndexOf("}");
	if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
	try {
		const raw = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
		if (!Array.isArray(raw.judges) || raw.judges.length === 0) return null;
		const judges = raw.judges.slice(0, 3).map((j, i) => {
			const sa = normalizeVoice(j.a);
			const sb = normalizeVoice(j.b);
			return {
				name: String(j.name ?? [
					"Logic",
					"Floor",
					"Rhetoric"
				][i] ?? `Judge ${i + 1}`),
				scores: {
					[a]: sa,
					[b]: sb
				}
			};
		});
		const scores = consensus(judges, a, b, nameA, nameB);
		const verdict = typeof raw.verdict === "string" && raw.verdict.trim() ? raw.verdict.trim() : defaultVerdict(scores, a, b, nameA, nameB);
		return {
			scores,
			panel: {
				weights: WEIGHTS,
				judges
			},
			verdict
		};
	} catch {
		return null;
	}
}
function normalizeVoice(raw) {
	const logic = clampScore(raw?.logic);
	const relevance = clampScore(raw?.relevance);
	const rhetoric = clampScore(raw?.rhetoric);
	return {
		logic,
		relevance,
		rhetoric,
		total: weightedTotal({
			logic,
			relevance,
			rhetoric
		}),
		notes: String(raw?.notes ?? "").slice(0, 280)
	};
}
function consensus(judges, a, b, nameA, nameB) {
	const avg = (id, key) => {
		const vals = judges.map((j) => j.scores[id]?.[key] ?? 5);
		return Math.round(vals.reduce((s, n) => s + n, 0) / vals.length * 10) / 10;
	};
	const build = (id, name) => {
		const logic = avg(id, "logic");
		const relevance = avg(id, "relevance");
		const rhetoric = avg(id, "rhetoric");
		const notes = judges.map((j) => j.scores[id]?.notes).filter((n) => n && n.length > 0).slice(0, 1).join(" ");
		return {
			logic,
			relevance,
			rhetoric,
			total: weightedTotal({
				logic,
				relevance,
				rhetoric
			}),
			notes: notes || `${name} — panel average.`
		};
	};
	return {
		[a]: build(a, nameA),
		[b]: build(b, nameB)
	};
}
function defaultVerdict(scores, a, b, nameA, nameB) {
	const sa = scores[a]?.total ?? 0;
	const sb = scores[b]?.total ?? 0;
	if (sa === sb) return `Split decision. ${nameA} and ${nameB} tied at ${sa}.`;
	return sa > sb ? `${nameA} takes the floor, ${sa} to ${sb}.` : `${nameB} takes the floor, ${sb} to ${sa}.`;
}
function heuristicPanel(opts) {
	const [a, b] = opts.speakerOrder;
	const nameA = opts.names[a] ?? "Agent A";
	const nameB = opts.names[b] ?? "Agent B";
	const base = (id, jitter) => {
		const mine = opts.speeches.filter((s) => s.playerId === id);
		const words = mine.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
		const rounds = new Set(mine.map((s) => s.round)).size;
		const topicHits = mine.reduce((n, s) => n + (opts.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 4 && s.text.toLowerCase().includes(w)).length > 0 ? 1 : 0), 0);
		const logic = clampScore(rounds * 2.1 + Math.min(3, words / 90) + jitter);
		const relevance = clampScore(4 + topicHits * 1.4 + rounds * .8 + jitter / 2);
		const rhetoric = clampScore(3 + Math.min(4, words / 70) + (mine.some((s) => s.text.includes("?")) ? .6 : 0) + jitter);
		const bias = opts.rubric === "logic" ? {
			logic: .6,
			relevance: 0,
			rhetoric: 0
		} : opts.rubric === "data" ? {
			logic: .4,
			relevance: .4,
			rhetoric: 0
		} : opts.rubric === "persuasion" ? {
			logic: 0,
			relevance: 0,
			rhetoric: .8
		} : {
			logic: 0,
			relevance: 0,
			rhetoric: 0
		};
		const scored = {
			logic: clampScore(logic + bias.logic),
			relevance: clampScore(relevance + bias.relevance),
			rhetoric: clampScore(rhetoric + bias.rhetoric)
		};
		return {
			...scored,
			total: weightedTotal(scored),
			notes: `${opts.names[id]} filed ${rounds}/3 rounds, ${words} words.`
		};
	};
	const judges = [
		{
			name: "Logic",
			jitterA: .4,
			jitterB: -.2
		},
		{
			name: "Floor",
			jitterA: -.1,
			jitterB: .3
		},
		{
			name: "Rhetoric",
			jitterA: .2,
			jitterB: .1
		}
	].map((v) => ({
		name: v.name,
		scores: {
			[a]: base(a, v.jitterA),
			[b]: base(b, v.jitterB)
		}
	}));
	const scores = consensus(judges, a, b, nameA, nameB);
	return {
		scores,
		panel: {
			weights: WEIGHTS,
			judges
		},
		verdict: defaultVerdict(scores, a, b, nameA, nameB)
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
		duration: "~2 min",
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
		duration: "~45s",
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
var _0003_meta_default = "-- Floor flags (unowned). house_bots defaults on.\ncreate table if not exists meta (\n  key   text primary key,\n  value text not null\n);\n";
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
		const migrations = /* #__PURE__ */ Object.assign({
			"/migrations/0002_floor.sql": _0002_floor_default,
			"/migrations/0003_meta.sql": _0003_meta_default
		});
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
async function ensureMeta(sql) {
	await sql.query(`create table if not exists meta (
      key   text primary key,
      value text not null
    )`);
}
async function loadAll() {
	const sql = await getSql();
	await ensureMeta(sql);
	const walletRows = await sql`
    select id, name, balance, created_at from wallets order by name
  `;
	const matchRows = await sql`
    select id, payload from matches order by created_at desc limit 80
  `;
	const ledgerRows = await sql`
    select id, ts, from_id, to_id, amount, kind, match_id, note from ledger order by ts desc limit 400
  `;
	const raw = (await sql`
    select value from meta where key = 'house_bots'
  `)[0]?.value;
	return {
		wallets: walletRows.map((r) => ({
			id: r.id,
			name: r.name,
			balance: safeBalance(r.balance),
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
		})),
		houseBots: raw == null ? false : raw !== "0" && raw !== "false"
	};
}
async function loadMatch(id) {
	const row = (await (await getSql())`
    select id, payload from matches where id = ${id} limit 1
  `)[0];
	return row ? asMatch(row.payload) : void 0;
}
async function loadMatches() {
	return (await (await getSql())`
    select id, payload from matches order by created_at desc limit 80
  `).map((r) => asMatch(r.payload));
}
async function loadWallet(id) {
	const r = (await (await getSql())`
    select id, name, balance, created_at from wallets where id = ${id} limit 1
  `)[0];
	if (!r) return void 0;
	return {
		id: r.id,
		name: r.name,
		balance: safeBalance(r.balance),
		createdAt: Number(r.created_at)
	};
}
async function loadWallets() {
	return (await (await getSql())`
    select id, name, balance, created_at from wallets order by name
  `).map((r) => ({
		id: r.id,
		name: r.name,
		balance: safeBalance(r.balance),
		createdAt: Number(r.created_at)
	}));
}
async function saveHouseBots(on) {
	const sql = await getSql();
	await ensureMeta(sql);
	await sql.query(`insert into meta (key, value) values ('house_bots', $1)
     on conflict (key) do update set value = excluded.value`, [on ? "1" : "0"]);
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
async function deleteWallet(id) {
	await (await getSql()).query(`delete from wallets where id = $1`, [id]);
}
var store_server_exports = /* @__PURE__ */ __exportAll({
	EngineError: () => EngineError,
	addBots: () => addBots,
	createChallenge: () => createChallenge,
	createMatch: () => createMatch,
	createWallet: () => createWallet,
	getHouseBots: () => getHouseBots,
	getMatch: () => getMatch,
	getWallet: () => getWallet,
	joinMatch: () => joinMatch,
	listCatalog: () => listCatalog,
	listChallenges: () => listChallenges,
	listMatches: () => listMatches,
	listWallets: () => listWallets,
	recentTape: () => recentTape,
	sanitizeWalletName: () => sanitizeWalletName,
	setHouseBots: () => setHouseBots,
	startChallenge: () => startChallenge,
	submitAction: () => submitAction,
	sweepDemo: () => sweepDemo,
	tickFloor: () => tickFloor,
	toChallenge: () => toChallenge,
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
var KEEP_FINISHED = 6;
var MAX_IDLE_GUESTS = 8;
function houseWalletId(name) {
	return name.toLowerCase();
}
function isHouseWallet(id) {
	return BOT_NAMES.some((n) => houseWalletId(n) === id);
}
function seatedLiveIds(world) {
	const seated = /* @__PURE__ */ new Set();
	for (const m of world.matches.values()) {
		if (m.status === "finished") continue;
		for (const p of m.players) seated.add(p.walletId);
	}
	return seated;
}
var EngineError = class extends Error {
	status;
	constructor(message, status = 400) {
		super(message);
		this.name = "EngineError";
		this.status = status;
	}
};
var BOT_FILL = {
	snakes: 4,
	debate: 2,
	coinpump: 4,
	rps: 3
};
function botFillTarget(gameId, maxPlayers, fill) {
	return Math.min(fill ?? BOT_FILL[gameId] ?? 2, maxPlayers);
}
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
		pendingLedger: [],
		houseBots: false
	};
	if (typeof g.__px402d.houseBots !== "boolean") g.__px402d.houseBots = false;
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
	world.houseBots = data.houseBots;
	world.hydrated = true;
	await sweepIdleGuests();
	await pruneFinished();
	if (world.houseBots) await ensureHouseTable();
	await flush();
	startTicker();
}
function seedBots(world) {
	for (const name of BOT_NAMES) {
		const id = houseWalletId(name);
		if (world.wallets.has(id)) continue;
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
async function dropWallet(id) {
	const world = getWorld();
	world.wallets.delete(id);
	world.dirtyWallets.delete(id);
	await deleteWallet(id);
}
async function sweepIdleGuests() {
	const world = getWorld();
	seedBots(world);
	const seated = seatedLiveIds(world);
	const drop = [...world.wallets.values()].filter((w) => !isHouseWallet(w.id) && !seated.has(w.id)).sort((a, b) => a.createdAt - b.createdAt);
	for (const w of drop) await dropWallet(w.id);
	return drop.length;
}
async function capIdleGuests() {
	const world = getWorld();
	const seated = seatedLiveIds(world);
	const idle = [...world.wallets.values()].filter((w) => !isHouseWallet(w.id) && !seated.has(w.id)).sort((a, b) => a.createdAt - b.createdAt);
	const extra = idle.length - MAX_IDLE_GUESTS;
	if (extra <= 0) return;
	for (const w of idle.slice(0, extra)) await dropWallet(w.id);
}
function resetHouseBalances() {
	const world = getWorld();
	for (const name of BOT_NAMES) {
		const w = world.wallets.get(houseWalletId(name));
		if (!w) continue;
		w.balance = STARTING_BALANCE;
		touchWallet(w);
	}
}
async function sweepDemo() {
	const world = await ready();
	const dropped = await sweepIdleGuests();
	resetHouseBalances();
	await pruneFinished();
	await flush();
	return {
		dropped,
		kept: world.wallets.size,
		houseBots: world.houseBots
	};
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
async function pullMatch(id) {
	const world = await ready();
	if (!world.dirtyMatches.has(id)) try {
		const fresh = await loadMatch(id);
		if (fresh) world.matches.set(id, fresh);
		else if (!world.matches.has(id)) return void 0;
	} catch {}
	return world.matches.get(id);
}
async function pullWallet(id) {
	const world = await ready();
	if (!world.dirtyWallets.has(id)) try {
		const fresh = await loadWallet(id);
		if (fresh) world.wallets.set(id, fresh);
	} catch {}
	return world.wallets.get(id);
}
async function pullLiveMatches() {
	const world = await ready();
	let rows = [];
	try {
		rows = await loadMatches();
	} catch {
		return;
	}
	const incoming = new Set(rows.map((m) => m.id));
	for (const m of rows) {
		if (world.dirtyMatches.has(m.id)) continue;
		world.matches.set(m.id, m);
	}
	for (const id of [...world.matches.keys()]) {
		if (world.dirtyMatches.has(id)) continue;
		if (!incoming.has(id)) world.matches.delete(id);
	}
}
var tickChain = Promise.resolve();
var inTick = false;
async function tickFloor() {
	await ready();
	await pullLiveMatches();
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
			if (world.houseBots) await ensureHouseTable();
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
	const world = getWorld();
	if (!world.houseBots) return;
	if ([...world.matches.values()].some((m) => m.gameId === "snakes" && m.status !== "finished")) return;
	if ([...world.matches.values()].some((m) => m.gameId === "snakes" && m.status === "finished" && (m.finishedAt ?? 0) > Date.now() - 8e3)) return;
	await createMatchInternal({
		gameId: "snakes",
		withBots: true,
		fill: 4,
		fillNow: true
	});
}
async function pruneFinished() {
	const world = getWorld();
	const finished = [...world.matches.values()].filter((m) => m.status === "finished").sort((a, b) => (b.finishedAt ?? b.createdAt) - (a.finishedAt ?? a.createdAt));
	if (finished.length <= KEEP_FINISHED) return;
	const drop = finished.slice(KEEP_FINISHED);
	for (const m of drop) {
		world.matches.delete(m.id);
		await deleteMatch(m.id);
	}
}
async function getHouseBots() {
	return (await ready()).houseBots;
}
async function setHouseBots(on) {
	const world = await ready();
	world.houseBots = on;
	await saveHouseBots(on);
	if (on) await ensureHouseTable();
	await flush();
	return world.houseBots;
}
function listCatalog() {
	return CATALOG;
}
async function listWallets() {
	const world = await ready();
	const rows = await loadWallets();
	const incoming = new Set(rows.map((w) => w.id));
	for (const w of rows) {
		if (world.dirtyWallets.has(w.id)) continue;
		world.wallets.set(w.id, w);
	}
	for (const id of [...world.wallets.keys()]) {
		if (world.dirtyWallets.has(id)) continue;
		if (!incoming.has(id)) world.wallets.delete(id);
	}
	return [...world.wallets.values()].sort((a, b) => {
		const ah = isHouseWallet(a.id) ? 0 : 1;
		const bh = isHouseWallet(b.id) ? 0 : 1;
		if (ah !== bh) return ah - bh;
		if (ah === 0) return BOT_NAMES.findIndex((n) => houseWalletId(n) === a.id) - BOT_NAMES.findIndex((n) => houseWalletId(n) === b.id);
		return b.createdAt - a.createdAt;
	});
}
async function getWallet(id) {
	const wallet = await pullWallet(id);
	if (!wallet) return void 0;
	wallet.balance = safeBalance(wallet.balance);
	return wallet;
}
/** Short handle only. Strips URLs, control chars, and origin-looking junk. Empty → "". */
function sanitizeWalletName(raw) {
	if (typeof raw !== "string") return "";
	let s = raw;
	s = s.replace(/https?:\/\/\S+/gi, " ");
	s = s.replace(/\bwww\.\S+/gi, " ");
	s = s.replace(/playablex420\S*/gi, " ");
	s = s.replace(/vercel\.app\S*/gi, " ");
	s = s.replace(/grok-sandbox\S*/gi, " ");
	s = s.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/gi, " ");
	s = s.replace(/<[^>]*>/g, " ");
	s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
	s = s.replace(/[^\p{L}\p{N} ._\-]/gu, " ");
	s = s.replace(/\s+/g, " ").trim();
	if (s.length > 24) s = s.slice(0, 24).trim();
	return s;
}
async function createWallet(name) {
	const world = await ready();
	const trimmed = sanitizeWalletName(name);
	if (!trimmed) throw new EngineError("Name is required — use a short handle (letters, numbers, spaces).");
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
	await capIdleGuests();
	await flush();
	return wallet;
}
async function listMatches() {
	await ready();
	await pullLiveMatches();
	await tickFloor();
	return [...getWorld().matches.values()].sort((a, b) => b.createdAt - a.createdAt);
}
async function getMatch(id) {
	await pullMatch(id);
	await tickFloor();
	return getWorld().matches.get(id);
}
function toPublic(match, agentId) {
	const you = agentId ? match.players.find((p) => p.id === agentId) : void 0;
	const actions = agentId ? legalActionsFor(match, agentId) : void 0;
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
		legalActions: actions,
		next: match.status === "finished" ? "stop" : match.status === "lobby" ? "wait" : agentId && actions && actions.length > 0 ? "act" : "wait",
		settlement: match.status === "finished" ? {
			closed: true,
			rematch: false,
			cancelled: match.cancelled,
			winners: match.winners.map((id) => ({
				id,
				name: playerName(match, id),
				amount: match.payouts.find((p) => p.playerId === id)?.amount ?? 0
			}))
		} : void 0,
		kind: match.kind,
		creatorId: match.creatorId,
		minToStart: match.minToStart,
		lobbyTimeoutMs: match.lobbyTimeoutMs,
		expiresAt: match.expiresAt,
		cancelled: match.cancelled,
		customConfig: match.customConfig
	};
}
async function createMatchInternal(opts) {
	const allowBots = Boolean(opts.withBots) && opts.kind !== "challenge";
	const spec = catalogById(opts.gameId);
	const minPlayers = clampInt(opts.minPlayers ?? spec.minPlayers, spec.minPlayers, spec.maxPlayers);
	const maxPlayers = clampInt(opts.maxPlayers ?? spec.maxPlayers, minPlayers, spec.maxPlayers);
	const minToStart = clampInt(opts.minToStart ?? minPlayers, minPlayers, maxPlayers);
	const lobbyTimeoutMs = opts.kind === "challenge" ? clampInt(opts.lobbyTimeoutMs ?? 3e5, 3e4, 9e5) : EMPTY_LOBBY_MS;
	const entryFee = opts.entryFee ?? spec.entryFee;
	const match = {
		id: shortId(opts.kind === "challenge" ? "ch" : GAME_PREFIX[opts.gameId] ?? "gm"),
		gameId: opts.gameId,
		status: "lobby",
		players: [],
		minPlayers,
		maxPlayers,
		entryFee,
		prizePool: 0,
		withBots: allowBots,
		createdAt: Date.now(),
		state: {},
		logs: [],
		winners: [],
		payouts: [],
		kind: opts.kind ?? "table",
		creatorId: opts.creatorId,
		minToStart,
		lobbyTimeoutMs,
		expiresAt: Date.now() + lobbyTimeoutMs,
		customConfig: opts.customConfig
	};
	getWorld().matches.set(match.id, match);
	log(match, "system", match.kind === "challenge" ? `Challenge ${match.id} opened for ${spec.name}. Entry ${formatUsdc(entryFee)}. Starts at ${minToStart}, caps at ${maxPlayers}. Lobby ${Math.round(lobbyTimeoutMs / 1e3)}s.` : `Table ${match.id} opened for ${spec.name}. Entry ${formatUsdc(entryFee)}. Need ${minPlayers}–${maxPlayers} agents.`);
	if (allowBots && opts.fillNow && getWorld().houseBots) {
		fillBots(match, botFillTarget(opts.gameId, spec.maxPlayers, opts.fill));
		if (match.players.length >= spec.minPlayers) await startMatch(match);
	}
	touchMatch(match);
	return match;
}
function clampInt(n, min, max) {
	if (!Number.isFinite(n)) return min;
	return Math.min(max, Math.max(min, Math.round(n)));
}
async function createMatch(opts) {
	await ready();
	const match = await createMatchInternal(opts);
	await flush();
	return match;
}
function parseEntryFee(raw) {
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) throw new EngineError("entryFee is required (micro-USDC, e.g. 100000 = 0.10 USDC)", 400);
	const micros = n > 0 && n < 100 ? Math.round(n * 1e6) : Math.round(n);
	if (micros < 1e4 || micros > 5e6) throw new EngineError("entryFee must be between 0.01 and 5.00 USDC", 400);
	return micros;
}
function parseCustomConfig(raw, gameId) {
	if (!raw || typeof raw !== "object") return void 0;
	const o = raw;
	const config = {};
	if (typeof o.topic === "string") {
		const topic = stripInjected(o.topic).trim().slice(0, 200);
		if (topic) config.topic = topic;
	}
	if (o.judgingRubric === "logic" || o.judgingRubric === "data" || o.judgingRubric === "persuasion" || o.judgingRubric === "balanced") config.judgingRubric = o.judgingRubric;
	if (typeof o.timePerRound === "number" && Number.isFinite(o.timePerRound)) {
		const ms = o.timePerRound < 1e3 ? Math.round(o.timePerRound * 1e3) : Math.round(o.timePerRound);
		config.timePerRound = Math.min(18e4, Math.max(15e3, ms));
	}
	if (typeof o.turnLimit === "number" && Number.isFinite(o.turnLimit)) config.turnLimit = Math.min(200, Math.max(1, Math.round(o.turnLimit)));
	if (gameId !== "debate") {
		delete config.topic;
		delete config.judgingRubric;
		delete config.timePerRound;
	}
	return Object.keys(config).length > 0 ? config : void 0;
}
function toChallenge(match) {
	const creator = match.players.find((p) => p.id === match.creatorId) ?? match.players[0];
	return {
		id: match.id,
		gameId: match.gameId,
		status: match.status,
		creator: creator?.name,
		creatorId: match.creatorId,
		entryFee: match.entryFee,
		totalPot: match.prizePool,
		currentPlayers: match.players.length,
		maxPlayers: match.maxPlayers,
		minPlayers: match.minPlayers,
		minToStart: match.minToStart ?? match.minPlayers,
		expiresAt: match.expiresAt,
		customConfig: match.customConfig,
		cancelled: match.cancelled
	};
}
async function listChallenges(filter = {}) {
	const matches = await listMatches();
	const keyword = filter.topicKeyword?.toLowerCase().trim();
	return matches.filter((m) => m.kind === "challenge").filter((m) => {
		if (filter.status === "open" || !filter.status) return m.status === "lobby";
		if (filter.status === "live") return m.status === "playing";
		if (filter.status === "closed") return m.status === "finished";
		return true;
	}).filter((m) => !filter.gameId || m.gameId === filter.gameId).filter((m) => filter.minFee == null || m.entryFee >= filter.minFee).filter((m) => filter.maxFee == null || m.entryFee <= filter.maxFee).filter((m) => {
		if (!keyword) return true;
		return String(m.customConfig?.topic ?? m.state?.topic ?? "").toLowerCase().includes(keyword) || m.id.toLowerCase().includes(keyword);
	}).map(toChallenge);
}
async function createChallenge(opts) {
	await ready();
	const spec = catalogById(opts.gameId);
	const entryFee = parseEntryFee(opts.entryFee ?? spec.entryFee);
	const customConfig = parseCustomConfig(opts.customConfig, opts.gameId);
	const match = await createMatchInternal({
		gameId: opts.gameId,
		kind: "challenge",
		withBots: false,
		entryFee,
		minPlayers: opts.minPlayers,
		maxPlayers: opts.maxPlayers ?? spec.maxPlayers,
		minToStart: opts.minToStart,
		lobbyTimeoutMs: opts.lobbyTimeoutMs,
		customConfig
	});
	if (!(opts.walletId || opts.paymentHeader)) {
		await flush();
		return {
			ok: false,
			paymentRequired: {
				x402Version: 1,
				accepts: [paymentAccept({
					amount: entryFee,
					resource: `/api/v1/challenges/${match.id}/join`,
					description: `Challenge entry ${match.id}`,
					kind: "entry"
				})]
			},
			match: toPublic(match),
			challenge: toChallenge(match)
		};
	}
	const joined = await joinMatch({
		matchId: match.id,
		walletId: opts.walletId,
		paymentHeader: opts.paymentHeader,
		controller: "human"
	});
	if (joined.ok && joined.match) {
		const seated = mustMatch(match.id);
		seated.creatorId = joined.match.you?.id ?? opts.walletId;
		touchMatch(seated);
		await flush();
		return {
			ok: true,
			match: toPublic(seated, seated.creatorId),
			challenge: toChallenge(seated)
		};
	}
	await flush();
	return {
		...joined,
		match: joined.match ?? toPublic(match),
		challenge: toChallenge(mustMatch(match.id))
	};
}
async function startChallenge(opts) {
	await ready();
	await pullMatch(opts.matchId);
	const match = getWorld().matches.get(opts.matchId);
	if (!match) return {
		ok: false,
		error: "Challenge not found"
	};
	if (match.kind !== "challenge") return {
		ok: false,
		error: "Not a challenge table"
	};
	if (match.status !== "lobby") return {
		ok: false,
		error: "Challenge already underway"
	};
	const minToStart = match.minToStart ?? match.minPlayers;
	if (match.players.length < minToStart) return {
		ok: false,
		error: `Need ${minToStart} agents to start (have ${match.players.length})`
	};
	if (opts.walletId && match.creatorId && opts.walletId !== match.creatorId) return {
		ok: false,
		error: "Only the creator can force-start"
	};
	await startMatch(match);
	await flush();
	return {
		ok: true,
		match: toPublic(match, opts.walletId),
		challenge: toChallenge(match)
	};
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
	if (!match.withBots) return;
	while (match.players.length < target) {
		const w = unusedBot(match);
		if (!w) break;
		seatPlayer(match, w, "bot");
	}
}
async function addBots(matchId, count = 2) {
	await ready();
	if (!getWorld().houseBots) throw new EngineError("House bots are off");
	const match = mustMatch(matchId);
	if (match.status !== "lobby") throw new EngineError("Table already underway");
	match.withBots = true;
	fillBots(match, Math.min(match.players.length + count, match.maxPlayers));
	if (match.players.length >= match.minPlayers) await startMatch(match);
	await flush();
	return match;
}
function mustMatch(id) {
	const m = getWorld().matches.get(id);
	if (!m) throw new EngineError("Table not found", 404);
	return m;
}
function mustWallet(id) {
	const w = getWorld().wallets.get(id);
	if (!w) throw new EngineError("Wallet not found", 404);
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
	await pullMatch(opts.matchId);
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
		await pullWallet(parsed.walletId);
		const wallet = mustWallet(parsed.walletId);
		seatPlayer(match, wallet, opts.controller ?? "human");
		if (match.withBots) fillBots(match, botFillTarget(match.gameId, match.maxPlayers));
		if (match.players.length >= match.maxPlayers || match.withBots && match.players.length >= match.minPlayers) await startMatch(match);
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
	const need = match.kind === "challenge" ? match.minToStart ?? match.minPlayers : match.minPlayers;
	if (match.players.length < need) return;
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
			match.turnDeadline = Date.now() + SNAKES_TURN_MS;
			log(match, "system", `${match.players[0].name} opens the dice.`);
			break;
		case "debate": {
			const state = createDebateState(match.players, Date.now(), match.customConfig);
			match.state = state;
			const seat = currentDebateSeat(state);
			match.currentPlayerId = seat?.playerId;
			match.turnDeadline = state.windowEndsAt;
			log(match, "system", `Motion: ${state.topic}`);
			if (state.rubric && state.rubric !== "balanced") log(match, "judge", `Panel rubric: ${state.rubric}. Logic 40 · relevance 40 · rhetoric 20.`);
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
	match.turnDeadline = Date.now() + SNAKES_TURN_MS;
}
function finishMatch(match, winnerIds) {
	if (match.status === "finished") return;
	match.status = "finished";
	match.finishedAt = Date.now();
	match.currentPlayerId = void 0;
	match.turnDeadline = void 0;
	match.winners = winnerIds;
	if (winnerIds.length === 0 || match.prizePool <= 0) {
		if (match.prizePool > 0) log(match, "win", "No winner. Pot stays in the treasury.");
		match.prizePool = 0;
		log(match, "system", "Table closed. This table does not rematch — sit a new one from the floor if you want another game.");
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
	log(match, "system", `Table closed. Pot paid to ${winnerIds.length > 0 ? winnerIds.map((id) => playerName(match, id)).join(", ") : "nobody"}. This table does not rematch — sit a new one from the floor if you want another game.`);
}
function refundEntry(match, player) {
	const wallet = getWorld().wallets.get(player.walletId);
	if (!wallet || match.entryFee <= 0) return;
	credit(wallet, match.entryFee);
	touchWallet(wallet);
	match.prizePool = Math.max(0, match.prizePool - match.entryFee);
	recordLedger({
		from: "treasury",
		to: wallet.id,
		amount: match.entryFee,
		kind: "refund",
		matchId: match.id,
		note: `Lobby closed ${match.id}`
	});
	log(match, "pay", `${wallet.name} refunded ${formatUsdc(match.entryFee)} (lobby closed).`, player.id);
}
async function abandonLobby(match) {
	if (match.status !== "lobby") return;
	const world = getWorld();
	if (match.players.length === 0) {
		world.matches.delete(match.id);
		world.dirtyMatches.delete(match.id);
		await deleteMatch(match.id);
		return;
	}
	for (const p of match.players) refundEntry(match, p);
	match.prizePool = 0;
	log(match, "system", match.kind === "challenge" ? "Challenge expired. Entries refunded in full." : "Lobby closed after 2 minutes without enough agents. Entries refunded.");
	match.cancelled = true;
	finishMatch(match, []);
}
async function forceSettle(match) {
	if (match.status !== "playing") return;
	log(match, "system", "Clock ran out. Settling the table.");
	if (match.gameId === "snakes") {
		const state = match.state;
		let best = -1;
		const winners = [];
		for (const p of match.players) {
			const pos = state.pieces[p.id]?.position ?? 0;
			if (pos > best) {
				best = pos;
				winners.length = 0;
				winners.push(p.id);
			} else if (pos === best) winners.push(p.id);
		}
		finishMatch(match, winners);
		return;
	}
	if (match.gameId === "debate") {
		const state = match.state;
		if (state.scores) {
			finishMatch(match, debateWinners(state));
			return;
		}
		state.roundIndex = ROUND_SEQUENCE.length;
		state.judging = true;
		await runJudge(match);
		return;
	}
	if (match.gameId === "coinpump") {
		const state = match.state;
		if (state.resolved) {
			finishMatch(match, []);
			return;
		}
		await refreshQuotes(state);
		const { ranking, winnerCoinIds } = resolveCoinPump(state);
		const top = ranking[0];
		log(match, "system", `Window closed. Top tape: ${state.coins.find((c) => c.id === top?.id)?.ticker ?? "?"} ${top && top.changePct >= 0 ? "+" : ""}${top?.changePct.toFixed(3)}%.`);
		const winners = match.players.filter((p) => winnerCoinIds.includes(state.picks[p.id] ?? "")).map((p) => p.id);
		if (winners.length === 0) {
			log(match, "win", "Nobody picked the top tape. Pot stays in the treasury.");
			finishMatch(match, []);
		} else {
			log(match, "win", `${winners.map((id) => playerName(match, id)).join(", ")} called it.`);
			finishMatch(match, winners);
		}
		return;
	}
	if (match.gameId === "rps") {
		const state = match.state;
		const round = state.rounds[state.roundIndex];
		if (round && !round.resolved) resolveRpsRound(match);
		if (match.status === "playing") {
			const max = Math.max(0, ...match.players.map((p) => state.scores[p.id] ?? 0));
			finishMatch(match, match.players.filter((p) => (state.scores[p.id] ?? 0) === max).map((p) => p.id));
		}
	}
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
	await pullMatch(opts.matchId);
	const match = mustMatch(opts.matchId);
	if (match.status === "finished") return {
		ok: false,
		error: "Table is closed. No rematch — open a new table from the floor."
	};
	if (match.status !== "playing") return {
		ok: false,
		error: "Match is not live"
	};
	const parsed = parsePaymentHeader(opts.paymentHeader ?? null, opts.walletId);
	const walletId = opts.walletId && opts.walletId.trim() || parsed?.walletId;
	if (!walletId) return {
		ok: false,
		error: "Send walletId in JSON. X-PAYMENT is only for join and paid extras."
	};
	await pullWallet(walletId);
	const player = match.players.find((p) => p.id === walletId);
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
	const parsed = parsePaymentHeader(header);
	if (!parsed || parsed.walletId !== player.walletId) throw new PaymentNeeded([paymentAccept({
		amount,
		resource: `/api/v1/matches/${match.id}/action`,
		description: note,
		kind
	})]);
	takePowerupFee(match, wallet, amount, note);
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
	let powerupRaw = action.powerup ?? action.option;
	if (type === "reroll" || type === "ward") powerupRaw = type;
	else if (type !== "roll") throw new Error("Send { type: \"roll\" } with optional powerup \"reroll\" | \"ward\"");
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
	const text = stripInjected(String(action.text ?? "")).trim();
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
	state.windowEndsAt = Date.now() + debateWindowMs(state, kind);
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
		speakerOrder: state.speakerOrder,
		rubric: state.rubric
	});
	state.scores = result.scores;
	state.verdict = result.verdict;
	state.panel = result.panel;
	state.judging = false;
	log(match, "judge", result.verdict);
	for (const judge of result.panel.judges) {
		const bits = match.players.map((p) => {
			const s = judge.scores[p.id];
			if (!s) return null;
			return `${p.name} L${s.logic} R${s.relevance} C${s.rhetoric} = ${s.total}`;
		}).filter(Boolean).join(" · ");
		log(match, "judge", `${judge.name}: ${bits}`);
	}
	for (const p of match.players) {
		const s = result.scores[p.id];
		if (s) log(match, "judge", `${p.name} consensus ${s.total}/10 (logic ${s.logic} · relevance ${s.relevance} · rhetoric ${s.rhetoric}) — ${s.notes}`, p.id);
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
	if (round.throws[player.id]) throw new Error("Already thrown this round");
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
function stripInjected(raw) {
	return raw.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001F\u007F-\u009F]/g, "").replace(/\s+/g, " ");
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
		if (match.kind === "challenge") {
			if (match.players.length >= match.maxPlayers) {
				await startMatch(match);
				return;
			}
			if (now >= (match.expiresAt ?? match.createdAt + (match.lobbyTimeoutMs ?? 3e5))) {
				if (match.players.length >= (match.minToStart ?? match.minPlayers)) await startMatch(match);
				else await abandonLobby(match);
			}
			return;
		}
		if (match.players.length < match.minPlayers) {
			if (now - lobbyIdleSince(match) > (match.lobbyTimeoutMs ?? 12e4)) {
				await abandonLobby(match);
				return;
			}
		}
		const hasGuest = match.players.some((p) => p.controller !== "bot");
		if (match.withBots && hasGuest && match.players.length < match.maxPlayers) fillBots(match, botFillTarget(match.gameId, match.maxPlayers));
		if (match.players.length >= match.minPlayers) {
			const lastJoin = Math.max(...match.players.map((p) => p.joinedAt), match.createdAt);
			const waitMs = match.withBots ? 800 : 8e3;
			if (now - lastJoin > waitMs || match.players.length >= match.maxPlayers) await startMatch(match);
		}
	}
	if (match.status !== "playing") return;
	if (match.startedAt && now - match.startedAt > (MAX_PLAY_MS[match.gameId] ?? 48e4)) {
		await forceSettle(match);
		return;
	}
	if (match.gameId === "snakes") {
		const current = match.players.find((p) => p.id === match.currentPlayerId);
		if (!current) {
			await forceSettle(match);
			return;
		}
		const due = (match.turnDeadline ?? 0) <= now;
		const botReady = current.controller === "bot" && (match.turnDeadline ?? 0) - now < 14500;
		if (due && current.controller !== "bot") {
			log(match, "system", `${current.name} missed the window. The table rolls.`, current.id);
			try {
				applyAction(match, current, { type: "roll" }, current.walletId);
			} catch {
				advanceSnakesTurn(match);
			}
			return;
		}
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
		const botReady = player.controller === "bot" && now > (match.startedAt ?? now) && state.windowEndsAt - now < debateWindowMs(state, seat.kind) - 3500;
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
		if (!round || round.resolved) {
			if (round?.resolved && match.status === "playing") await forceSettle(match);
			return;
		}
		for (const p of match.players) {
			if (p.controller !== "bot") continue;
			if (round.throws[p.id]) continue;
			if (state.windowEndsAt - now < 7600) applyRps(match, p, "throw", {
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
export { squareToCell as A, formatClock as C, CATALOG as D, BOT_NAMES as E, __exportAll as M, LADDERS as O, cn as S, initials as T, submitAction as _, createWallet as a, toChallenge as b, getWallet as c, listChallenges as d, listMatches as f, store_server_exports as g, startChallenge as h, createMatch as i, currentDebateSeat as j, SNAKES as k, joinMatch as l, setHouseBots as m, addBots as n, getHouseBots as o, listWallets as p, createChallenge as r, getMatch as s, EngineError as t, listCatalog as u, sweepDemo as v, formatUsdc as w, toPublic as x, tickFloor as y };

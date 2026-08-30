import { o as __toESM } from "../_runtime.mjs";
import { c as lobbyIdleSince } from "./types-B31LXrbA.mjs";
import { A as squareToCell, C as formatClock, O as LADDERS, S as cn, T as initials, j as currentDebateSeat, k as SNAKES, w as formatUsdc } from "./store.server-CN2ZBtcQ.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { _ as Link, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SiteHeader } from "./site-header-a_ktBw8K.mjs";
import { _ as startChallengeFn, d as getHouseBotsFn, f as getMatchFn, h as listWalletsFn, n as Route$2, p as joinMatchFn, s as addBotsFn, u as createWalletFn, v as submitActionFn } from "./router-Dm11Mey3.mjs";
import { t as Badge } from "./badge-D6JBNqwI.mjs";
import { t as Button } from "./button-B1QV0ihb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/watch._id-Bp2WVI3U.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ActionDock({ match, agentId, busy, error, onAction }) {
	const actions = match.legalActions ?? [];
	const [text, setText] = (0, import_react.useState)("");
	const seated = match.players.some((p) => p.id === agentId);
	if (match.status === "finished") {
		const winners = match.settlement?.winners ?? [];
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-[16px] border border-border bg-surface p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-[0.14em] text-muted",
					children: "Table closed"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-display text-xl font-medium",
					children: "Pot paid. No rematch."
				}),
				winners.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: match.cancelled ? "Challenge expired. Every entry was refunded." : "No winner. Pot stays in the treasury."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-col gap-1 text-sm",
					children: winners.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: w.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono tabular-nums text-pool",
							children: formatUsdc(w.amount)
						})]
					}, w.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-muted",
					children: "Open a new table from the floor if you want another game."
				})
			]
		});
	}
	if (!seated) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-[16px] border border-border bg-surface p-4 text-sm text-muted",
		children: "Sit down to take a turn. House agents will keep the table moving if you only watch."
	});
	if (match.status === "lobby") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-[16px] border border-border bg-surface p-4 text-sm text-muted",
		children: "Waiting for the rest of the table."
	});
	if (actions.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-[16px] border border-border bg-surface p-4 text-sm text-muted",
		children: "Not your window. Watch the log."
	});
	const submit = actions.find((a) => a.type === "submit");
	const pick = actions.find((a) => a.type === "pick");
	const throwAct = actions.find((a) => a.type === "throw");
	const roll = actions.find((a) => a.type === "roll");
	const reroll = actions.find((a) => a.type === "reroll");
	const ward = actions.find((a) => a.type === "ward");
	const scout = actions.find((a) => a.type === "scout");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-[0.14em] text-muted",
				children: "Your move"
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-danger",
				children: error
			}),
			(roll || reroll || ward) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					roll && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: busy,
						onClick: () => onAction({ type: "roll" }),
						children: roll.label
					}),
					reroll && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						disabled: busy,
						onClick: () => onAction({
							type: "roll",
							powerup: "reroll"
						}),
						children: [reroll.label, reroll.fee ? ` · ${formatUsdc(reroll.fee)}` : ""]
					}),
					ward && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						disabled: busy,
						onClick: () => onAction({
							type: "roll",
							powerup: "ward"
						}),
						children: [ward.label, ward.fee ? ` · ${formatUsdc(ward.fee)}` : ""]
					})
				]
			}),
			submit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-2",
				onSubmit: (e) => {
					e.preventDefault();
					onAction({
						type: "submit",
						text
					});
					setText("");
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: text,
					onChange: (e) => setText(e.target.value),
					rows: 5,
					placeholder: "File your argument.",
					className: "min-h-28 w-full resize-y rounded-[12px] border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-border-strong focus:outline-none"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: busy || text.trim().length < 12,
					children: submit.label
				})]
			}),
			pick?.options && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2 sm:grid-cols-3",
				children: pick.options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					disabled: busy,
					onClick: () => onAction({
						type: "pick",
						coinId: opt.id
					}),
					children: opt.label.split(" · ")[0]
				}, opt.id))
			}),
			throwAct?.options && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 gap-2",
				children: throwAct.options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					disabled: busy,
					onClick: () => onAction({
						type: "throw",
						gesture: opt.id
					}),
					children: opt.label
				}, opt.id))
			}),
			scout && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "ghost",
				disabled: busy,
				onClick: () => onAction({ type: "scout" }),
				children: [scout.label, scout.fee ? ` · ${formatUsdc(scout.fee)}` : ""]
			})
		]
	});
}
var TINT = {
	p1: "bg-p1 text-accent-fg",
	p2: "bg-p2 text-accent-fg",
	p3: "bg-p3 text-accent-fg",
	p4: "bg-p4 text-accent-fg",
	p5: "bg-p5 text-fg",
	p6: "bg-p6 text-fg"
};
function Token({ tint, name, size = "md" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center justify-center rounded-full font-medium", TINT[tint], size === "sm" ? "size-5 text-[9px]" : "size-7 text-[11px]"),
		title: name,
		children: initials(name)
	});
}
function PlayerChip({ player, active, extra }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex items-center gap-2.5 rounded-[12px] border px-3 py-2", active ? "border-accent/40 bg-raised" : "border-border bg-surface"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Token, {
			tint: player.tint,
			name: player.name
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "truncate text-sm font-medium",
				children: player.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "truncate text-[11px] text-muted",
				children: [player.controller === "bot" ? "house agent" : "operator", extra ? ` · ${extra}` : ""]
			})]
		})]
	});
}
function CoinBoard({ state, players }) {
	const picksByCoin = {};
	for (const p of players) {
		const coin = state.picks[p.id];
		if (!coin) continue;
		(picksByCoin[coin] ??= []).push(p);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-xs text-muted",
			children: [
				"Source ",
				state.source === "coingecko" ? "CoinGecko" : "simulated",
				" · 10-minute window · picks lock at 90s."
			]
		}), state.coins.map((c) => {
			const pct = c.changePct ?? (c.startUsd === 0 ? 0 : (c.liveUsd - c.startUsd) / c.startUsd * 100);
			const up = pct >= 0;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-4 rounded-[16px] border border-border bg-surface px-4 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-16 shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium tracking-wide",
							children: c.ticker
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-muted",
							children: c.name
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-sm tabular-nums",
							children: ["$", c.liveUsd.toFixed(c.liveUsd < 2 ? 4 : 2)]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] text-faint",
							children: ["open $", c.startUsd.toFixed(c.startUsd < 2 ? 4 : 2)]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: cn("w-20 text-right font-mono text-sm tabular-nums", up ? "text-live" : "text-danger"),
						children: [
							up ? "+" : "",
							pct.toFixed(3),
							"%"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex min-w-16 justify-end -space-x-1",
						children: (picksByCoin[c.id] ?? []).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Token, {
							tint: p.tint,
							name: p.name,
							size: "sm"
						}, p.id))
					})
				]
			}, c.id);
		})]
	});
}
function DebateStage({ state, players }) {
	const seat = currentDebateSeat(state);
	const byId = Object.fromEntries(players.map((p) => [p.id, p]));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-[20px] border border-border bg-surface px-5 py-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-[0.14em] text-muted",
					children: "Motion"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-display text-xl font-medium leading-snug text-pretty sm:text-2xl",
					children: state.topic
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: players.map((p, i) => {
					const speeches = state.speeches.filter((s) => s.playerId === p.id);
					const score = state.scores?.[p.id];
					const talking = seat?.playerId === p.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: cn("flex flex-col gap-3 rounded-[16px] border bg-raised p-4", talking ? "border-accent/40" : "border-border"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Token, {
									tint: p.tint,
									name: p.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: p.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-muted",
									children: i === 0 ? "Table left" : "Table right"
								})] })]
							}), score && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-lg tabular-nums",
								children: score.total
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-2",
							children: [speeches.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: talking ? "On the floor." : "Waiting."
							}), speeches.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm leading-relaxed text-pretty",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mr-2 text-[11px] uppercase tracking-wide text-faint",
									children: s.round
								}), s.text]
							}, s.round))]
						})]
					}, p.id);
				})
			}),
			state.verdict && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-[16px] border border-live/30 bg-live/10 px-4 py-3 text-sm text-live",
				children: state.verdict
			}),
			state.panel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-[16px] border border-border bg-surface px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-[0.14em] text-faint",
					children: "Panel · logic 40 · relevance 40 · rhetoric 20"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 flex flex-col gap-1 font-mono text-xs text-muted",
					children: state.panel.judges.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						j.name,
						":",
						" ",
						players.map((p) => {
							const s = j.scores[p.id];
							return s ? `${p.name} ${s.total}` : null;
						}).filter(Boolean).join(" · ")
					] }, j.name))
				})]
			}),
			state.judging && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-warn",
				children: "Judge is scoring the floor."
			}),
			seat && byId[seat.playerId] && !state.judging && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					byId[seat.playerId].name,
					" · ",
					seat.kind
				]
			})
		]
	});
}
function Glyph({ g }) {
	if (g === "rock") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 24 24",
		className: "size-8",
		"aria-hidden": true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "7",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6"
		})
	});
	if (g === "paper") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 24 24",
		className: "size-8",
		"aria-hidden": true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: "6",
			y: "4",
			width: "12",
			height: "16",
			rx: "1.5",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6"
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		className: "size-8",
		"aria-hidden": true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M8 6 L12 12 L8 18",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M16 6 L12 12 L16 18",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round"
		})]
	});
}
function RpsArena({ state, players }) {
	const round = state.rounds[state.roundIndex];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm text-muted",
			children: [
				"Round ",
				Math.min(state.roundIndex + 1, 5),
				" of 5"
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-2 gap-3",
			children: players.map((p) => {
				const thrown = Boolean(round?.throws[p.id]);
				const revealed = Boolean(round?.resolved && round.throws[p.id]);
				const g = round?.throws[p.id];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("flex flex-col items-center gap-2 rounded-[16px] border border-border bg-surface px-3 py-5"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Token, {
							tint: p.tint,
							name: p.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: p.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-fg",
							children: revealed && g ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glyph, { g }) : thrown ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs uppercase tracking-wide text-muted",
								children: "locked"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs uppercase tracking-wide text-faint",
								children: "waiting"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-lg tabular-nums",
							children: state.scores[p.id] ?? 0
						})
					]
				}, p.id);
			})
		})]
	});
}
function cellCenter(n) {
	const { row, col } = squareToCell(n);
	return {
		x: (col + .5) * 10,
		y: (row + .5) * 10
	};
}
function squareAt(row, col) {
	const rowFromBottom = 9 - row;
	const colReal = rowFromBottom % 2 === 1 ? 9 - col : col;
	return rowFromBottom * 10 + colReal + 1;
}
function SnakesBoard({ state, players }) {
	const bySquare = {};
	for (const p of players) {
		const pos = state.pieces[p.id]?.position ?? 0;
		if (pos <= 0) continue;
		(bySquare[pos] ??= []).push(p);
	}
	const cells = [];
	for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) cells.push(squareAt(row, col));
	const waiting = players.filter((p) => (state.pieces[p.id]?.position ?? 0) <= 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative aspect-square w-full overflow-hidden rounded-[20px] border border-border bg-raised p-2 sm:p-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid h-full w-full grid-cols-10 grid-rows-10 gap-px",
				children: cells.map((sq) => {
					const isSnake = Boolean(SNAKES[sq]);
					const isLadder = Boolean(LADDERS[sq]);
					const here = bySquare[sq] ?? [];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: cn("relative flex items-start justify-start rounded-[3px] p-0.5", isSnake && "bg-danger/15", isLadder && "bg-live/15", !isSnake && !isLadder && (sq % 2 === 0 ? "bg-surface" : "bg-bg")),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[8px] leading-none text-faint sm:text-[10px]",
							children: sq
						}), here.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute inset-0 flex items-center justify-center gap-0.5",
							children: here.slice(0, 3).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Token, {
								tint: p.tint,
								name: p.name,
								size: "sm"
							}, p.id))
						})]
					}, sq);
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 100 100",
				className: "pointer-events-none absolute inset-2 sm:inset-3",
				preserveAspectRatio: "none",
				children: [Object.entries(LADDERS).map(([from, to]) => {
					const a = cellCenter(Number(from));
					const b = cellCenter(Number(to));
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: a.x,
						y1: a.y,
						x2: b.x,
						y2: b.y,
						stroke: "var(--color-live)",
						strokeWidth: "0.7",
						strokeLinecap: "round",
						opacity: "0.55"
					}, `l${from}`);
				}), Object.entries(SNAKES).map(([from, to]) => {
					const a = cellCenter(Number(from));
					const b = cellCenter(Number(to));
					const mx = (a.x + b.x) / 2 + (a.y - b.y) * .18;
					const my = (a.y + b.y) / 2 + (b.x - a.x) * .18;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`,
						fill: "none",
						stroke: "var(--color-danger)",
						strokeWidth: "0.8",
						strokeLinecap: "round",
						opacity: "0.55"
					}, `s${from}`);
				})]
			})]
		}), waiting.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 text-xs text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Off the board" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex gap-1",
				children: waiting.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Token, {
					tint: p.tint,
					name: p.name,
					size: "sm"
				}, p.id))
			})]
		})]
	});
}
function LiveLog({ logs, className }) {
	const endRef = (0, import_react.useRef)(null);
	const wrapRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const wrap = wrapRef.current;
		if (!wrap) return;
		if (wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 80) endRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end"
		});
	}, [logs.length]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: wrapRef,
		className: cn("flex flex-col overflow-y-auto rounded-[16px] border border-border bg-surface p-4 font-mono text-xs leading-relaxed sm:p-5 sm:text-sm", className),
		children: [logs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "Waiting for the first line."
		}) : logs.map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: cn("text-pretty", i === logs.length - 1 && "log-line-enter", line.kind === "pay" && "text-pool", line.kind === "win" && "text-live", line.kind === "judge" && "text-warn", line.kind === "system" && "text-muted", (line.kind === "move" || line.kind === "join") && "text-fg"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mr-3 text-faint tabular-nums",
				children: formatClock(line.ts)
			}), line.text]
		}, line.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: endRef })]
	});
}
function useCountdown(deadline) {
	const [now, setNow] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setNow(Date.now());
		const t = setInterval(() => setNow(Date.now()), 250);
		return () => clearInterval(t);
	}, []);
	if (!deadline || now === null) return null;
	const ms = Math.max(0, deadline - now);
	return Math.ceil(ms / 1e3);
}
function WatchPage() {
	const { id } = Route$2.useParams();
	const loaded = Route$2.useLoaderData();
	const [match, setMatch] = (0, import_react.useState)(loaded.match);
	const [wallets, setWallets] = (0, import_react.useState)(loaded.wallets);
	const [agentId, setAgentId] = (0, import_react.useState)(null);
	const [name, setName] = (0, import_react.useState)("Operator");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)();
	const [houseBots, setHouseBots] = (0, import_react.useState)(loaded.houseBots);
	(0, import_react.useEffect)(() => {
		try {
			const saved = sessionStorage.getItem(`px402:${id}`);
			if (saved) setAgentId(saved);
		} catch {}
	}, [id]);
	(0, import_react.useEffect)(() => {
		let alive = true;
		const poll = async () => {
			const res = await getMatchFn({ data: {
				id,
				agentId: agentId ?? void 0
			} });
			if (alive && res.match) setMatch(res.match);
			const w = await listWalletsFn();
			if (alive) setWallets(w);
			const bots = await getHouseBotsFn();
			if (alive) setHouseBots(bots.houseBots);
		};
		poll();
		const t = setInterval(() => void poll(), 900);
		return () => {
			alive = false;
			clearInterval(t);
		};
	}, [id, agentId]);
	const spec = loaded.games.find((g) => g.id === match?.gameId);
	const remain = useCountdown(match?.turnDeadline);
	const lobbyRemain = useCountdown(match && match.status === "lobby" ? match.expiresAt ?? lobbyIdleSince(match) + (match.lobbyTimeoutMs ?? 12e4) : void 0);
	const you = match?.players.find((p) => p.id === agentId);
	async function join() {
		if (!match) return;
		setBusy(true);
		setError(void 0);
		try {
			let wallet = wallets.find((w) => w.name === name.trim());
			if (!wallet) wallet = await createWalletFn({ data: { name: name.trim() || "Operator" } });
			const res = await joinMatchFn({ data: {
				matchId: match.id,
				walletId: wallet.id,
				controller: "human"
			} });
			if (!res.ok) {
				setError(res.error ?? "Could not sit");
				return;
			}
			setAgentId(wallet.id);
			try {
				sessionStorage.setItem(`px402:${id}`, wallet.id);
			} catch {}
			if (res.match) setMatch(res.match);
		} finally {
			setBusy(false);
		}
	}
	async function bots() {
		if (!match) return;
		setBusy(true);
		try {
			const res = await addBotsFn({ data: {
				matchId: match.id,
				count: 2
			} });
			if (res.match) setMatch(res.match);
		} finally {
			setBusy(false);
		}
	}
	async function forceStart() {
		if (!match || !agentId) return;
		setBusy(true);
		setError(void 0);
		try {
			const res = await startChallengeFn({ data: {
				matchId: match.id,
				walletId: agentId
			} });
			if (!res.ok) setError(res.error ?? "Could not start");
			if (res.match) setMatch(res.match);
		} finally {
			setBusy(false);
		}
	}
	async function act(action) {
		if (!match || !agentId) return;
		setBusy(true);
		setError(void 0);
		try {
			const res = await submitActionFn({ data: {
				matchId: match.id,
				walletId: agentId,
				action
			} });
			if (!res.ok) setError(res.error ?? "Action rejected");
			if (res.match) setMatch(res.match);
		} finally {
			setBusy(false);
		}
	}
	const extra = (0, import_react.useMemo)(() => {
		if (!match || match.gameId !== "snakes") return {};
		const state = match.state;
		const map = {};
		for (const p of match.players) map[p.id] = `sq ${state.pieces[p.id]?.position ?? 0}`;
		return map;
	}, [match]);
	if (!match) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { active: "floor" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto max-w-3xl px-4 py-20 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl",
					children: "Table not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-muted",
					children: "It may have been cleared from memory."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						children: "Back to the floor"
					})
				})
			]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { active: "floor" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs text-faint",
							children: match.id
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-2xl font-medium sm:text-3xl",
							children: spec?.name ?? match.gameId
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							tone: match.status === "playing" ? "live" : match.status === "lobby" ? "warn" : "muted",
							children: [match.status === "playing" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "live-dot size-1.5 rounded-full bg-live" }), match.status]
						}),
						match.kind === "challenge" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "challenge" }),
						match.cancelled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: "muted",
							children: "refunded"
						}),
						remain !== null && match.status === "playing" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ml-auto font-mono text-sm tabular-nums text-muted",
							children: [remain, "s"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Pot ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono tabular-nums text-pool",
							children: formatUsdc(match.prizePool)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Entry ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono tabular-nums",
							children: formatUsdc(match.entryFee)
						})] }),
						you && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["You are ", you.name] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [
							match.gameId === "snakes" && match.status !== "lobby" && match.state.pieces && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SnakesBoard, {
								state: match.state,
								players: match.players
							}),
							match.gameId === "debate" && match.status !== "lobby" && match.state.topic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DebateStage, {
								state: match.state,
								players: match.players
							}),
							match.gameId === "coinpump" && match.status !== "lobby" && match.state.coins && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoinBoard, {
								state: match.state,
								players: match.players
							}),
							match.gameId === "rps" && match.status !== "lobby" && match.state.rounds && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RpsArena, {
								state: match.state,
								players: match.players
							}),
							match.status === "lobby" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-[20px] border border-border bg-surface px-5 py-10",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-display text-2xl font-medium",
										children: "Waiting on seats"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-2 max-w-md text-sm text-muted",
										children: [
											spec?.blurb,
											" Need ",
											match.minToStart ?? match.minPlayers,
											"–",
											match.maxPlayers,
											" agents.",
											match.kind === "challenge" ? " Challenge lobbies refund everyone if they expire under min-to-start." : " Empty lobbies close after 2 minutes and refund anyone seated."
										]
									}),
									lobbyRemain !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-3 font-mono text-sm tabular-nums text-warn",
										children: [
											"Closes in ",
											lobbyRemain,
											"s"
										]
									})
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "flex min-w-0 flex-col gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-2",
								children: [match.players.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: "No one seated yet."
								}), match.players.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerChip, {
									player: p,
									active: match.currentPlayerId === p.id,
									extra: extra[p.id]
								}, p.id))]
							}),
							match.status === "lobby" && !you && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs uppercase tracking-[0.14em] text-muted",
										children: "Sit as"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: name,
										maxLength: 24,
										onChange: (e) => setName(e.target.value),
										className: "h-11 rounded-[10px] border border-border bg-bg px-3 text-sm text-fg focus:border-border-strong focus:outline-none"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										disabled: busy,
										onClick: () => void join(),
										children: [
											"Pay ",
											formatUsdc(match.entryFee),
											" and sit"
										]
									}),
									error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-danger",
										children: error
									})
								]
							}),
							match.status === "lobby" && houseBots && match.kind !== "challenge" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "secondary",
								disabled: busy,
								onClick: () => void bots(),
								children: "Seat house agents"
							}),
							match.status === "lobby" && match.kind === "challenge" && you && you.id === match.creatorId && match.players.length >= (match.minToStart ?? match.minPlayers) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								disabled: busy,
								onClick: () => void forceStart(),
								children: [
									"Start now · ",
									match.players.length,
									" seated"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionDock, {
								match,
								agentId: agentId ?? "",
								busy,
								error,
								onAction: (a) => void act(a)
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mb-3 font-display text-lg font-medium",
						children: "Live log"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveLog, {
						logs: match.logs,
						className: "h-[min(28rem,50vh)]"
					})]
				})
			]
		})]
	});
}
//#endregion
export { WatchPage as component };

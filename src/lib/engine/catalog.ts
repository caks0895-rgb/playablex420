import type { CatalogGame, GameId } from "./types";

export const CATALOG: CatalogGame[] = [
  {
    id: "snakes",
    name: "Snakes & Ladders",
    blurb: "Classic climb, with one paid decision per turn.",
    players: "2–6",
    minPlayers: 2,
    maxPlayers: 6,
    entryFee: 100_000,
    duration: "~2 min",
    rules: [
      "100-square board. Roll 1d6 each turn.",
      "Land on a ladder and you climb. Land on a snake and you fall.",
      "You must land exactly on 100. Overshoot bounces back.",
      "Once per turn you may buy a re-roll (keep the higher) or a snake ward.",
    ],
    powerups: [
      { name: "Re-roll", fee: 20_000, detail: "Roll twice, keep the higher die." },
      { name: "Snake ward", fee: 30_000, detail: "Ignore a snake this turn." },
    ],
  },
  {
    id: "debate",
    name: "Debate 1v1",
    blurb: "Opening, rebuttal, closing. An AI judge scores the floor.",
    players: "2",
    minPlayers: 2,
    maxPlayers: 2,
    entryFee: 150_000,
    duration: "8–15 min (demo is compressed)",
    rules: [
      "Exactly two agents. Three structured rounds.",
      "Opening → Rebuttal → Closing, alternating first speaker.",
      "Submit one argument per window. Miss the window and you forfeit that round.",
      "Grok scores on clarity, evidence, and rebuttal quality. Prize to the winner.",
    ],
    powerups: [],
  },
  {
    id: "coinpump",
    name: "Coin Pump",
    blurb: "Pick the coin that pumps hardest in the window.",
    players: "2–8",
    minPlayers: 2,
    maxPlayers: 8,
    entryFee: 200_000,
    duration: "10 min window",
    rules: [
      "The table lists five coins with live USD prices from CoinGecko.",
      "Each agent picks one coin. Picks lock after 90 seconds.",
      "When the 10-minute clock hits zero, the real price change is scored.",
      "Highest % move wins. Ties split the pot.",
    ],
    powerups: [],
  },
  {
    id: "rps",
    name: "RPS++",
    blurb: "Rock, paper, scissors with a pot, streaks, and a scout.",
    players: "2–4",
    minPlayers: 2,
    maxPlayers: 4,
    entryFee: 50_000,
    duration: "~45s",
    rules: [
      "Five rounds. Everyone throws at once.",
      "Win a pairing +2, draw +1, loss 0. Streaks add +1.",
      "Highest score after five rounds takes the pot.",
      "Once per round you may buy a scout of the last throws.",
    ],
    powerups: [
      { name: "Scout", fee: 10_000, detail: "See every opponent's last throw this match." },
    ],
  },
];

export function catalogById(id: GameId): CatalogGame {
  const g = CATALOG.find((c) => c.id === id);
  if (!g) throw new Error(`Unknown game ${id}`);
  return g;
}

export const BOT_NAMES = ["Nova", "Atlas", "Mira", "Hex", "Drift", "Quill", "Vesper", "Nim"] as const;

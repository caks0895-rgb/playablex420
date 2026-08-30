const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function shortId(prefix: string, len = 4): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}-${s}`;
}

export function uid(prefix = "id"): string {
  return shortId(prefix, 6);
}

export const GAME_PREFIX: Record<string, string> = {
  snakes: "sl",
  debate: "db",
  coinpump: "cp",
  rps: "rp",
  dilemma: "pd",
  target: "tg",
};

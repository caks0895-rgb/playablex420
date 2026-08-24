import type { GameId, LegalAction, Match } from "@/lib/engine/types";
import { coinPumpLegal } from "./coinpump";
import { debateLegal } from "./debate";
import { rpsLegal } from "./rps";
import { snakesLegal } from "./snakes";

export function legalActionsFor(match: Match, playerId: string): LegalAction[] {
  switch (match.gameId as GameId) {
    case "snakes":
      return snakesLegal(match, playerId);
    case "debate":
      return debateLegal(match, playerId);
    case "coinpump":
      return coinPumpLegal(match, playerId);
    case "rps":
      return rpsLegal(match, playerId);
    default:
      return [];
  }
}

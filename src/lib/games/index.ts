import type { GameId, LegalAction, Match } from "@/lib/engine/types";
import { coinPumpLegal } from "./coinpump";
import { debateLegal } from "./debate";
import { dilemmaLegal } from "./dilemma";
import { rpsLegal } from "./rps";
import { snakesLegal } from "./snakes";
import { targetLegal } from "./target";

function uniqueByType(actions: LegalAction[]): LegalAction[] {
  const seen = new Set<string>();
  const out: LegalAction[] = [];
  for (const a of actions) {
    if (seen.has(a.type)) continue;
    seen.add(a.type);
    out.push(a);
  }
  return out;
}

export function legalActionsFor(match: Match, playerId: string): LegalAction[] {
  let actions: LegalAction[] = [];
  switch (match.gameId as GameId) {
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
    case "dilemma":
      actions = dilemmaLegal(match, playerId);
      break;
    case "target":
      actions = targetLegal(match, playerId);
      break;
    default:
      actions = [];
  }
  return uniqueByType(actions);
}

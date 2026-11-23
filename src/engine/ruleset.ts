/**
 * The table rules as data (#30 step 6): what holds for every giv at a table, as opposed to
 * the rules of one contract (contracts.ts). The engine reads these from the ruleset it is
 * given, so a variant such as spel på tre or another group's house rules is a new record,
 * not new code. 1.0 plays FOUR_PLAYERS.
 */
import { BIDDING_TABLE, type Bid } from "./bidding-table.js";
import type { PlayerCount } from "./table.js";

export interface Ruleset {
  readonly id: string;
  readonly name: string;
  readonly playerCount: PlayerCount;
  /**
   * The seats that sit out each giv (vilande), relative to given: −1 is the seat to given's
   * right, +1 the seat to given's left.
   */
  readonly restingSeats: readonly number[];
  /** Dealing (SPEC.md §1): `firstPacket` cards each, then `packet` each until `talonSize` remain. */
  readonly deal: { readonly firstPacket: number; readonly packet: number; readonly talonSize: number };
  /** Payment factors (SPEC.md §2, §6): by the trumf suit, and for misär. */
  readonly paymentFactors: {
    readonly topSuit: number;
    readonly secondSuit: number;
    readonly offSuit: number;
    readonly misere: number;
  };
  /**
   * A bet (SPEC.md §6): worth `betPoints` to the player who lifts it from or puts it in the
   * pulla, shared equally by the others (18p each at spel på tre, 12p at fyra, 9p at fem).
   */
  readonly stake: { readonly betPoints: number };
  /** A pinne is worth this many points. */
  readonly pinPoints: number;
  /** Böter for a failed tjuvpass (SPEC.md §4.1): this many bets. */
  readonly penalty: { readonly bets: number };
  /** The budtabell this table plays (other groups play other tables). */
  readonly biddingTable: readonly Bid[];
}

/** What spel på tre, fyra and fem share: everything but the player count and the vilande. */
const HOUSE_RULES = {
  deal: { firstPacket: 4, packet: 3, talonSize: 13 },
  paymentFactors: { topSuit: 4, secondSuit: 2, offSuit: 1, misere: 3 },
  stake: { betPoints: 36 },
  pinPoints: 6,
  penalty: { bets: 1 },
  biddingTable: BIDDING_TABLE,
} as const;

export const THREE_PLAYERS: Ruleset = { ...HOUSE_RULES, id: "threePlayers", name: "Spel på tre", playerCount: 3, restingSeats: [] };
export const FOUR_PLAYERS: Ruleset = { ...HOUSE_RULES, id: "fourPlayers", name: "Spel på fyra", playerCount: 4, restingSeats: [-1] };
export const FIVE_PLAYERS: Ruleset = { ...HOUSE_RULES, id: "fivePlayers", name: "Spel på fem", playerCount: 5, restingSeats: [-1, 1] };

export const RULESETS: readonly Ruleset[] = [THREE_PLAYERS, FOUR_PLAYERS, FIVE_PLAYERS];

export const rulesetFor = (playerCount: PlayerCount): Ruleset => {
  const ruleset = RULESETS.find((r) => r.playerCount === playerCount);
  if (ruleset === undefined) throw new Error(`No ruleset for ${playerCount} players`);
  return ruleset;
};

/**
 * The talong during the köp phases. For now only which cards are laid out before the köp; the
 * köp itself comes with #10 and #32–#34.
 */
import type { Card } from "./cards.js";
import type { Contract } from "./contracts.js";

/** The talong cards a contract lays out before the köp (turned up, or Minusgask's nerslag): the top ones. */
export const turnUpCards = (talon: readonly Card[], contract: Contract): Card[] =>
  contract.turnUp === null ? [] : talon.slice(0, contract.turnUp.cards);

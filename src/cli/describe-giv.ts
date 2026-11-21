/**
 * A plain-text description of a dealt giv, for `npm run deal` (#46): the roles, each hand
 * grouped by suit, the talong in order and the Färg card.
 */
import { formatCard, formatRank, formatSuit, rankValue, SUITS, type Card, type Deal, type Seat } from "../engine/index.js";

/** "♣ E K 9  ♥ D 3  ♠ –  ♦ Kn 10 2": one hand grouped by suit, highest rank first. */
export function handText(cards: readonly Card[]): string {
  return SUITS.map((suit) => {
    const inSuit = cards.filter((card) => card.suit === suit).sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
    return `${formatSuit(suit)} ${inSuit.length === 0 ? "–" : inSuit.map((card) => formatRank(card.rank)).join(" ")}`;
  }).join("  ");
}

function roleOf(seat: Seat, deal: Deal): string {
  const { roles } = deal;
  if (seat === roles.dealer) return "EH (given)";
  if (seat === roles.forehand) return "FH";
  if (seat === roles.middlehand) return "MH";
  return "vilande";
}

export function describeGiv(deal: Deal): string[] {
  const { roles, colours } = deal;
  const lines = [
    `${roles.playerCount} players, given in seat ${roles.dealer}, pack seed ${deal.seed}`,
    `Färg: ${formatCard(colours.colourCard)}  →  hf ${formatSuit(colours.topSuit)}, af ${formatSuit(colours.secondSuit)}, of ${colours.offSuits.map(formatSuit).join(" ")}`,
    "",
  ];
  for (let seat = 0; seat < roles.playerCount; seat++) {
    const hand = deal.dealtHands[seat];
    const role = roleOf(seat, deal).padEnd(11);
    lines.push(`seat ${seat}  ${role}${hand === undefined ? "" : handText(hand)}`.trimEnd());
  }
  lines.push("", `talong (top first): ${deal.talon.map(formatCard).join(" ")}`);
  return lines;
}

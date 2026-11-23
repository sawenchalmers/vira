/**
 * Player-facing Swedish text for the terminal (CLAUDE.md: player-facing text lives in one
 * message module; the engine gives data, never text). It starts with the contract walkthrough
 * (#49) and grows into the game loop's message module in #25.
 */
import { formatCard, formatSuit, type Card, type Colours, type Contract, type Suit } from "../engine/index.js";

const cards = (list: readonly Card[]): string => list.map(formatCard).join(" ");
const suits = (list: readonly Suit[]): string => list.map(formatSuit).join(" ");

/** A phase whose cards the engine doesn't move yet; the issue that builds it, when there is one. */
export const notBuilt = (issue?: number): string =>
  issue === undefined ? "(Korten flyttas inte än.)" : `(Korten flyttas inte än: #${issue}.)`;

export const intro = (contract: Contract, colours: Colours, hand: string): string[] => [
  `Slutbud: ${contract.name}. Du är lomber och sitter i förhand.`,
  `Färg: ${formatCard(colours.colourCard)}, Högsta Färg ${formatSuit(colours.topSuit)}, Andra Färg ${formatSuit(colours.secondSuit)}.`,
  `Din hand: ${hand}`,
];

export const numbered = (labels: readonly string[]): string => labels.map((label, i) => `  ${i + 1}. ${label}`).join("\n");

export const raiseOffer = "Du kan ta större till:";
export const raiseQuestion = "Ta större? Välj ett nummer, eller Enter för att stå kvar:";
export const raised = (name: string): string => `Du tar större: ${name}.`;
export const chooseContract = "Välj spel:";
export const chooseQuestion = (count: number): string => `Välj 1–${count}:`;
export const chooseError = (count: number): string => `Svara med ett nummer från 1 till ${count}.`;

export const turnedUp = (laidOut: readonly Card[], bought: "must" | "never"): string =>
  `Uppvänt ur talongen: ${cards(laidOut)}. ` +
  (bought === "must"
    ? "De måste köpas och räknas bland de köpta korten."
    : "Det är bytkort: de kan inte köpas, bara bytas in efter köpet.");
export const nerslag = "Översta talongkortet läggs ned (nerslag). Du tar upp det när du har valt spel.";
export const takeNerslag = (card: Card): string => `Du tar upp nerslaget: ${formatCard(card)}.`;

export const trumpQuestion = (options: readonly Suit[]): string => `Vilken färg blir trumf? (${suits(options)})`;
export const trumpError = (options: readonly Suit[]): string => `Svara med en av färgerna ${suits(options)}.`;
export const trumpIs = (suit: Suit): string => `Trumf: ${formatSuit(suit)}.`;

export const royale = "Royale: din hand läggs upp nu, synlig för alla.";
export const ouverte = "Ouverte: din hand läggs upp inför spelet.";
export const hand = (text: string): string => `Din hand: ${text}`;

export const buyQuestion = (min: number, max: number): string => `Hur många kort köper du? (${min}–${max})`;
export const numberError = (min: number, max: number): string => `Svara med ett tal från ${min} till ${max}.`;
export const blindBuy = (count: number): string =>
  count === 0 ? "Du köper inget." : `Du kastar ${count} kort och köper ${count} blint från talongen.`;
export const keepAndTake = (keep: number, afterNerslag: boolean): string =>
  `${keep === 0 ? "Du kastar hela givhanden" : `Du behåller ${keep} givkort, kastar resten`} ` +
  `och tar ${afterNerslag ? "resten av talongen" : "hela talongen"}.`;
export const pickFromHandAndTalon = (openTalon: boolean): string =>
  openTalon
    ? "Talongen läggs upp öppet. Du tar den och behåller 13 av de 26 korten; kort ur talongen spelas öppet."
    : "Du tar talongen och behåller 13 av de 26 korten.";

export const swap = (rule: NonNullable<Contract["swap"]>): string =>
  `Byt in minst ${rule.min} bytkort. För varje bytkort får du kasta ${rule.discardPerSwap.join(", ")} handkort ` +
  `(i tur och ordning), eller färre. Tar du hela uppslaget utan att lägga något åt sidan blir det ` +
  `${rule.whenTailEmpty.name}: spelas med ${rule.whenTailEmpty.handSize} kort, betalas ×${rule.whenTailEmpty.multiplier}.`;

export const rebuyQuestion = (minTalon: number): string =>
  `Omköp? Det går så länge minst ${minTalon} kort finns kvar i talongen. (j/n)`;
export const rebuy = "Du gör Omköp.";
export const yesNoError = "Svara j eller n.";

export const discard = (rule: NonNullable<Contract["discard"]>): string =>
  `Du kastar ner till ${rule.downTo} kort${rule.mayKeepMore ? " (i misär får du behålla fler)" : ""}.`;

export const defenceBuy = "Försvaret köper.";
export const foldQuestion = "Spelar du, eller lägger du spelet? (s/l)";
export const foldError = "Svara s (spela) eller l (lägga).";
export const folded = (name: string): string => `Du lägger spelet (${name}). Given är slut.`;

const goalText = (goal: Contract["goal"]): string =>
  goal.kind === "tricks" ? `minst ${goal.min} stick` : goal.tricksAllowed === 0 ? "inga stick" : "högst ett stick";

export const ready = (contract: Contract, trump: Suit | undefined): string =>
  `Klart för första sticket: ${contract.name}, ${trump === undefined ? "utan trumf" : `trumf ${formatSuit(trump)}`}. ` +
  `Mål: ${goalText(contract.goal)}, med ${contract.handSize} kort.`;

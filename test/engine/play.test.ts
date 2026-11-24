import { describe, expect, it } from "vitest";
import {
  dealCards, deriveSeed, FOUR_PLAYERS, legalCards, outcome, parseCard, playCard, resultOf, rolesFor, startPlay,
  toPlay, trickCount, trickWinner, type Card, type Goal, type Play, type Seat, type Suit,
} from "../../src/engine/index.js";

const roles = rolesFor(0, FOUR_PLAYERS);
const { forehand: fh, middlehand: mh, dealer: eh } = roles;
const cards = (text: string): Card[] => text.split(" ").map(parseCard);
const TRUMP: Goal = { kind: "tricks", min: 2 };
const GRANDE: Goal = { kind: "misere", tricksAllowed: 0 };

/** A play with the given hands (FH, MH, EH); FH is lomber unless said otherwise. */
const start = (hands: [string, string, string], goal: Goal = TRUMP, trump: Suit | undefined = "hearts", lomber: Seat = fh): Play =>
  startPlay({ roles, lomber, trump, goal, hands: { [fh]: cards(hands[0]), [mh]: cards(hands[1]), [eh]: cards(hands[2]) } });

/** Plays the cards in turn; each is played by whoever is to play. */
const playAll = (play: Play, text: string): Play => cards(text).reduce(playCard, play);

describe("trick play", () => {
  it("EH leads to the first trick, then FH and MH; the resting seat is skipped", () => {
    let play = start(["♠2 ♠3", "♠4 ♠5", "♠6 ♠7"]);
    const order: (Seat | undefined)[] = [];
    for (const card of cards("♠6 ♠2 ♠4")) {
      order.push(toPlay(play));
      play = playCard(play, card);
    }
    expect(order).toEqual([eh, fh, mh]);
    expect(order).not.toContain(roles.restingSeats[0]);
  });

  it("must follow suit; a seat void in the led suit may play any card", () => {
    const play = playAll(start(["♠2 ♥3 ♦4", "♣5 ♦6 ♦7", "♠8 ♣9 ♣10"]), "♠8");
    expect(legalCards(play, fh)).toEqual(cards("♠2"));
    expect(legalCards(play, mh)).toEqual(cards("♣5 ♦6 ♦7"));
    expect(() => playCard(play, parseCard("♥3"))).toThrow(/can't play/);
  });

  it("a card not in the hand, or played when the play is over, is refused", () => {
    expect(() => playCard(start(["♠2", "♠3", "♠4"]), parseCard("♠E"))).toThrow(/can't play/);
    const over = playAll(start(["♠2", "♠3", "♠4"], { kind: "tricks", min: 1 }), "♠4 ♠2 ♠3");
    expect(toPlay(over)).toBeUndefined();
    expect(() => playCard(over, parseCard("♠5"))).toThrow(/over/);
  });

  it.each([
    ["the highest card of the led suit", "♠10 ♠E ♠K", undefined, 1],
    ["a card of another suit never wins", "♠10 ♦E ♣E", undefined, 0],
    ["a trumf beats the led suit", "♠E ♥2 ♠K", "hearts", 1],
    ["the highest trumf", "♠E ♥2 ♥3", "hearts", 2],
    ["a led trumf", "♥5 ♥2 ♠E", "hearts", 0],
  ] as const)("the trick goes to %s", (_, text, trump, index) => {
    const played = cards(text).map((card, i) => ({ seat: i, card }));
    expect(trickWinner(played, trump)).toBe(played[index]);
  });

  it("the winner leads to the next trick", () => {
    const play = playAll(start(["♠E ♣2", "♠2 ♣3", "♠3 ♣4"], { kind: "tricks", min: 2 }), "♠3 ♠E ♠2");
    expect(play.taken[0]?.winner).toBe(fh);
    expect(play.current).toEqual({ leader: fh, cards: [] });
    expect(toPlay(play)).toBe(fh);
    expect(trickCount(play)).toEqual({ lomber: 1, defence: 0 });
  });

  it("Petite: lomber's 12 cards against the defenders' 13 make 12 tricks", () => {
    expect(start(["♠2 ♠3", "♠4 ♠5 ♠6", "♠7 ♠8 ♠9"]).tricksInGiv).toBe(2);
    expect(start(["♠2 ♠3 ♠4 ♠5", "♠6 ♠7 ♠8", "♠9 ♠10 ♠Kn"]).tricksInGiv).toBe(3);
  });
});

describe("the result", () => {
  it.each([
    [{ kind: "tricks", min: 6 }, [[6, "made"], [10, "made"], [5, "defeated"], [4, "doubleDefeated"], [0, "doubleDefeated"]]],
    [{ kind: "misere", tricksAllowed: 0 }, [[0, "made"], [1, "defeated"], [2, "doubleDefeated"], [5, "doubleDefeated"]]],
    [{ kind: "misere", tricksAllowed: 1 }, [[0, "made"], [1, "made"], [2, "defeated"], [3, "doubleDefeated"]]],
  ] as const)("%j", (goal, cases) => {
    for (const [tricks, result] of cases) expect(resultOf(goal, tricks), `${tricks} tricks`).toBe(result);
  });

  it("play stops at hemgång", () => {
    const play = playAll(start(["♥E ♥K ♣2", "♠3 ♠4 ♠5", "♠6 ♠7 ♠8"]), "♠6 ♥E ♠3 ♥K ♠4 ♠7");
    expect(outcome(play)).toBe("made");
    expect(toPlay(play)).toBeUndefined();
    expect(play.taken).toHaveLength(2);
  });

  it("play stops at kodilj, once lomber can't get closer than two tricks short", () => {
    const needsAll: Goal = { kind: "tricks", min: 3 };
    const oneDown = playAll(start(["♠2 ♠3 ♠4", "♠5 ♠6 ♠7", "♠8 ♠9 ♠10"], needsAll), "♠10 ♠2 ♠5");
    expect(outcome(oneDown)).toBeUndefined();
    const twoDown = playAll(oneDown, "♠9 ♠3 ♠6");
    expect(outcome(twoDown)).toBe("doubleDefeated");
    expect(toPlay(twoDown)).toBeUndefined();
  });

  it("a bet is only certain after the last trick", () => {
    const play = playAll(start(["♥E ♣2 ♣3", "♣4 ♣5 ♣6", "♠7 ♠8 ♠9"]), "♠9 ♥E ♣6 ♣2 ♣5 ♠8");
    expect(trickCount(play)).toEqual({ lomber: 1, defence: 1 });
    expect(outcome(play)).toBeUndefined();
    expect(outcome(playAll(play, "♣4 ♠7 ♣3"))).toBe("defeated");
  });

  it("misär: hemgång only after the last trick, kodilj as soon as lomber has two tricks", () => {
    const made = playAll(start(["♠2 ♠3", "♠4 ♠5", "♠6 ♠7"], GRANDE, undefined), "♠6 ♠2 ♠4");
    expect(outcome(made)).toBeUndefined();
    expect(outcome(playAll(made, "♠7 ♠3 ♠5"))).toBe("made");
    const taken = playAll(start(["♠E ♠K ♠2", "♠4 ♠5 ♠6", "♠7 ♠8 ♠9"], GRANDE, undefined), "♠7 ♠E ♠4 ♠K ♠5 ♠8");
    expect(outcome(taken)).toBe("doubleDefeated");
    expect(toPlay(taken)).toBeUndefined();
  });
});

describe("whole givar", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])("seed %i: every card played is legal and the play ends with a result", (seed) => {
    const deal = dealCards(0, FOUR_PLAYERS, deriveSeed(seed, 0), deriveSeed(seed, 1));
    const goal: Goal = seed % 2 === 0 ? { kind: "tricks", min: 7 } : { kind: "misere", tricksAllowed: 1 };
    let play = startPlay({ roles: deal.roles, lomber: deal.roles.middlehand, trump: seed % 2 === 0 ? "clubs" : undefined, goal, hands: deal.dealtHands });
    for (let seat = toPlay(play); seat !== undefined; seat = toPlay(play)) {
      const legal = legalCards(play, seat);
      play = playCard(play, legal[seed % legal.length] as Card);
    }
    const tricks = trickCount(play);
    expect(outcome(play)).toBe(resultOf(goal, tricks.lomber));
    expect(tricks.lomber + tricks.defence).toBeLessThanOrEqual(play.tricksInGiv);
    expect(play.current.cards).toEqual([]);
  });
});

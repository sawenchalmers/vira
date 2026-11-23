import { describe, expect, it } from "vitest";
import { walkThrough } from "../../src/cli/contract-walkthrough.js";
import type { Io } from "../../src/cli/io.js";
import { contractById, dealCards, formatCard, FOUR_PLAYERS, parseCard, type Deal } from "../../src/engine/index.js";

/** An Io that answers from a script and records what it showed and asked. */
const scripted = (answers: readonly string[]) => {
  const queue = [...answers];
  const shown: string[] = [];
  const asked: string[] = [];
  const io: Io = {
    show: (text) => shown.push(text),
    ask: (question) => {
      asked.push(question);
      const answer = queue.shift();
      return answer === undefined ? Promise.reject(new Error(`No answer for: ${question}`)) : Promise.resolve(answer);
    },
  };
  return { io, shown, asked, left: () => queue.length };
};

/** A giv whose talong (still 13 cards) starts with the given cards; the hands aren't changed. */
const dealWithTalon = (...top: string[]): Deal => {
  const deal = dealCards(0, FOUR_PLAYERS, 1, 2);
  const cards = top.map(parseCard);
  const rest = deal.talon.filter((c) => !cards.some((t) => t.suit === c.suit && t.rank === c.rank));
  return { ...deal, talon: [...cards, ...rest].slice(0, deal.talon.length) };
};

const walk = async (id: string, answers: readonly string[], deal = dealCards(0, FOUR_PLAYERS, 1, 2)) => {
  const run = scripted(answers);
  await walkThrough(run.io, deal, FOUR_PLAYERS, contractById(id));
  expect(run.left(), "unused answers").toBe(0);
  return run;
};

describe("walking through a contract until the first trick", () => {
  it("Begär: stand, name trumf, buy, no Omköp, play", async () => {
    const { shown } = await walk("begar-6", ["", "hj", "3", "n", "s"]);
    expect(shown).toContain("Trumf: ♥.");
    expect(shown.at(-1)).toBe("Klart för första sticket: Begär, trumf ♥. Mål: minst 6 stick, med 13 kort.");
  });

  it("asks again after an answer it can't use", async () => {
    const { shown } = await walk("begar-6", ["9", "", "x", "hj", "14", "3", "kanske", "n", "s"]);
    expect(shown).toContain("Svara med ett nummer från 1 till 4.");
    expect(shown).toContain("Svara med en av färgerna ♣ ♥ ♠ ♦.");
    expect(shown).toContain("Svara med ett tal från 0 till 13.");
    expect(shown).toContain("Svara j eller n.");
  });

  it("a raise changes the contract", async () => {
    const { shown } = await walk("begar-6", ["1", "sp", "0", "n", "s"]);
    expect(shown).toContain("Du tar större: 7-spel.");
    expect(shown.at(-1)).toMatch(/^Klart för första sticket: 7-spel, trumf ♠\. Mål: minst 7 stick/);
  });

  it("Omköp repeats the köp until lomber stops", async () => {
    const { shown, asked } = await walk("begar-6", ["", "hj", "3", "j", "4", "ja", "2", "n", "s"]);
    expect(shown.filter((line) => line === "Du gör Omköp.")).toHaveLength(2);
    expect(asked).toContain("Omköp? 10 kort kvar i talongen. (j/n)");
    expect(asked).toContain("Hur många kort köper du? (0–6)");
    expect(asked).toContain("Omköp? 4 kort kvar i talongen. (j/n)");
  });

  it("no Omköp once the talong runs out", async () => {
    const { shown, asked } = await walk("begar-6", ["", "hj", "13", "s"]);
    expect(asked.some((q) => q.startsWith("Omköp?"))).toBe(false);
    expect(shown).toContain("Talongen räcker inte till fler Omköp.");
  });

  it("Omturné turns up the next card, which gives the new trumf", async () => {
    const { shown } = await walk("turne-7", ["", "1", "j", "1", "n", "s"], dealWithTalon("♦D", "♠7"));
    expect(shown).toContain("Du gör Omturné.");
    expect(shown.filter((line) => line.startsWith("Uppvänt ur talongen:"))).toEqual([
      "Uppvänt ur talongen: ♦D. De måste köpas och räknas bland de köpta korten.",
      "Uppvänt ur talongen: ♠7. De måste köpas och räknas bland de köpta korten.",
    ]);
    expect(shown.at(-1)).toMatch(/trumf ♠/);
  });

  it("Omvingel: trumf is chosen again among the new cards", async () => {
    const { asked, shown } = await walk("vingel-7", ["", "hj", "2", "j", "kl", "2", "n", "s"], dealWithTalon("♥K", "♦7", "♠2", "♣5"));
    expect(asked).toContain("Vilken färg blir trumf? (♠ ♣)");
    expect(shown.at(-1)).toMatch(/trumf ♣/);
  });

  it("Ombyte: a new uppslag, köp and swap from the rest of the talong", async () => {
    const deal = dealWithTalon("♥K", "♦7");
    const { shown, asked } = await walk("tupp-2", ["", "4", "j", "3", "s"], deal);
    const second = deal.talon.slice(6, 8).map(formatCard).join(" ");
    expect(shown).toContain("Du gör Ombyte.");
    expect(shown.some((line) => line.startsWith(`Uppvänt ur talongen: ${second}.`))).toBe(true);
    expect(asked).toContain("Hur många kort köper du? (0–5)");
    expect(asked).toContain("Ombyte? 7 kort kvar i talongen. (j/n)");
    // 2 left after the second köp, and Ombyte needs 3: no more offers.
    expect(shown).toContain("Talongen räcker inte till fler Ombyte.");
  });

  it("a fold ends the giv", async () => {
    const { shown } = await walk("begar-6", ["", "hj", "0", "n", "l"]);
    expect(shown.at(-1)).toBe("Du lägger spelet (Begär). Given är slut.");
  });

  it("Turné: trumf is the turned-up card's suit, and it must be bought", async () => {
    const { shown, asked } = await walk("turne-7", ["", "1", "n", "s"], dealWithTalon("♦D"));
    expect(shown).toContain("Trumf: ♦.");
    expect(asked).toContain("Hur många kort köper du? (1–13)");
  });

  it("Vingel: trumf only among the turned-up suits", async () => {
    const { shown, asked } = await walk("vingel-7", ["", "sp", "hj", "2", "n", "s"], dealWithTalon("♥K", "♦7"));
    expect(asked).toContain("Vilken färg blir trumf? (♥ ♦)");
    expect(shown).toContain("Svara med en av färgerna ♥ ♦.");
    expect(shown.at(-1)).toMatch(/trumf ♥/);
  });

  it("Minusgask: the nerslag stays hidden until the game is chosen", async () => {
    const deal = dealWithTalon("♠E");
    const { shown } = await walk("gask--1-trump", ["", "2", "s"], deal);
    const taken = shown.indexOf(`Du tar upp nerslaget: ${formatCard(parseCard("♠E"))}.`);
    expect(taken).toBeGreaterThan(shown.indexOf("Välj spel:"));
    expect(shown.slice(0, taken).join("\n")).not.toContain("♠E");
    expect(shown.at(-1)).toBe("Klart för första sticket: Minusgask (misär), utan trumf. Mål: högst ett stick, med 12 kort.");
  });

  it("Gask på 5: only the trumf suit is chosen after the köp", async () => {
    const { shown, asked } = await walk("gask-5-trump", ["", "ru", "s"]);
    expect(asked).not.toContain("Välj 1–2:");
    expect(shown.at(-1)).toMatch(/Gask på 5 \(trumf\), trumf ♦\. Mål: minst 12 stick/);
  });

  it("a Solo cell: choose Hope Solo after the bidding, then name trumf; Royale shows the hand", async () => {
    const { shown } = await walk("solo-misere-pf", ["", "2", "kl"]);
    expect(shown).toContain("Royale: din hand läggs upp nu, synlig för alla.");
    expect(shown).toContain("Försvaret köper. (Korten flyttas inte än: #35.)");
    expect(shown.at(-1)).toMatch(/^Klart för första sticket: Hope Solo 6, trumf ♣/);
  });

  it("Tupp: turned-up bytkort, a köp from the rest, then the swap", async () => {
    const { shown, asked } = await walk("tupp-2", ["", "4", "n", "s"], dealWithTalon("♥K", "♦7"));
    expect(shown).toContain("Uppvänt ur talongen: ♥K ♦7. Det är bytkort: de kan inte köpas, bara bytas in efter köpet.");
    expect(asked).toContain("Hur många kort köper du? (0–11)");
    expect(shown.some((line) => line.includes("Höna (tVupp): spelas med 15 kort"))).toBe(true);
  });

  it.each([
    ["begar-6", ["", "hj", "3", "n", "s"], 0],
    ["vingel-7", ["", "hj", "2", "n", "s"], 2],
  ])("%s shows no talong card except those laid out face up", async (id, answers, laidOut) => {
    const deal = dealWithTalon("♥K", "♦7");
    const { shown } = await walk(id, answers, deal);
    const text = shown.join("\n");
    deal.talon.forEach((card, i) => {
      expect(text.includes(formatCard(card)), formatCard(card)).toBe(i < laidOut);
    });
  });
});

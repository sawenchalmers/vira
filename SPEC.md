# Isbergsvira – rules engine & agent architecture spec

Terminology is kept in Swedish where it is the game's own vocabulary; §0 lists the terms
and the English names the code uses.
Card ranks: E (ess) > K > D > Kn > 10 > 9 … > 2. Suits ♣ ♥ ♠ ♦.

Items marked **[UNCERTAIN]** were inferred during chat play and must be confirmed with the
user or the rule document before relying on them.

---

## 0. Glossary

The Swedish terms (in italics) are the ones used at the table (#42); the code uses the
English names in the last column. The terms hold for any number of players (*spel på tre*,
*fyra* or *fem*); the rest of this spec describes *spel på fyra*. Contract names (*Begär*,
*Turné*, *Vingel*, *Tringel*, *Gask*, *Solo*, *Hope Solo*, *Köpmisär*, *tRupp*/*tVupp*/*tTupp*,
*Gökägg*, *Gökunge*, *Muntergök*, *Vira*) are names, not translated. So are the *Bättre*
forms *Trumfgask* and *Trumfsolo* (*Gask* / *Solo* + `upgrade`) and *Misärgask* (*Bättre
Minusgask*). The *Begär* family (*Begärspel*) is written *Sexspel* (= *Begär*), *Sjuspel*,
*Åttaspel*, *Niospel*, *Tiospel* in game text and prompts, and *6-spel* … *10-spel* in
tables and the protocol.

**Table and roles**

| Term | Meaning | Code |
|---|---|---|
| *spel på tre*, *fyra*, *fem* | the table rules for that many players: the *vilande*, the deal, payment factors, the stake, *böter* and the *budtabell* | `Ruleset` (`THREE_PLAYERS`, `FOUR_PLAYERS`, `FIVE_PLAYERS`) |
| *parti* | a session of *givar*, scored together | `Match` |
| *giv* | a deal; *given* is also the dealer (= EH) | `Deal`, `Dealer` |
| *rond* | one *giv* per player, so everyone has dealt once | `Round` |
| *förhand* (FH), *mellanhand* (MH), *efterhand* (EH) | the three active seats in a *giv*, *medsols* after *given*; EH is *given*. In each *stick* the same words also name the first, second and third to play | `forehand`, `middlehand`, `rearhand` |
| *vilande* | a player who sits out the *giv*: none at *spel på tre*, the player right of *given* at *spel på fyra*, both players next to *given* at *spel på fem* | `restingSeats` |
| *medsols* | clockwise | `clockwise` |
| *lomber* | the player whose bid became the *slutbud* | `declarer` |
| *förste* / *andre försvarare* | the defenders, in buying order *medsols* from *lomber* | `firstDefender`, `secondDefender` |
| *talong* | the 13 cards not dealt, top card first | `talon` |
| *givkort*, *givhand* | the cards dealt to a player | `dealtCards`, `dealtHand` |

**Cards**

| Term | Meaning | Code |
|---|---|---|
| *Ess* (E), *Kung* (K), *Dam* (D), *Knekt* (Kn), *Tia* (10) … *Tvåa* (2) | the ranks, highest first | `Rank`: `ace`, `king`, `queen`, `jack`, `10` … `2` |
| *klöver* ♣, *hjärter* ♥, *spader* ♠, *ruter* ♦ | the suits | `Suit`: `clubs`, `hearts`, `spades`, `diamonds` |

The code uses the English values; the game text, the coach and the AI players' prompts show
the Swedish letters and suit symbols (E K D Kn 10 … 2, ♣ ♥ ♠ ♦). The card notation (suit
symbol + rank, e.g. "♠Kn") is the fixed exchange format for moves and prompts, whatever
language a player sees. Display and input are localisable and belong to the message module
(#25); input accepts the suit aliases *k*/*kl*, *h*/*hj*, *s*/*sp*, *r*/*ru*, in any case.

**Färg and trumf**

| Term | Meaning | Code |
|---|---|---|
| *Färg* | the card MH lays, which sets the colours for the *giv* | `colourCard` |
| *Färgerna* | *Högsta* and *Andra Färg* together | `colourSuits` |
| *i Färg*, *i Högsta Färg* | a bid restricted to trump in *Färgerna* / in *Högsta Färg* | `inColour`, `inTopColour` |
| *färga* | to make a bid *i Färg* (a *Bättre* bid) | `upgrade` |
| *färg* | a suit, as in *bekänna färg* | `Suit` |
| *Högsta Färg* (hf) | the *Färg* card's suit | `topSuit` |
| *Andra Färg* (af, "f") | the other suit of the same colour | `secondSuit` |
| *Ofärg* (of) | the two suits of the other colour | `offSuits` |
| *trumf*, *Trumfspel* | trump; a game with a trump suit | `trump`, `trumpContract` |
| *misär* | a game where *lomber* must avoid tricks | `misereContract` |
| *sluten* | a *misär* played with *lomber*'s hand hidden | `closed` |
| *Petite* / *Grande* / *Falsk* / *Ouverte* (*öppen*) / *Royale* | *misär* variants: play with 12 / 13 cards; one trick allowed; hand face up; hand face up before the *köp* | `petite`, `grande`, `falseMisere`, `ouverte`, `royale` |

**Bidding**

| Term | Meaning | Code |
|---|---|---|
| *budgivning* | the bidding | `biddingPhase` |
| *öppningsbud* | FH's first bid | `openingBid` |
| *budtabell* (colloquially *Isberget*) | the bidding table (§3) | `biddingTable` |
| *nivå*, π | a level in the *budtabell* and its points | `level`, `levelPoints` |
| *havsytan* | the line between 8p and 12p | `seaLevel` |
| *bud*, *slutbud* | a bid in the *budtabell*; the last bid, which *lomber* plays. The game actually played is chosen from the final bid's contracts (e.g. *Gask på 2* → trumf or misär) | `Bid`, `finalBid`; the game: `Contract` |
| *pass* | to pass, and so leave the *budgivning* | `pass` |
| *ta större*, *höja* | *lomber* taking the *slutbud* larger within its family, before the *köp* | `raiseBid` |
| *Bättre* | an already-said bid on the same level that restricts the choice of trump or *misär*: *Trumfgask* / *Trumfsolo*, *i Färg*, *i Högsta Färg*; at *Minusgask*, *Misärgask* (§4) | `upgrade` |
| *Värre*, *i förhand* | taking over an already-said bid unchanged (FH, or MH from EH) | `takeOver` |
| *avpassning*, *dubbelpass* | the end of the bidding: two passes | `passOut` |
| *avpassningskonvention* (AK) | what a passer is expected to hold; a bid's AK code (e.g. *3h*, *haja*) | `passingConvention`, `passingRequirement` |
| *Första* / *Andra hand* (1a / 2a pass) | the first / second player to pass; at a *Gök*, only passes on the *Gök* bid itself count (§4.1) | `firstPasser`, `secondPasser` |
| *tjuvpass*, *tjuvpassare* | a pass that doesn't meet the AK; the player who makes it | `unsoundPass`, `unsoundPasser` |
| *kravbud* | a bid whose AK can cost *böter*: the three smallest *Gask* and every *Gök* | `penalisedPassBid` |
| *lurpass* | passing on strength, to trap *lomber* | `trapPass` |
| *böter* | the bet a *tjuvpassare* pays when the bid is played home (§4.1) | `penalty` |
| *håll*, *dubbelhåll* | a stopper; a double stopper (§3.1) | `stopper`, `doubleStopper` |
| *låggard* (*gard*, *äkta gard*), *halvgard* (*antydan*) | a protected low card; half of one (§3.1) | `lowGuard`, `halfGuard` |
| *jämn hand* | no singleton and no suit of 6 or more cards | `evenHand` |
| *sonika*, *renons* | a singleton; a void | `singleton`, `voidSuit` |
| *andra*, *tredje* | a card with one / two lower cards in its suit (*Kung-andra*, *Dam-tredje*) | `doubleton`, `tripleton` |
| *handkort* | the cards in a player's hand | `handCards` |

**Köp**

| Term | Meaning | Code |
|---|---|---|
| *köp* | exchanging cards with the *talong* | `buy`, `buyPhase` |
| *Omköp* (*Omturné*, *Omvingel*, *Omtringel*, *Ombyte*) | *lomber* buying again for one bet; the game text uses the name that fits the contract | `rebuy` |
| *kasta*, *kastkort* | to give up cards in the *köp*; those cards | `discard`, `discardedCards` |
| *uppslag* | the *talong* cards turned face up (*Turné*, *Vingel*, *Tringel*, *Tupp*) | `turnUpCards` |
| *byte*, *bytkort* | in a *Tupp*: swapping turned-up cards into the hand; those cards | `swap`, `swapCards` |
| *tuppstjärt* | a *Tupp*'s rejected *bytkort* and *kastade* handkort, lying open | `tuppTail` |
| *nerslag* | the *Minusgask*'s top *talong* card, laid face down | `setAsideCard` |
| *köphand*, *spelhand* | the hand after the *köp*; the hand *lomber* plays with | `boughtHand`, `playingHand` |
| *lägga spelet*, *lagt spel* | *lomber* giving up after the *köp*; the result | `fold`, `folded` |

**Play**

| Term | Meaning | Code |
|---|---|---|
| *Spelning* | the play, after the *köp* | `playPhase` |
| *stick* | a trick (*spel* can also mean a trick) | `trick` |
| *utspel* | the lead | `lead` |
| *bekänna färg* | to follow suit | `followSuit` |
| *sticka* | to play the highest card so far in the trick | `beat` |
| *stjäla* | to play a trump when another suit is led | `ruff` |
| *ta*, *vinna* (*ett stick*) | to win a trick | `takeTrick`, `trickWinner`, `tricksTaken` |
| *förlora* (*ett stick*) | to lose a trick: another player takes it | `loseTrick`, `tricksLost` |
| *saka*, *sakning* | to play a card of a suit that is neither led nor *trumf*; that card | `sluff`, `sluffCard` |
| *maska* | to *saka* although you could have *stulit* | `declineToRuff` |
| *vinnare* | a card that will take a trick | `winningCards` |
| *trumfsits* | how the remaining trumps are split between the defenders | `trumpSplit` |
| *gaffel* | the defenders hold e.g. E D around *lomber*'s K Kn, so *lomber* can't lead the suit without losing both | `tenace` |
| *osättbar* | a *misär* suit or hand that can't be beaten | `unbeatable` |
| *lägga upp* | to claim the rest of the tricks by showing your cards (also: playing with the hand face up) | `claim` |

**Results and payment**

| Term | Meaning | Code |
|---|---|---|
| *hemgång* | *lomber* makes the game | `made` |
| *bet*, *betspel* | *lomber* is one trick short; a game played (not folded) and lost | `defeated` |
| *kodilj* (*kossa*) | *lomber* is two or more tricks short; the tricks beyond are *kalvar* and aren't counted | `doubleDefeated` |
| *Pinnar*, Π (P) | the payment from the game's price, Π = π (+ μ above *havsytan*) (§3, §6) | `pins`, `gamePrice` |
| *Modpinnar*, *Fegpinnar* | no *Pinnar* after a *betspel*; below zero (*Minusgask*) the other way round: a *betspel* pays the *Pinnar* and a *lagt spel* pays none (*Fegpinnar*) | `couragePins`, `cowardPins` |
| *Betar*, *bet* | the stake: 36p for the player who lifts or puts in the bet, shared equally by the others (18p each at *spel på tre*, 12p at *fyra*, 9p at *fem*) | `stakes`, `stake` |
| *pulla* | the box the bets are put in | `potBox` |
| *pott* | the bets in the *pulla* | `pot` |
| *lyfta*, *sätta* (*en bet*) | to take a bet from / put one in the *pulla* | `liftStake`, `putStake` |
| *ål*, *åltur* | every player putting one bet in the *pulla*: at the start of a *parti*, and whenever the *pott* drops below three bets | `ante` |
| μ | the extra points above *havsytan* (§3) | `mu` |
| *Jackpott* | lifting the whole *pott* (§3) | `jackpot` |
| *protokoll*, *Ställning* | the score sheet; the running totals in the *protokoll*, and the tricks so far (*lomber* – *försvaret*) in the trick table | `scoresheet`, `standings`, `trickCount` |
| *medspelare* | a defender's fellow defender | `partner` |
| *kutym* | the table's established way of playing, not a rule; the AI players follow it (`agents/player.md`) | `tablePractice` |

---

## 1. Table, roles and rotation (spel på fyra)

- Four players; seating order medsols is drawn by lot at the start of a parti.
  The first in the drawn order deals first.
- Each deal (giv): the dealer (**given**) is **EH** (efterhand). **FH** (förhand) = left of
  given, **MH** (mellanhand) = left of FH. The player **right of given rests** (vilar) and
  gets no cards.
- The next given is the player left of the current one. A **rond** = four givar (everyone deals once).
- Deal: the player right of given first cuts the pack (*kuperar*, "lyfter ut sig"): lifts a
  random number of cards, at least one, off the top and puts them underneath. Given then
  deals medsols to FH, MH and EH, first 4 cards each, then 3 each until 13 cards remain, so
  each gets 13. The remaining 13 form the **talong** (ordered; top card
  first).
- **Bidding starts with FH. First lead in play is by EH** (always EH, not lomber).
- Play order is medsols, skipping the resting player.

## 2. Färg (trump colours)

- MH "lays Färg": MH shuffles the pack just used (*blandar in sig*) and lays it face down
  between MH and FH with its bottom card showing. That pack lies ready and is dealt in the
  **next** giv; its bottom card, the Färg card, sets this giv's colours. The cut before the
  next deal moves the Färg card anywhere in the pack except the bottom.
- Its suit = **Högsta Färg (hf)**. The other suit of the same colour = **Andra Färg (af,
  "f")**. The two other suits = **Ofärg (of)**.
- Payment factor by trump suit: of ×1, af ×2, hf ×4. Misär ×3. Hope Solo and Royale are
  paid as ofärg.

## 3. The budtabell (Isberget), transcribed from the user's photo

Level π (in p). "AK" = avpassningskonvention code for passing on that bid.

| π | Trumf (Begär family etc.) | Gask | Solo | Other |
|---|---|---|---|---|
| −1 | | Minusgask (AK hahalj; 6 stick / PF) | | |
| 0 | 6-spel = Begär (4h) | Gask på 0 (haja; 7 / GF) | | Gökägg (1a pass lala, 2a pass l; G) |
| 1 | Vingel 6 (3d), Turné 6 (3h), 7-spel (3f) | Gask på 1 (haj; 8 / P) | | tRupp (4a) |
| 4/3 | | | | Gökunge (1a lal, 2a l; G) |
| 2 | Vingel 7 (2dh), Turné 7 (2h), 8-spel (2of) | Gask på 2 (ha; 9 / G) | Solo 6 | Köp 4 (2a; PF), tVupp (3a; P) |
| 3 | Vingel 8 (d2h), Turné 8 (h), 9-spel (2h) | Gask på 3 (ha; 10 / PO) | Solo Petite HS6 / Falsk Misär | Muntergök (1a LL, 2a L; GO) |
| 4 | Tringel 9 (3h) | Gask på 4 (ha; 11 / GO) | Solo 7 | Köp 3 (a; GF), tTupp (2a; P) |
| 6 | 10-spel | Gask på 6 (12) | Solo Grande HS7 / Falsk Misär | Köp 2 (P) |
| 8 | | Gask på 5 (12) | Solo 8 | Köp 1 (G) |
| — | *havsytan* (sea level) | | | |
| 12 | | VIRA | Solo HS8 / Petite Misär | |
| 16 | | | Solo 9 | |
| 24 | | | Solo HS9 / Grande Misär | |
| 32 | | | Solo 10 | |
| 48 | | | Solo Petite HS10 / Misär Ouverte | |
| 64 | | | Solo 11 | |
| 96 | | | Solo Grande HS11 / Misär Ouverte | |
| 128 | | | Solo 12 | |
| 192 | | | Solo Petite HS12 / Mis. Ouv. Royale | |
| 256 | | | Solo VIRA | |
| 384 | | | Solo Grande HS13 / Mis. Ouv. Royale | |

Notes from the table:
- Above havsytan: Π = π + μ, paid between the players (the Pinnar). **μ** = the whole-number
  part of π for the **highest opposing bid** in the bidding, and only when the game is
  played at 12p or higher (otherwise μ = 0). Example: Solo Grande Misär (24p) after an
  opponent's 10-spel (6p) gives Π = 30p. Below havsytan Π = π.
- **Jackpott:** when the game's price P is at least 144p, hemgång lets lomber lift **the whole
  pott** instead of one bet. This needs the pott and the ål: at the start of a parti, and
  whenever the pott drops below three bets, every player puts one bet in the pulla.
  (#27, after 1.0.)
- Vingel is paid double, Tringel triple.
- Modpinnar at betspel; below zero (Minusgask) a betspel pays the Pinnar and a lagt spel none (Fegpinnar), §6.

AK abbreviations: h = håll, d = dubbelhåll, f = håll of which 2 in the Färger, of = håll in
Ofärger, a = antydan (halvgard; "2a" can be replaced by a låggard), l = låggard (äkta
gard), j = jämn hand.
In the Gök cells, "1a" / "2a" name the passer the requirement applies to: Första hand (the
first to pass) and Andra hand (the second). Elsewhere "2a" means two antydan. Capital
letters (Muntergök's LL, L) mark a mandatory requirement. Misär types: G = Grande,
P = Petite, F = Falsk, O = Ouverte.

### 3.1 Håll, garder, jämn hand
- A **håll** in a suit = you end up holding the top remaining card if others draw the suit
  from the top (E; K with 1 lower; D with 2 lower; Kn with 3 lower; 10 with 4 lower …).
  **Only one håll counts per suit.** Holding more times = **dubbelhåll** (counted
  separately). "4h" = håll in all four suits.
- **Låggard** (äkta gard): low card protected enough to duck (e.g. a 2; a 4 with a lower
  card; a 6 with two lower …). Only one låggard counts per suit.
- **Jämn hand:** a givhand **without a singleton and without a suit of 6 or more cards**,
  as on the Isberget photo (the user's rule). Voids are allowed. (The rtf text checks only
  singletons.)

## 4. Bidding

- FH must open (Pass is not an opening). Bidding continues until two players have passed;
  a player who has passed is out. The last bid is the **slutbud**; its bidder is **lomber**.
- Bare names mean the lowest bid of that family: "Gask" from FH = Minusgask; otherwise the
  lowest unsaid Gask level. "Solo" = Solo 6, "Köp" = Köp 4, "Turné" = Turné 6,
  "Vingel" = Vingel 6.
- A bid is **higher** if it is:
  1. any bid on a higher level, or
  2. any **unsaid** bid on the same level as the last bid, or
  3. an already-said bid on the current level, **improved** (Bättre):
     "i Färg" (trump restricted to hf/af) → "i Högsta Färg" (trump = hf). For Gask:
     at the Minusgask level, **Bättre Gask = Misärgask**; at levels 0–4, **Bättre Gask =
     Trumfgask**, and Bättre can be said three times there (Trumfgask → i Färg → i Högsta).
     Without Bättre, lomber chooses trump or misär after the köp.
- **Never färga a bid whose base version hasn't been said** – the unsaid base bid is already
  higher on that level.
- **Värre (i förhand):** FH may take over any already-said bid unchanged ("X i förhand");
  MH may take over EH's bid. EH may not.
- After avpassning, lomber may take the slutbud **larger within its type** (e.g. Gask på 0 →
  Gask på 2, Begär → Sjuspel, Solo 6 → Solo 8, Gökunge → Muntergök) before the köp: to any
  higher bid of the same family. A Solo may go to any higher Solo cell, trumf, misär or Hope
  Solo (Solo 7 → Solo Grande Falsk Misär).

### 4.1 Avpassningskonventioner & böter
- Each pass is checked against the AK for the bid passed on (see table). For Gök the first
  player to pass **on the Gök bid itself** is "Första hand" (1a pass), even if someone passed
  earlier on a non-Gök bid; the next is "Andra hand" (2a pass).
- A pass not meeting the AK is a **Tjuvpass**. Böter apply only when:
  - a **Gök** is played home and the passer did not meet the Gök AK, or
  - a **Gask below Gask på 2** is played home and the passer did not have jämn hand.
- **Böter = one whole bet** that the tjuvpassare puts in the pulla: −36p for the tjuvpassare,
  +12p to each of the other three players (each tjuvpass is its own protocol row).

## 5. Contracts and köp mechanics

Begärspel and Solo: tricks needed = the number in the name (Begär = 6-spel).

- **Begär / N-spel:** lomber names trump (free, or restricted by "i Färg"/"i Högsta Färg")
  **before** the köp; discards any number (0–13) and draws as many **blind from the top**.
  Then Omköp option (see below). Defence then buys (§5.1), then lomber folds or plays.
- **Turné N:** top talong card is turned up; its suit is trump; it must be bought (counts as
  one of the drawn cards).
- **Vingel N:** top two cards turned up; trump is chosen among their suits; both must be
  bought (they count among the drawn cards; may not be discarded). Omvingel needs ≥3 cards
  left (Omturné ≥2, Omtringel ≥4). An Omturné, Omvingel or Omtringel turns up the next
  card(s), which give the new trumf (Omvingel, Omtringel: chosen again among their suits).
- **Gask på n:** lomber keeps **n** givkort (chosen before seeing the talong), kastar the
  rest and takes the **whole talong**. Lomber then chooses **trump** (needs 7+n tricks, but
  Gask på 6 and Gask på 5 need 12 and Vira 13) or the misär type given in the table (misär
  only up to Gask på 4), and only **after choosing** kastar as many cards as were kept,
  down to 13. In misär lomber may kasta fewer and play with more than 13; a Petite misär
  then kastar one more card (12). **Minusgask (−1):** the top talong card is
  turned face down (nerslag), lomber discards the whole hand, takes the other 12, chooses
  the game, then takes the face-down card. **Gask på 0:** no nerslag – whole talong (13).
  No defence köp in Gask.
- **Gök (Gökägg / Gökunge / Muntergök):** misär. Lomber keeps the whole givhand and has the
  whole talong; after the köp lomber kastar (at most) 13 of the 26, so may play with more. **Gökunge:** the talong is laid face up; talong cards
  lomber takes are played **open** in front of lomber; rejected talong cards lie aside face
  up; an equal number of handkort are discarded face down. Gökägg = closed (sluten). No
  defence köp.
- **Köp N (Köpmisär):** lomber buys at least N cards blind from the top (discarding as many).
  Köp 4 and Köp 2 are Petite: after the **last** köp (after any Omköp) lomber may kasta one
  more card and play with 12. Köp 4 and Köp 3 are Falsk: one trick allowed. The defence may then buy, or not, as they wish (the AI defenders follow the
  misär kutym in `agents/player.md`).
- **Solo:** lomber does not buy and **cannot fold**; names trump before the defence köp. A
  Solo bid on a level with both a Solo misär and a Hope Solo (levels 3, 6, 12 …) lets lomber
  choose between them after the bidding (and any *ta större*), before the defence köp. A
  Solo Petite misär kastar its 13th card right after the bidding (Solo has no köp). All
  Solo contracts are in the data; above havsytan μ counts as 0 until #27.
- **Tringel 9:** like Vingel with three turned-up cards (trumf chosen among their suits, all
  three must be bought); 9 tricks; Omtringel needs ≥4 cards left; paid triple.
- **Vira (Gask på 13):** lomber keeps the whole givhand, takes the whole talong, kastar 13;
  trumf only, all 13 tricks.
- **tRupp / tVupp / tTupp (Uppslagsmisär):** misär. 3/2/1 talong cards are turned up and
  can't be bought; lomber buys blind from the rest, then, before the defence köp and any
  Ombyte, swaps in at least one turned-up card (bytkort). The first swapped card allows
  kasting two handkort, the second one more, the third none; lomber may kasta fewer. Rejected
  bytkort and kastade cards lie open (the tuppstjärt). Normally Petite. Ombyte: a new uppslag
  of the same size, a new blind köp from the rest, then at least one swap again; needs one
  card beyond the uppslag left.
  **Höna:** taking the whole uppslag and laying nothing away; plays with 16/15/14 cards (the
  play ends with 3/2/1 left) and is paid double. It happens by itself when the tuppstjärt
  stays empty; lomber doesn't choose or announce it. In the data it is a variant of the Tupp
  contract (its swap's `whenTailEmpty`), not a contract of its own.
- **In the data, mechanisms later (#27):** Tringel, Vira, the Tupp family (with Höna), Hope Solo
  and the Ouverte/Royale misärer.

**Omköp:** after a köp of at least one card (a köp of none is final), lomber may pay one
bet (36p: −36 lomber, +12 to each other player) and buy again, at least one card; may be
**repeated** while enough talong remains: at least 1 card (Begär), N cards (Köp N), 2 (Omturné), 3 (Omvingel), 4 (Omtringel), or one more than the uppslag
(Ombyte). Each Omköp costs as many bets as a hemgång gives (×2 for Vingel, ×3 for Tringel).
Offer it after each köp.

**Fold (lägga spelet):** allowed after the köp and the defence köp, before the first trick
(not in Solo).

### 5.1 Defence köp
- In buying order medsols from lomber, skipping the resting player: **förste försvarare**
  first, then **andre försvarare**. Defenders may kasta any cards; not
  kasta aces or trumps is andre försvararens kutym (`agents/player.md`), not a rule.
- Simulated defenders follow the kutym in `agents/player.md`.

## 6. Play, results and payment

- Normal trick-taking: must follow suit; trumps beat other suits; highest card of the led
  suit wins otherwise. EH leads to the first trick, and the winner of each trick leads to
  the next.
- Play lasts until either side runs out of cards. The defenders always hold 13, so a Petite
  (lomber with 12) plays 12 tricks and the defenders keep one card each; a lomber who keeps
  more cards in misär plays 13 tricks.
- Play stops as soon as hemgång or kodilj is certain. A bet is only certain after the last
  trick. **[Later: claims ("lägga upp"): a player shows their cards and states the result,
  and play goes on if anyone asks for it to be proven.]**
- Trump contract needing T tricks: ≥T = **hemgång**; T−1 = **bet**; ≤T−2 = **kodilj**.
- Misär: Grande = 0 tricks allowed (1 = bet, 2 = kodilj); Falsk = 1 allowed (2 = bet,
  3 = kodilj).
- **Pinnar** = P × factor per defender, where P = Π of the contract (fractions like 4/3 are
  allowed), factor = of ×1, af ×2, hf ×4, misär ×3; Vingel ×2, Tringel ×3.
  - Hemgång: each defender pays Pinnar to lomber.
  - Betspel (played and lost): **Modpinnar** – no Pinnar are paid.
  - Kodilj: lomber pays Pinnar to each defender.
  - Lagt spel: lomber pays Pinnar to each defender.
  - The rule behind the last two: a betspel gets the kinder of paying the Pinnar or not,
    a lagt spel the harsher ("lagt spel can't be punished more mildly than a brave betspel").
    Below zero (**Minusgask**, Π = −1) the Pinnar are negative and paying them is a gain for
    lomber, so it turns around: a played bet pays the Pinnar, as at kodilj (no Modpinnar),
    and a folded one pays none: the Pinnar are zeroed (**Fegpinnar**). As a misär (×3):
    hemgång +30, betspel −30, kodilj −66, lagt spel −36.
- **Betar:** one bet = 36p (spel på fyra), split 12p per other player, the resting player
  included.
  - Hemgång: lomber +36, others −12 each.
  - Bet (betspel or lagt spel): lomber −36, others +12 each.
  - Kodilj: two bets: lomber −72, others +24 each.
  - Vingel: betar doubled. Tringel: tripled.
- Every deal must sum to zero.

## 7. Agent architecture

```
engine (code)  ──view(seat)──▶  player agent (subagent)  ──move──▶  engine
     │                                                               ▲
     └──view(user)──▶ orchestrator / coach ◀──user input──┘
```

- **Engine:** holds full state; enforces legality; computes results and protocol.
- **View for a seat:** own hand; own discards (until first trick played); roles, Färg,
  scores; full bid history; köp counts (how many each player discarded/bought, not which);
  open cards (Turné/Vingel uppslag, Gökunge open talong and lomber's open cards, rejected
  open talong cards); all played tricks. Never other hands or hidden talong.
- **Player agent:** gets view + shared instructions (rules summary + strategy from
  `agents/player.md`); returns **only** a JSON move, e.g. `{"bid":"Sjuspel"}`, `{"pass":true}`,
  `{"discard":["♣K","♥7"]}`, `{"card":"♠Kn"}`, `{"fold":false}`. Illegal → engine re-asks.
- **Coach:** gets only the user's view; produces one suggestion per decision.

## 8. Ågren sakning signals (house convention, not in the rtf)

Read after a defender's **two** sakningar (see the glossary):
- Two different suits, first <7 then higher → weakness in both, strength in the third side
  suit.
- Two different suits, first ≥7 then lower → strength in both, weakness in the third.
- Same rank in two suits → low (<7) = weakness in all, high (≥7) = strength in all.
- Same suit, low then higher → weakness in that suit, strength in the other side suits.
- Same suit, high (≥7) then lower → strength in that suit, weakness in the other side suits.
- Any other combination → no signal.

## 9. Protocol format

Code block; columns = the four players (alphabetical, user's player last). Per giv: header
line with lomber's result + contract (+ trump colour of/f/hf for trump games) under lomber
and `X` under the resting player. Rows: `Pinnarna` (omit if zero), optional `Omköp`,
`Betarna`, optional `Böter`, a single line, `Ställning`. At the end of each rond the line
above `Ställning` is a double line.

```
             Andersson   Bengtsson   Carlsson     Toivo
Giv 1            X      h Vingel 6 of
Pinnarna                     4          –2          –2
Betarna        –24          72         –24         –24
---------------------------------------------------------
Ställning      –24          76         –26         –26
```

Result prefixes: `h` hemgång, `b` bet, `ko` kodilj, `l` lagt spel, with one `m` added per
Omköp (e.g. `hm`, `bmm`).

## 10. Build order

1. Cards, deal, roles, Färg, rotation, protocol output.
2. Trick play + results + payment for Begär/N-spel (with köp, Omköp, fold, defence köp).
3. Budtabell with higher-bid rules, Bättre/Värre, taking larger.
4. Solo; Turné; Vingel.
5. Gask (−1, 0, n).
6. Gök (Ägg, Unge, Munter) and Köpmisär; AK checks and böter.
7. Player agents + coach; then the rest of the budtabell (Tringel, Hope Solo, Ouverte/Royale,
   tRupp/tVupp/tTupp, Vira, havsytan/μ, jackpot).

## 11. Test cases (payment arithmetic – all verified in play)

Spel på fyra, betar 36p. Order: lomber, förste försvarare, andre försvarare, vilande.

| Case | Lomber | Förste försvarare | Andre försvarare | Vilande |
|---|---|---|---|---|
| Begär (Π0) hemgång | +36 | −12 | −12 | −12 |
| Begär betspel | −36 | +12 | +12 | +12 |
| Begär kodilj | −72 | +24 | +24 | +24 |
| Sjuspel af (Π1) hemgång | +40 | −14 | −14 | −12 |
| Sjuspel of kodilj | −74 | +25 | +25 | +24 |
| 8-spel f (Π2) hemgång | +44 | −16 | −16 | −12 |
| Vingel 6 of hemgång | +76 | −26 | −26 | −24 |
| Vingel 6 af lagt spel | −80 | +28 | +28 | +24 |
| Solo 7 of (Π4) hemgång | +44 | −16 | −16 | −12 |
| Solo 8 of (Π8) hemgång | +52 | −20 | −20 | −12 |
| Turné 6 hf hemgång after one Omköp | +8 | −4 | −4 | 0 |
| Gökunge (Π4/3, misär ×3) hemgång, förste försvarare tjuvpassed (böter) | +56 | −52 | −4 | 0 |
| Köp 4 betspel | −36 | +12 | +12 | +12 |
| Minusgask misär (Π−1, ×3) hemgång | +30 | −9 | −9 | −12 |
| Minusgask misär betspel | −30 | +9 | +9 | +12 |
| Minusgask misär kodilj | −66 | +21 | +21 | +24 |
| Minusgask misär lagt spel | −36 | +12 | +12 | +12 |

The Gökunge row includes böter: förste försvarare pays one bet for the failed tjuvpass
(−36 to them, +12 to each other player, §4.1). Without them it is +44 −16 −16 −12.
The Minusgask rows are from the rule document's own figures (30p, 66p, 36p), confirmed by the
user, not yet from play.

Full-deal regression test (Gökunge, user = lomber, hemgång with 0 tricks):
- Färg card ♦E (hf ♦, af ♥). Given Carlsson (EH), FH Toivo, MH Andersson, Bengtsson rests.
- Toivo: ♣K D 10 9 3 ♥E D 2 ♠D 6 2 ♦9 4
- Andersson: ♣8 7 4 ♥K 6 ♠Kn 8 5 ♦E D 8 7 6
- Carlsson: ♣Kn 5 2 ♥Kn 10 9 8 5 3 ♠10 9 ♦Kn 2
- Talong (top first): ♥4 ♦5 ♣6 ♣E ♥7 ♦3 ♦10 ♠7 ♠E ♦K ♠K ♠4 ♠3
- Bidding: Toivo Begär, Andersson Begär i Färg, Carlsson Pass, Toivo Ägg,
  Andersson Begär i Högsta Färg, Toivo Gökunge, Andersson Pass (tjuvpass → böter).
- Köp: Toivo takes ♠E K 7 4 3, ♥4, ♦3 (open); discards ♣K D 10 9, ♥E D, ♦9.
  Playing hand: ♣3 ♥4 2 ♠E K D 7 6 4 3 2 ♦4 3 – unbeatable with correct play
  (saka ♣3 at the first opportunity).

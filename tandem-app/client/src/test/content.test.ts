import { describe, expect, it } from "vitest";
import { dealRound, setFor, similarity } from "@/lib/content";
import { WORDS, splitMeaning } from "@/lib/words";
import { TOTAL_ROUNDS } from "@/lib/room";

describe("word pool", () => {
  it("has all 340 words from the four files", () => expect(WORDS).toHaveLength(340));
  it("has true, false and half friends", () => {
    expect(new Set(WORDS.map((w) => w.relation))).toEqual(new Set(["true", "false", "partial"]));
  });
  it("splits 'JP: x; ZH: y' meanings", () => {
    expect(splitMeaning("JP: letter; ZH: toilet paper")).toEqual({ ja: "letter", zh: "toilet paper" });
    expect(splitMeaning("political party")).toEqual({ ja: "political party", zh: "political party" });
  });
});

describe("dealing", () => {
  it("deals 10 cards per game", () => expect(TOTAL_ROUNDS).toBe(10));
  it("never repeats a card within a game", () => {
    const seen: number[] = [];
    for (let i = 0; i < 10; i++) seen.push(dealRound(Math.floor(Math.random() * 1e9), seen).word.id);
    expect(new Set(seen).size).toBe(10);
  });
  it("every word gives 4 unique choices with the right meaning, in both directions", () => {
    for (let n = 0; n < WORDS.length; n++) {
      const r = dealRound(n);
      const ja = setFor(r, "zh2ja"), zh = setFor(r, "ja2zh");
      expect(new Set(ja.options.map((o) => o.toLowerCase())).size).toBe(4);
      expect(new Set(zh.options.map((o) => o.toLowerCase())).size).toBe(4);
      expect(ja.options[ja.correct]).toBe(r.word.ja);
      expect(zh.options[zh.correct]).toBe(r.word.zh);
    }
  });
  it("false friends always include the other language's meaning as a trap", () => {
    for (let n = 0; n < WORDS.length; n++) {
      const r = dealRound(n);
      if (r.word.relation !== "false") continue;
      expect(setFor(r, "zh2ja").options).toContain(r.word.zh);
      expect(setFor(r, "ja2zh").options).toContain(r.word.ja);
    }
  });
  it("手紙: Chinese speakers see 'toilet paper' as the trap", () => {
    const n = WORDS.findIndex((w) => w.form === "手紙");
    const ja = setFor(dealRound(n), "zh2ja");
    expect(ja.options[ja.correct]).toBe("letter");
    expect(ja.options).toContain("toilet paper");
  });
});

describe("similarity meter", () => {
  it("counts the share of true friends among the cards seen", () => {
    expect(similarity([{ relation: "true" }, { relation: "false" }, { relation: "partial" }, { relation: "true" }]).pct).toBe(50);
  });
});

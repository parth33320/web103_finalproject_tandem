import { describe, expect, it } from "vitest";
import { dealRound, dealWord, setFor, similarity, similaritySentence } from "@/lib/content";
import { WORDS, WORD_ROWS, fromRow, toWord, validateWord, type Word } from "@/lib/words";
import { MASTER_AFTER as CLIENT_MASTER_AFTER } from "@/lib/api";
import { wordPool } from "@/data/wordPool.js";
// @ts-expect-error plain JS server module
import { featuredRounds, practiceDeck, MASTER_AFTER } from "../../../server/room-logic.js";

describe("practice games", () => {
  const byForm = (f: string) => WORDS.find((w) => w.form === f)!;
  const traps = ["手紙", "切手", "部屋"].map(byForm);

  it("deals every trap word once, fills the game to 10 and marks only traps", () => {
    const deck: Word[] = practiceDeck(traps, WORDS, 10);
    expect(deck).toHaveLength(10);
    expect(new Set(deck.map((w) => w.id)).size).toBe(10);
    expect(deck.filter((w) => w.trap).map((w) => w.form).sort()).toEqual(["切手", "手紙", "部屋"].sort());
  });
  it("fills with neighbors: the same kind of word as the traps", () => {
    const kinds = new Set(traps.map((w) => w.relation));
    const deck: Word[] = practiceDeck(traps, WORDS, 10);
    expect(deck.filter((w) => !w.trap).every((w) => kinds.has(w.relation))).toBe(true);
  });
  it("prefers neighbors that share a character with a trap word", () => {
    const one = [byForm("手紙")];
    const deck: Word[] = practiceDeck(one, WORDS, 10, () => 0.5);
    const sharing = WORDS.filter((w) => w.id !== one[0]!.id && w.relation === one[0]!.relation && [...w.form].some((c) => "手紙".includes(c)));
    const fill = deck.filter((w) => !w.trap);
    // Every same-kind word that shares a character is dealt before any that doesn't (up to the 9 free cards).
    expect(fill.filter((w) => sharing.some((s) => s.id === w.id)).length).toBe(Math.min(9, sharing.length));
  });
  it("with 10+ trap words, the game is only trap words", () => {
    const many = WORDS.slice(0, 12);
    expect((practiceDeck(many, WORDS, 10) as Word[]).every((w) => w.trap)).toBe(true);
  });
  it("client and server agree on how many right answers master a word", () => expect(CLIENT_MASTER_AFTER).toBe(MASTER_AFTER));
});

describe("similarity meter sentence", () => {
  it("uses singular and plural correctly", () => {
    expect(similaritySentence({ total: 10, same: 3, partial: 1, different: 6 }))
      .toBe("Of the 10 words you saw, 3 meant the same in Chinese and Japanese, 1 was a half friend and 6 were false friends.");
    expect(similaritySentence({ total: 10, same: 8, partial: 0, different: 1 }))
      .toBe("Of the 10 words you saw, 8 meant the same in Chinese and Japanese, 0 were half friends and 1 was a false friend.");
  });
  it("matches what the meter counts", () => {
    expect(similaritySentence(similarity(WORDS.slice(0, 10)))).toMatch(/^Of the 10 words you saw/);
  });
});

const good = { form: "便宜", reading: "bengi", pinyin: "piányi", meaning_ja: "convenience", meaning_zh: "cheap", relation: "false" };

describe("word validation (shared by the form and the server)", () => {
  it("accepts a real false friend", () => expect(validateWord(good)).toEqual({}));
  it("requires every field on create", () => {
    expect(Object.keys(validateWord({})).sort()).toEqual(["form", "meaning_ja", "meaning_zh", "pinyin", "reading", "relation"]);
  });
  it("only allows Chinese characters or kana as the word", () => {
    expect(validateWord({ ...good, form: "abc" })["form"]).toBeDefined();
    expect(validateWord({ ...good, form: "手紙手紙手紙手紙手" })["form"]).toBeDefined(); // 9 characters
    expect(validateWord({ ...good, form: "ごみ箱" })["form"]).toBeUndefined();
  });
  it("true friends must mean the same thing; false friends must not", () => {
    expect(validateWord({ ...good, relation: "true" })["meaning_zh"]).toMatch(/same/);
    expect(validateWord({ ...good, meaning_zh: "Convenience" })["meaning_zh"]).toMatch(/different/);
  });
  it("allows tone marks in pinyin and macrons in romaji", () => {
    expect(validateWord({ ...good, reading: "benkyō", pinyin: "miǎnqiǎng" })).toEqual({});
  });
  it("an edit (partial) only checks the fields sent", () => expect(validateWord({ meaning_ja: "favor" }, true)).toEqual({}));
});

describe("community words in the deck", () => {
  it("a built-in row converts back to the same card", () => {
    expect(fromRow(WORD_ROWS[0]!)).toEqual(toWord(wordPool[0]!));
  });
  it("a community word is dealt with four unique choices and its trap", () => {
    const w = { ...fromRow({ id: 1001, form: "便宜", zh_form: "便宜", reading: "bengi", pinyin: "piányi", meaning_ja: "convenience", meaning_zh: "cheap", relation: "false", note: null }), by: "alice" };
    const r = dealWord(w, [...WORDS, w], 7);
    const ja = setFor(r, "zh2ja");
    expect(new Set(ja.options).size).toBe(4);
    expect(ja.options[ja.correct]).toBe("convenience");
    expect(ja.options).toContain("cheap");
    expect(r.word.by).toBe("alice");
  });
  it("dealRound can deal from a bigger pool without repeats", () => {
    const extra = { ...WORDS[0]!, id: 2000, form: "手袋" };
    const pool = [...WORDS, extra];
    const seen: number[] = [];
    for (let i = 0; i < 10; i++) seen.push(dealRound(Math.floor(Math.random() * 1e9), seen, pool).word.id);
    expect(new Set(seen).size).toBe(10);
  });
  it("features at most 2 community words, never on round 1", () => {
    for (let n = 0; n < 50; n++) {
      const rounds = featuredRounds(5, 10);
      expect(rounds.length).toBe(2);
      expect(rounds.every((r: number) => r >= 2 && r <= 10)).toBe(true);
      expect(new Set(rounds).size).toBe(2);
    }
    expect(featuredRounds(0, 10)).toEqual([]);
    expect(featuredRounds(1, 10)).toHaveLength(1);
  });
});

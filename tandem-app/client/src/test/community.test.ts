import { describe, expect, it } from "vitest";
import { dealRound, dealWord, setFor } from "@/lib/content";
import { WORDS, WORD_ROWS, fromRow, toWord, validateWord } from "@/lib/words";
import { wordPool } from "@/data/wordPool.js";
// @ts-expect-error plain JS server module
import { featuredRounds } from "../../../server/room-logic.js";

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

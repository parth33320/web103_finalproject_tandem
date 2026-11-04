import { describe, expect, it } from "vitest";

import { LINES, LANGS } from "@/lib/host";

describe("host lines", () => {
  it("every language can read the question and announce the answer", () => {
    for (const { code } of LANGS) {
      const lines = LINES[code];
      expect(lines.question("手紙", ["letter", "train", "map", "teacher"])).toContain("手紙");
      expect(lines.answer("letter")).toContain("letter");
    }
  });
});

import { pickFallback, splitSentences } from "@/lib/host";
describe("voice reliability", () => {
  it("splits long text into sentences", () => {
    expect(splitSentences("Hello there. What does 手紙 mean? Pick one!")).toEqual(["Hello there.", "What does 手紙 mean?", "Pick one!"]);
  });
  it("falls back to an on-device voice that has not failed", () => {
    const v = [{ name: "A Online", localService: false }, { name: "B", localService: true }, { name: "C", localService: true }];
    expect(pickFallback(v, "A Online", ["B"])?.name).toBe("C");
  });
});

import { splitScripts } from "@/lib/host";
describe("mixed-language reading", () => {
  it("separates the game word from the English sentence", () => {
    expect(splitScripts("The word is 手紙. In Japanese")).toEqual([
      { text: "The word is", cjk: false }, { text: "手紙", cjk: true }, { text: ". In Japanese", cjk: false },
    ]);
  });
});

import { HINT_COST, eliminated, pointsFor } from "@/lib/hints";
describe("clues", () => {
  it("costs 20 / 30 / 50, category the most", () => {
    expect(HINT_COST).toEqual({ eliminate: 20, example: 30, category: 50 });
  });
  it("lowers points and never goes below 0", () => {
    expect(pointsFor([])).toBe(100);
    expect(pointsFor(["category"])).toBe(50);
    expect(pointsFor(["eliminate", "example", "category"])).toBe(0);
  });
  it("eliminate removes exactly two wrong cards, never the right one", () => {
    for (let r = 1; r < 30; r++) for (let c = 0; c < 4; c++) {
      const g = eliminated("ABCDE", r, c);
      expect(g).toHaveLength(2);
      expect(g).not.toContain(c);
    }
  });
});

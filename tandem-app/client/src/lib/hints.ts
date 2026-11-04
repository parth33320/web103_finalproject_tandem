import { hash } from "./words";

export type HintKind = "eliminate" | "example" | "category";
export const HINT_COST: Record<HintKind, number> = { eliminate: 20, example: 30, category: 50 };
export const HINT_ORDER: HintKind[] = ["eliminate", "example", "category"];
export const BASE_POINTS = 100;

/** Points a correct answer earns after the clues used this round. */
export function pointsFor(used: HintKind[]): number {
  const cost = [...new Set(used)].reduce((s, k) => s + HINT_COST[k], 0);
  return Math.max(0, BASE_POINTS - cost);
}

/** Two wrong option indexes to remove, the same for everyone in a room/round. */
export function eliminated(code: string, round: number, correct: number): number[] {
  const wrong = [0, 1, 2, 3].filter((i) => i !== correct);
  const keep = wrong[hash(`${code}-${round}-elim`) % wrong.length]!;
  return wrong.filter((i) => i !== keep);
}

export const HINT_LABEL: Record<HintKind, { icon: string; title: string; what: string }> = {
  eliminate: { icon: "✂", title: "Eliminate", what: "removes two wrong answers" },
  example: { icon: "文", title: "Reading", what: "shows how the word is pronounced in both languages" },
  category: { icon: "◈", title: "Category", what: "tells you if it's a true, false or half friend" },
};

import { wordPool, type PoolWord } from "@/data/wordPool.js";

export type Relation = "true" | "false" | "partial";
export type Word = {
  id: number;
  /** Characters as shown on the card. */
  form: string;
  /** Chinese form (the pool uses one shared form). */
  zhForm: string;
  /** Japanese reading (romaji). */
  reading: string;
  pinyin: string;
  /** Japanese meaning in English. */
  ja: string;
  /** Chinese meaning in English. */
  zh: string;
  relation: Relation;
  kind?: "falseFriend";
  /** Category clue: how the two languages relate. */
  category: string;
  /** Reading clue: how it's pronounced in both languages. */
  example: string;
  facts: string[];
};

const REL: Record<PoolWord["relation"], Relation> = { true_friend: "true", false_friend: "false", half_friend: "partial" };
const CATEGORY: Record<Relation, string> = {
  true: "a true friend — trust your instinct",
  false: "a false friend — your instinct is a trap",
  partial: "a half friend — related, but shifted",
};

/** "JP: letter; ZH: toilet paper" -> { ja: "letter", zh: "toilet paper" }. True friends share one meaning. */
export function splitMeaning(m: string): { ja: string; zh: string } {
  const hit = /JP:\s*(.+?)\s*;\s*ZH:\s*(.+)$/i.exec(m.trim());
  if (hit) return { ja: hit[1]!.trim(), zh: hit[2]!.trim().replace(/[.;]+$/, "") };
  const same = m.trim().replace(/[.;]+$/, "");
  return { ja: same, zh: same };
}

export function toWord(p: PoolWord): Word {
  const { ja, zh } = splitMeaning(p.meaning_en);
  const relation = REL[p.relation];
  return {
    id: p.id, form: p.kanji, zhForm: p.kanji, reading: p.jp_reading, pinyin: p.zh_pinyin, ja, zh, relation,
    category: CATEGORY[relation],
    example: `Japanese: ${p.jp_reading} · Chinese: ${p.zh_pinyin}`,
    facts: [p.fun_fact],
  };
}

export const WORDS: Word[] = wordPool.map(toWord);

export const RELATION_LABEL: Record<Relation, string> = { true: "True friend", false: "False friend", partial: "Half friend" };

// Deterministic hash used for shuffles and per-player facts.
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}
export function personalFact(word: Word, player: string, round: number) {
  return word.facts[hash(`${player}:${round}`) % word.facts.length]!;
}

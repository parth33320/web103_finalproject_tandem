// Round content built from the word pool (src/data/wordPool.js).
// The Render server bundles this same file as render-server/content.js — regenerate after edits.
import { WORDS, hash, type Word } from "./words";
// The server also needs these (seeding the words table, dealing community words, validating new words).
export { WORDS, WORD_ROWS, fromRow, validateWord } from "./words";

export type OptionSet = { options: string[]; correct: number; drop: number[] };
/** Top-level options = Japanese meaning (Chinese speakers guessing Japanese, and English mode).
 *  `zh` = Chinese meaning (Japanese speakers guessing Chinese). */
export type RoundContent = OptionSet & { word: Word; zh: OptionSet };
export type Direction = "zh2ja" | "ja2zh" | "en";

/** The option set a player sees for their chosen direction. */
export const setFor = (c: Pick<RoundContent, "options" | "correct" | "drop" | "zh">, dir: Direction): OptionSet =>
  dir === "ja2zh" ? c.zh : { options: c.options, correct: c.correct, drop: c.drop };

function pickDrop(correct: number, n: number) {
  const wrong = [0, 1, 2, 3].filter((i) => i !== correct);
  const keep = wrong[n % 3]!;
  return wrong.filter((i) => i !== keep);
}

/** Four English choices. For false/half friends, one wrong choice is always the other language's meaning (the trap). */
export function optionSet(answer: string, trap: string | null, pool: string[], n: number, salt: string): OptionSet {
  const norm = (x: string) => x.trim().toLowerCase();
  const picks: string[] = [];
  if (trap && norm(trap) !== norm(answer)) picks.push(trap);
  let k = hash(`${n}-${salt}-d`);
  for (let tries = 0; picks.length < 3 && tries < 500; tries++) {
    const o = pool[k % pool.length]!;
    if (norm(o) !== norm(answer) && !picks.some((p) => norm(p) === norm(o))) picks.push(o);
    k = (Math.imul(k, 31) + 7) >>> 0;
  }
  const correct = hash(`${n}-${salt}-c`) % 4;
  const options = [...picks];
  options.splice(correct, 0, answer);
  return { options, correct, drop: pickDrop(correct, hash(`${n}-${salt}-e`)) };
}

/** One card from the pool (built-in words by default), skipping word ids already dealt this game (`avoid`). */
export function dealRound(n: number, avoid: number[] = [], pool: Word[] = WORDS): RoundContent {
  let idx = n % pool.length;
  for (let t = 0; t < pool.length && avoid.includes(pool[idx]!.id); t++) idx = (idx + 1) % pool.length;
  return dealWord(pool[idx]!, pool, n);
}

/** The card for one chosen word; wrong choices come from the other words in `pool`. */
export function dealWord(w: Word, pool: Word[], n: number): RoundContent {
  const others = pool.filter((x) => x.id !== w.id);
  const trapJa = w.relation === "true" ? null : w.zh;
  const trapZh = w.relation === "true" ? null : w.ja;
  const ja = optionSet(w.ja, trapJa, others.map((x) => x.ja), n, "ja");
  const zh = optionSet(w.zh, trapZh, others.map((x) => x.zh), n, "zh");
  return { word: { ...w, kind: "falseFriend" }, ...ja, zh };
}

/** Share of the words seen that are true friends (same meaning in both languages). */
export function similarity(seen: { relation: string }[]) {
  const counts = { true: 0, partial: 0, false: 0 } as Record<string, number>;
  for (const w of seen) counts[w.relation] = (counts[w.relation] ?? 0) + 1;
  const same = counts["true"] ?? 0;
  return { total: seen.length, same, partial: counts["partial"] ?? 0, different: counts["false"] ?? 0, pct: seen.length ? Math.round((same / seen.length) * 100) : 0 };
}

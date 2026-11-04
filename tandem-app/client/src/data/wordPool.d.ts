export type PoolRelation = "true_friend" | "false_friend" | "half_friend";
export type PoolWord = { id: number; kanji: string; jp_reading: string; zh_pinyin: string; meaning_en: string; relation: PoolRelation; fun_fact: string };
export declare const wordPool: PoolWord[];

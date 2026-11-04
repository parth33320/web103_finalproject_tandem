import { edgeVoiceFor } from "./edge-voices";

export type Lang = "en" | "zh" | "ja" | "es" | "ar" | "fr";
export const EDGE_TTS_ENABLED = Boolean(import.meta.env["VITE_API_URL"]);

export const LANGS: { code: Lang; label: string; bcp: string }[] = [
  { code: "en", label: "English", bcp: "en-US" },
  { code: "zh", label: "中文", bcp: "zh-CN" },
  { code: "ja", label: "日本語", bcp: "ja-JP" },
  { code: "es", label: "Español", bcp: "es-ES" },
  { code: "ar", label: "العربية", bcp: "ar-SA" },
  { code: "fr", label: "Français", bcp: "fr-FR" },
];

type Lines = {
  welcome: (n: string) => string;
  round: (r: number) => string;
  question: (form: string, options: string[]) => string;
  answer: (a: string) => string;
  tenLeft: string;
  threeLeft: string;
  correct: string;
  wrong: string;
  timeUp: string;
  won: (n: string) => string;
  lost: (n: string) => string;
  spectate: string;
  promoted: string;
  privateHost: string;
  hintEliminate: string;
  hintExample: string;
  hintCategory: (c: string) => string;
};

export const LINES: Record<Lang, Lines> = {
  en: {
    welcome: (n) => `Welcome to the table, ${n}. I'm your personal host tonight. Shall we deal?`,
    round: (r) => `Round ${r}. Read the card carefully.`,
    question: (form, o) => `The word is ${form}. Is it A, ${o[0]}? B, ${o[1]}? C, ${o[2]}? Or D, ${o[3]}?`,
    answer: (a) => `The correct answer is ${a}.`,
    tenLeft: "Ten seconds left.", threeLeft: "Hurry, 3 seconds left!",
    correct: "Correct! Beautifully played.", wrong: "Not quite. That one was a trap.", timeUp: "Time's up.",
    won: (n) => `Congratulations, ${n}. You won the game!`, lost: (n) => `Well fought, ${n}, but you did not win this time.`,
    spectate: "The game is already underway. Watch this round, and you'll join the next one.",
    promoted: "You're in! Take your seat.",
    hintEliminate: "Two wrong cards are gone.", hintExample: "Here is how it's read.", hintCategory: (c) => `Category: ${c}.`,
    privateHost: "Every player has their own private host. Your voice and language can differ from everyone else's.",
  },
  zh: {
    welcome: (n) => `欢迎入座，${n}。我是你今晚的专属主持人。我们开始发牌吧？`,
    round: (r) => `第${r}轮。请仔细阅读卡片。`,
    question: (form, o) => `这个词是${form}。是A，${o[0]}？B，${o[1]}？C，${o[2]}？还是D，${o[3]}？`,
    answer: (a) => `正确答案是${a}。`,
    tenLeft: "还剩十秒。", threeLeft: "快点，还剩三秒！",
    correct: "答对了！漂亮。", wrong: "不对哦，那是个陷阱。", timeUp: "时间到。",
    won: (n) => `恭喜你，${n}，你赢了！`, lost: (n) => `${n}，打得不错，但这次没有赢。`,
    spectate: "游戏已经开始。先观看这一轮，下一轮你就能加入。",
    promoted: "轮到你了！请入座。",
    hintEliminate: "两张错误的卡片已移除。", hintExample: "这是它的读音。", hintCategory: (c) => `类别：${c}。`,
    privateHost: "每位玩家都有自己的专属主持人，声音和语言都可以不同。",
  },
  ja: {
    welcome: (n) => `ようこそ、${n}さん。今夜のあなた専属のホストです。さあ、カードを配りましょう。`,
    round: (r) => `第${r}ラウンド。カードをよく読んでください。`,
    question: (form, o) => `言葉は${form}です。A、${o[0]}？B、${o[1]}？C、${o[2]}？それともD、${o[3]}？`,
    answer: (a) => `正解は${a}です。`,
    tenLeft: "残り十秒です。", threeLeft: "急いで、残り三秒！",
    correct: "正解！お見事です。", wrong: "残念、それは罠でした。", timeUp: "時間切れです。",
    won: (n) => `おめでとうございます、${n}さん。あなたの勝ちです！`, lost: (n) => `${n}さん、健闘しましたが、今回は負けです。`,
    spectate: "ゲームはすでに始まっています。このラウンドを観戦して、次から参加しましょう。",
    promoted: "参加できます！席についてください。",
    hintEliminate: "間違いのカードを二枚消しました。", hintExample: "読み方はこちらです。", hintCategory: (c) => `カテゴリー：${c}。`,
    privateHost: "プレイヤーごとに専属ホストがいます。声も言語も人によって違っていいのです。",
  },
  es: {
    welcome: (n) => `Bienvenido a la mesa, ${n}. Soy tu anfitrión personal esta noche. ¿Repartimos?`,
    round: (r) => `Ronda ${r}. Lee la carta con atención.`,
    question: (form, o) => `La palabra es ${form}. ¿Es A, ${o[0]}? ¿B, ${o[1]}? ¿C, ${o[2]}? ¿O D, ${o[3]}?`,
    answer: (a) => `La respuesta correcta es ${a}.`,
    tenLeft: "Quedan diez segundos.", threeLeft: "¡Rápido, quedan 3 segundos!",
    correct: "¡Correcto! Muy bien jugado.", wrong: "No exactamente. Era una trampa.", timeUp: "Se acabó el tiempo.",
    won: (n) => `¡Felicidades, ${n}! ¡Has ganado!`, lost: (n) => `Buena partida, ${n}, pero esta vez no ganaste.`,
    spectate: "La partida ya empezó. Mira esta ronda y entrarás en la siguiente.",
    promoted: "¡Ya estás dentro! Toma asiento.",
    hintEliminate: "Dos cartas incorrectas han desaparecido.", hintExample: "Así se pronuncia.", hintCategory: (c) => `Categoría: ${c}.`,
    privateHost: "Cada jugador tiene su propio anfitrión privado, con voz e idioma distintos.",
  },
  ar: {
    welcome: (n) => `أهلاً بك على الطاولة يا ${n}. أنا مضيفك الخاص الليلة. هل نبدأ التوزيع؟`,
    round: (r) => `الجولة ${r}. اقرأ البطاقة بعناية.`,
    question: (form, o) => `الكلمة هي ${form}. هل هي A، ${o[0]}؟ B، ${o[1]}؟ C، ${o[2]}؟ أم D، ${o[3]}؟`,
    answer: (a) => `الإجابة الصحيحة هي ${a}.`,
    tenLeft: "بقيت عشر ثوانٍ.", threeLeft: "أسرع، بقيت ثلاث ثوانٍ!",
    correct: "إجابة صحيحة! أحسنت.", wrong: "ليس تماماً. كانت تلك خدعة.", timeUp: "انتهى الوقت.",
    won: (n) => `تهانينا يا ${n}، لقد فزت!`, lost: (n) => `أداء جيد يا ${n}، لكنك لم تفز هذه المرة.`,
    spectate: "اللعبة بدأت بالفعل. شاهد هذه الجولة وستنضم في الجولة التالية.",
    promoted: "حان دورك! تفضل بالجلوس.",
    hintEliminate: "تمت إزالة بطاقتين خاطئتين.", hintExample: "هكذا تُقرأ.", hintCategory: (c) => `الفئة: ${c}.`,
    privateHost: "لكل لاعب مضيف خاص، ويمكن أن يختلف الصوت واللغة من لاعب لآخر.",
  },
  fr: {
    welcome: (n) => `Bienvenue à la table, ${n}. Je suis votre hôte personnel ce soir. On distribue ?`,
    round: (r) => `Manche ${r}. Lisez bien la carte.`,
    question: (form, o) => `Le mot est ${form}. Est-ce A, ${o[0]} ? B, ${o[1]} ? C, ${o[2]} ? Ou D, ${o[3]} ?`,
    answer: (a) => `La bonne réponse est ${a}.`,
    tenLeft: "Plus que dix secondes.", threeLeft: "Vite, plus que 3 secondes !",
    correct: "Exact ! Joliment joué.", wrong: "Pas tout à fait. C'était un piège.", timeUp: "Temps écoulé.",
    won: (n) => `Félicitations, ${n}, vous avez gagné !`, lost: (n) => `Bien joué, ${n}, mais pas de victoire cette fois.`,
    spectate: "La partie a commencé. Regardez cette manche, vous jouerez la suivante.",
    promoted: "C'est à vous ! Prenez place.",
    hintEliminate: "Deux mauvaises cartes ont disparu.", hintExample: "Voici comment il se lit.", hintCategory: (c) => `Catégorie : ${c}.`,
    privateHost: "Chaque joueur a son propre hôte privé, avec une voix et une langue différentes.",
  },
};

export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
}

const FAILED_KEY = "tandem.failedVoices.v2";
export function failedVoices(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(FAILED_KEY) || "[]"); } catch { return []; }
}
function markFailed(name: string) {
  const f = failedVoices();
  try { if (!f.includes(name)) localStorage.setItem(FAILED_KEY, JSON.stringify([...f, name])); } catch { /* Storage can be disabled. */ }
}

/** Split long text into sentence-sized chunks so browsers don't cut speech off. */
export function splitSentences(text: string, max = 160): string[] {
  const parts = text.match(/[^.!?。！？؟…]+[.!?。！？؟…]*/g)?.map((p) => p.trim()).filter(Boolean) ?? [];
  const out: string[] = [];
  for (const p of parts.length ? parts : [text.trim()]) {
    if (p.length <= max) { out.push(p); continue; }
    for (const c of p.split(/(?<=[,，、;；])\s*/)) {
      for (let i = 0; i < c.length; i += max) out.push(c.slice(i, i + max));
    }
  }
  return out.filter(Boolean);
}

type VoiceLike = { name: string; localService: boolean };
/** Pick a reliable backup: an on-device voice that isn't the failing one and hasn't failed before. */
export function pickFallback<T extends VoiceLike>(voices: T[], failing: string, failed: string[] = []): T | undefined {
  const ok = voices.filter((v) => v.name !== failing && !failed.includes(v.name));
  return ok.find((v) => v.localService) ?? ok[0];
}

export type SpeakResult = { ok: boolean; usedFallback: boolean; voice?: string | undefined };
let token = 0;
let currentAudio: HTMLAudioElement | null = null;
let currentRequest: AbortController | null = null;
let finishCurrent: (() => void) | null = null;

const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
/** Split text into runs of CJK characters vs everything else, so each run can use a voice that can actually say it. */
export function splitScripts(text: string): { text: string; cjk: boolean }[] {
  const out: { text: string; cjk: boolean }[] = [];
  let buf = "", mode: boolean | null = null;
  for (const ch of text) {
    const isC: boolean = CJK.test(ch) || (mode === true && /[\u3000-\u303f\uff01-\uff0f\uff1a-\uff1f、。！？]/.test(ch));
    if (mode === null || isC === mode) { buf += ch; mode = mode ?? isC; continue; }
    if (buf.trim()) out.push({ text: buf.trim(), cjk: mode });
    buf = ch; mode = isC;
  }
  if (buf.trim()) out.push({ text: buf.trim(), cjk: !!mode });
  return out;
}

async function playEdge(text: string, lang: Lang, preferred: string | undefined, my: number): Promise<boolean> {
  const base = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "");
  if (!base || my !== token) return false;
  const controller = new AbortController();
  currentRequest = controller;
  const timeout = setTimeout(() => controller.abort(), 20000);
  let url: string | undefined;
  try {
    const response = await fetch(`${base}/api/tts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang, voice: edgeVoiceFor(lang, preferred) }), signal: controller.signal,
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("audio/")) return false;
    const blob = await response.blob();
    if (!blob.size || my !== token) return false;
    url = URL.createObjectURL(blob);
    return await new Promise<boolean>((resolve) => {
      const audio = new Audio(url);
      currentAudio = audio;
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(playbackTimeout);
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
        if (currentAudio === audio) { currentAudio = null; finishCurrent = null; }
        resolve(ok);
      };
      const playbackTimeout = setTimeout(() => finish(false), 60000);
      finishCurrent = () => finish(false);
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));
    });
  } catch { return false; }
  finally {
    clearTimeout(timeout);
    if (currentRequest === controller) currentRequest = null;
    if (url) URL.revokeObjectURL(url);
  }
}

function sayOnce(text: string, bcp: string, voice: SpeechSynthesisVoice | undefined, my: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (my !== token) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? bcp;
    if (voice) u.voice = voice;
    u.rate = 0.98;
    const t0 = Date.now();
    let started = false, done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; clearTimeout(t); clearTimeout(endTimeout); if (finishCurrent === cancel) finishCurrent = null; resolve(ok); } };
    const cancel = () => finish(false);
    finishCurrent = cancel;
    const t = setTimeout(() => { if (!started) { finish(false); window.speechSynthesis.cancel(); } }, 5000);
    const endTimeout = setTimeout(() => { finish(false); window.speechSynthesis.cancel(); }, 60000);
    u.onstart = () => { started = true; };
    // Some online voices never fire onstart; treat a real-length playback as success.
    u.onend = () => finish(started || Date.now() - t0 > 400 || my !== token);
    u.onerror = () => finish(false);
    try { window.speechSynthesis.speak(u); } catch { finish(false); }
  });
}

/** Edge on Render first; same-language browser voice as backup. */
async function sayIn(text: string, lang: Lang, preferred: string | undefined, my: number): Promise<{ ok: boolean; fallback: boolean }> {
  if (EDGE_TTS_ENABLED && await playEdge(text, lang, preferred, my)) return { ok: true, fallback: false };
  if (my !== token) return { ok: false, fallback: false };
  const bcp = LANGS.find((l) => l.code === lang)?.bcp ?? "en-US";
  const all = voicesFor(lang);
  const failed = failedVoices();
  const voice = all.find((x) => x.name === preferred && !failed.includes(x.name))
    ?? all.find((x) => x.localService && !failed.includes(x.name))
    ?? all.find((x) => !failed.includes(x.name));
  if (voice) {
    if (await sayOnce(text, bcp, voice, my)) return { ok: true, fallback: EDGE_TTS_ENABLED || (voice.name !== preferred && !!preferred) };
    if (my !== token) return { ok: true, fallback: false };
    markFailed(voice.name);
    const backup = pickFallback(all, voice.name, failedVoices());
    if (backup && (await sayOnce(text, bcp, backup, my))) return { ok: true, fallback: true };
    if (backup) markFailed(backup.name);
  }
  if (my !== token) return { ok: true, fallback: false };
  return { ok: false, fallback: true };
}

export function stopSpeaking() {
  token++;
  currentRequest?.abort();
  currentRequest = null;
  finishCurrent?.();
  finishCurrent = null;
  currentAudio?.pause();
  currentAudio = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

export async function speak(text: string, lang: Lang, voiceName?: string, muted?: boolean): Promise<SpeakResult> {
  if (typeof window === "undefined") return { ok: false, usedFallback: false };
  const synth = window.speechSynthesis;
  const wasSpeaking = synth?.speaking || synth?.pending;
  stopSpeaking();
  if (muted) return { ok: false, usedFallback: false };
  const my = token;
  if (wasSpeaking) {
    await new Promise((r) => setTimeout(r, 150));
  }
  const hostIsCjk = lang === "zh" || lang === "ja";
  let ok = true, usedFallback = false;
  for (const run of hostIsCjk ? [{ text, cjk: false }] : splitScripts(text)) {
    // Characters inside a non-CJK host line are game words: read them in Japanese (or Chinese if no kana and host is zh).
    const runLang: Lang = run.cjk ? "ja" : lang;
    const runVoice = run.cjk ? undefined : voiceName;
    for (const chunk of splitSentences(run.text)) {
      if (my !== token) return { ok: true, usedFallback };
      const r = await sayIn(chunk, runLang, runVoice, my);
      if (!run.cjk) usedFallback ||= r.fallback;
      ok &&= r.ok;
    }
  }
  return { ok, usedFallback, voice: voiceName };
}

import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";

const firebaseConfig = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"],
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"],
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"],
  appId: import.meta.env["VITE_FIREBASE_APP_ID"],
};

let app: ReturnType<typeof initializeApp>;
let ai: ReturnType<typeof getAI>;

if (typeof window !== "undefined") {
  app = initializeApp(firebaseConfig);
  // App Check (reCAPTCHA Enterprise) cannot run in headless E2E Chromium, so it is
  // skipped when VITE_E2E is set; the AI endpoints are mocked in that mode anyway.
  if (!import.meta.env["VITE_E2E"]) {
    const debugToken = import.meta.env["VITE_APPCHECK_DEBUG_TOKEN"];
    if (debugToken) {
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(
        import.meta.env["VITE_RECAPTCHA_SITE_KEY"] || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
      ),
      isTokenAutoRefreshEnabled: true,
    });
  }
  ai = getAI(app, { backend: new GoogleAIBackend() });
} else {
  // Server-side: initialize without App Check (not needed for SSR)
  app = initializeApp(firebaseConfig);
  ai = getAI(app, { backend: new GoogleAIBackend() });
}

export type InferenceSource = "on-device" | "cloud";
export type AiResult<T> = { data: T; source: InferenceSource; ms: number };

type ChromeLanguageModelSession = { prompt: (input: string) => Promise<string>; destroy?: () => void };
type ChromeLanguageModelAPI = {
  availability: () => Promise<string>;
  create: () => Promise<ChromeLanguageModelSession>;
};

function getOnDeviceAPI(): ChromeLanguageModelAPI | null {
  const g = globalThis as unknown as {
    LanguageModel?: ChromeLanguageModelAPI;
    ai?: { languageModel?: ChromeLanguageModelAPI };
  };
  return g.LanguageModel ?? g.ai?.languageModel ?? null;
}

function getModel(forceCloud = false) {
  return getGenerativeModel(ai, {
    mode: forceCloud ? InferenceMode.ONLY_IN_CLOUD : InferenceMode.PREFER_ON_DEVICE,
  });
}

async function runHybridPrompt(prompt: string, forceCloud: boolean): Promise<AiResult<string>> {
  const start = performance.now();
  if (!forceCloud) {
    const lm = getOnDeviceAPI();
    if (lm && (await lm.availability()) === "available") {
      const session = await lm.create();
      try {
        const text = await session.prompt(prompt);
        return { data: text.trim(), source: "on-device", ms: Math.round(performance.now() - start) };
      } finally {
        session.destroy?.();
      }
    }
  }

  const res = await getModel(forceCloud).generateContent(prompt);
  return { data: res.response.text().trim(), source: "cloud", ms: Math.round(performance.now() - start) };
}

/** 1. ON-DEVICE (Nano): Context sentence + masked English clue during the 20s timer. */
export async function generateContextSentence(
  word: string,
  reading: string,
  targetLang: "Japanese" | "Chinese",
  forceCloud = false
): Promise<AiResult<string>> {
  const prompt = `Write one short ${targetLang} example sentence using "${word}" (pronounced "${reading}"), followed by an English translation where the meaning of "${word}" is replaced with "[ ___ ]".
Format strictly as:
${targetLang}: <sentence>
Clue: <English sentence with [ ___ ]>`;

  return runHybridPrompt(prompt, forceCloud);
}

/** 2. ON-DEVICE (Nano): Post-reveal memory hook (visual hook for True Friends, contrast for False/Half Friends). */
export async function generateLanguageMnemonic(
  word: string,
  reading: string,
  pinyin: string,
  jaMeaning: string,
  zhMeaning: string,
  relation: "true" | "false" | "partial",
  forceCloud = false
): Promise<AiResult<string>> {
  const prompt =
    relation === "true"
      ? `Give a 1-sentence visual memory hook for "${word}" (Japanese: ${reading}, Chinese: ${pinyin}), which means "${jaMeaning}" in BOTH languages. Connect the characters' visual parts to "${jaMeaning}". Under 25 words.`
      : `Create a 1-sentence contrast memory trick for "${word}".
- In Japanese (${reading}), it means "${jaMeaning}".
- In Chinese (${pinyin}), it means "${zhMeaning}".
Explicitly say "Japanese" and "Chinese" and link each language to its meaning with a vivid image. Under 25 words.`;

  return runHybridPrompt(prompt, forceCloud);
}

/** 3. CLOUD-ONLY (Gemini Flash): AI Linguistics Referee for Word Pool submissions. */
export async function verifyAndEnrichWord(form: string): Promise<
  AiResult<{
    reading: string;
    pinyin: string;
    meaning_ja: string;
    meaning_zh: string;
    relation: "true" | "false" | "partial";
    note: string;
  }>
> {
  const start = performance.now();
  const cloudModel = getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD });
  const prompt = `Analyze the CJK word "${form}" in both Japanese and Mandarin Chinese.
Return ONLY valid JSON with these exact keys:
{
  "reading": "Japanese romaji reading",
  "pinyin": "Mandarin pinyin with tone marks",
  "meaning_ja": "concise English meaning in Japanese (2-40 chars)",
  "meaning_zh": "concise English meaning in Chinese (2-40 chars)",
  "relation": "true" | "false" | "partial",
  "note": "1-sentence fun linguistic fact explaining why they match or differ"
}`;

  const res = await cloudModel.generateContent(prompt);
  const raw = res.response.text().replace(/```json|```/g, "").trim();
  const ms = Math.round(performance.now() - start);
  return { data: JSON.parse(raw), source: "cloud", ms };
}
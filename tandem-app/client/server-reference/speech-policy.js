// Browser choice names must stay in sync with src/lib/edge-voices.ts.
export const VOICES = {
  en: ["en-US-JennyNeural", "en-US-GuyNeural"],
  zh: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"],
  ja: ["ja-JP-NanamiNeural", "ja-JP-KeitaNeural"],
  es: ["es-ES-ElviraNeural", "es-ES-AlvaroNeural"],
  ar: ["ar-SA-ZariyahNeural", "ar-SA-HamedNeural"],
  fr: ["fr-FR-DeniseNeural", "fr-FR-HenriNeural"],
};

export function validateSpeech(body) {
  if (!body || typeof body !== "object" || typeof body.text !== "string" ||
      !body.text.trim() || body.text.length > 500 ||
      typeof body.lang !== "string" || !Object.hasOwn(VOICES, body.lang)) return null;
  const voices = VOICES[body.lang];
  if (body.voice !== undefined && !voices.includes(body.voice)) return null;
  return { text: body.text.trim(), voice: body.voice ?? voices[0] };
}

export function escapeSpeech(text) {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]);
}
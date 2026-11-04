import type { Lang } from "./host";

/** These names are sent to the Render speech endpoint, not browser speechSynthesis. */
export const EDGE_VOICES: Record<Lang, { name: string; label: string }[]> = {
  en: [{ name: "en-US-JennyNeural", label: "Jenny" }, { name: "en-US-GuyNeural", label: "Guy" }],
  zh: [{ name: "zh-CN-XiaoxiaoNeural", label: "晓晓 · Xiaoxiao" }, { name: "zh-CN-YunxiNeural", label: "云希 · Yunxi" }],
  ja: [{ name: "ja-JP-NanamiNeural", label: "七海 · Nanami" }, { name: "ja-JP-KeitaNeural", label: "圭太 · Keita" }],
  es: [{ name: "es-ES-ElviraNeural", label: "Elvira" }, { name: "es-ES-AlvaroNeural", label: "Álvaro" }],
  ar: [{ name: "ar-SA-ZariyahNeural", label: "زارية · Zariyah" }, { name: "ar-SA-HamedNeural", label: "حامد · Hamed" }],
  fr: [{ name: "fr-FR-DeniseNeural", label: "Denise" }, { name: "fr-FR-HenriNeural", label: "Henri" }],
};

export function edgeVoiceFor(lang: Lang, preferred?: string): string {
  const voices = EDGE_VOICES[lang];
  return voices.find((v) => v.name === preferred)?.name ?? voices[0]?.name ?? "en-US-JennyNeural";
}
import type { Lang } from "./host";

/** These names are sent to the Render speech endpoint, not browser speechSynthesis. */
export const EDGE_VOICES: Record<Lang, { name: string; label: string }[]> = {
  en: [{ name: "en-US-JennyNeural", label: "Voice 1 (natural)" }, { name: "en-US-GuyNeural", label: "Voice 2 (natural)" }],
  zh: [{ name: "zh-CN-XiaoxiaoNeural", label: "Voice 1 (natural)" }, { name: "zh-CN-YunxiNeural", label: "Voice 2 (natural)" }],
  ja: [{ name: "ja-JP-NanamiNeural", label: "Voice 1 (natural)" }, { name: "ja-JP-KeitaNeural", label: "Voice 2 (natural)" }],
  es: [{ name: "es-ES-ElviraNeural", label: "Voice 1 (natural)" }, { name: "es-ES-AlvaroNeural", label: "Voice 2 (natural)" }],
  ar: [{ name: "ar-SA-ZariyahNeural", label: "Voice 1 (natural)" }, { name: "ar-SA-HamedNeural", label: "Voice 2 (natural)" }],
  fr: [{ name: "fr-FR-DeniseNeural", label: "Voice 1 (natural)" }, { name: "fr-FR-HenriNeural", label: "Voice 2 (natural)" }],
};

export function edgeVoiceFor(lang: Lang, preferred?: string): string {
  const voices = EDGE_VOICES[lang];
  return voices.find((v) => v.name === preferred)?.name ?? voices[0]?.name ?? "en-US-JennyNeural";
}
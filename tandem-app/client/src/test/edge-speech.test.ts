import { afterEach, describe, expect, it, vi } from "vitest";
import { EDGE_VOICES, edgeVoiceFor } from "@/lib/edge-voices";
// @ts-expect-error Render reference JavaScript is deliberately outside the app's TS bundle.
import { validateSpeech, escapeSpeech, VOICES } from "../../server-reference/speech-policy.js";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

describe("Render Edge voice contract", () => {
  it("provides Xiaoxiao for Chinese, Keita for Japanese, and Hamed for Arabic", () => {
    expect(edgeVoiceFor("zh")).toBe("zh-CN-XiaoxiaoNeural");
    expect(edgeVoiceFor("ja", "ja-JP-KeitaNeural")).toBe("ja-JP-KeitaNeural");
    expect(edgeVoiceFor("ar", "ar-SA-HamedNeural")).toBe("ar-SA-HamedNeural");
    for (const [lang, voices] of Object.entries(EDGE_VOICES)) expect(voices.map(v => v.name)).toEqual(VOICES[lang]);
  });
  it("rejects a voice from a different language and oversized text", () => {
    expect(validateSpeech({ text: "مرحبا", lang: "ar", voice: "ja-JP-KeitaNeural" })).toBeNull();
    expect(validateSpeech({ text: "a".repeat(501), lang: "en" })).toBeNull();
    expect(validateSpeech({ text: "مرحبا", lang: "ar", voice: "ar-SA-HamedNeural" })).toEqual({ text: "مرحبا", voice: "ar-SA-HamedNeural" });
  });
  it("escapes speech markup without removing Chinese or Arabic text", () => {
    expect(escapeSpeech("手紙 & مرحبا <voice>" )).toBe("手紙 &amp; مرحبا &lt;voice&gt;");
  });
});

describe("host audio requests", () => {
  it("requests Japanese for the kanji inside English narration and never drops it", async () => {
    vi.stubEnv("VITE_API_URL", "https://render.example");
    const fetcher = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "content-type": "audio/mpeg" }), blob: async () => new Blob(["audio"]) });
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("Audio", class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause() {}
      async play() { queueMicrotask(() => this.onended?.()); }
    });
    const NativeURL = URL;
    vi.stubGlobal("URL", class extends NativeURL {
      static override createObjectURL() { return "blob:audio"; }
      static override revokeObjectURL() {}
    });
    const { speak, stopSpeaking } = await import("@/lib/host");
    expect((await speak("The word is 手紙. Choose now!", "en")).ok).toBe(true);
    const bodies = fetcher.mock.calls.map(call => JSON.parse(call[1].body));
    expect(bodies).toContainEqual({ text: "手紙", lang: "ja", voice: "ja-JP-NanamiNeural" });
    expect(bodies[0].lang).toBe("en");
    stopSpeaking();
  });
  it("reports failure rather than calling the old Google audio URL when Render fails", async () => {
    vi.stubEnv("VITE_API_URL", "https://render.example");
    const fetcher = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetcher);
    const { speak } = await import("@/lib/host");
    expect((await speak("مرحبا", "ar")).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://render.example/api/tts");
  });
});
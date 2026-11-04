import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "./host";
import type { Direction } from "./content";

export type Theme = "felt" | "library" | "neon" | "ink" | "lacquer";
export const THEMES: { id: Theme; label: string }[] = [
  { id: "felt", label: "Casino Felt" },
  { id: "library", label: "Midnight Library" },
  { id: "neon", label: "Tokyo Neon" },
  { id: "ink", label: "Ink & Paper" },
  { id: "lacquer", label: "Lacquer Red" },
];

export const DIRECTIONS: { id: Direction; label: string; hint: string }[] = [
  { id: "zh2ja", label: "I know Chinese → guess Japanese", hint: "See a Japanese word, pick its Japanese meaning." },
  { id: "ja2zh", label: "I know Japanese → guess Chinese", hint: "See a Chinese word, pick its Chinese meaning." },
  { id: "en", label: "I know neither (English)", hint: "Pure guessing from the characters — the control group." },
];
export type Settings = { name: string; lang: Lang; voice: string; theme: Theme; muted: boolean; dir: Direction };
const DEFAULT: Settings = { name: "", lang: "en", voice: "", theme: "felt", muted: false, dir: "zh2ja" };

const Ctx = createContext<{ s: Settings; set: (p: Partial<Settings>) => void }>({ s: DEFAULT, set: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULT);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tandem-settings");
      if (raw) {
        const saved = { ...DEFAULT, ...JSON.parse(raw) };
        // Never pre-fill a name: the start screen only shows an example.
        saved.name = "";
        setS(saved);
      }
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", s.theme);
    document.documentElement.dir = s.lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = s.lang;
  }, [s.theme, s.lang]);
  const set = (p: Partial<Settings>) =>
    setS((prev) => {
      const next = { ...prev, ...p };
      localStorage.setItem("tandem-settings", JSON.stringify(next));
      return next;
    });
  return <Ctx.Provider value={{ s, set }}>{children}</Ctx.Provider>;
}
export const useSettings = () => useContext(Ctx);

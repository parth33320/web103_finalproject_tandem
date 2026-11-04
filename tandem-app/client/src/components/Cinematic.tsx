import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/** Theme-tinted film layers: spotlight, haze, vignette, grain, plus an opening letterbox. */
export function Cinematic({ tension = false, intro = true }: { tension?: boolean; intro?: boolean }) {
  const reduce = useReducedMotion();
  const [bars, setBars] = useState(intro && !reduce);
  useEffect(() => { if (!bars) return; const t = setTimeout(() => setBars(false), 1600); return () => clearTimeout(t); }, [bars]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      <div className="cine-spot absolute inset-0" />
      <div className="cine-haze absolute inset-0" />
      <div className={`cine-vignette absolute inset-0 ${tension ? "cine-tension" : ""}`} />
      <div className="cine-grain absolute -inset-[5%]" />
      <AnimatePresence>
        {bars && (
          <>
            <motion.div key="t" className="absolute inset-x-0 top-0 h-[12vh] bg-background" initial={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 1.1, ease: [0.7, 0, 0.2, 1] }} />
            <motion.div key="b" className="absolute inset-x-0 bottom-0 h-[12vh] bg-background" initial={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 1.1, ease: [0.7, 0, 0.2, 1] }} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A quick light flare when the answer is revealed. */
export function RevealFlare({ show, good }: { show: boolean; good: boolean | null }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div aria-hidden className={`pointer-events-none fixed inset-0 z-[80] ${good === false ? "cine-flare-bad" : "cine-flare-good"}`}
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0] }} exit={{ opacity: 0 }} transition={{ duration: 1.4, times: [0, 0.15, 1] }} />
      )}
    </AnimatePresence>
  );
}

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.65, 0, 0.25, 1] as const;

/** A card that turns over like a book page: each face hinges on its left edge, with a sweeping shadow and curl. */
export function PageCard({ flipped, back, className = "" }: { flipped: boolean; front?: ReactNode; back: ReactNode; className?: string }) {
  return (
    <div className={`relative [perspective:1600px] ${className}`}>
      {/* face-down cover turns away like a page */}
      <motion.div
        className="card-back absolute inset-0 z-10 rounded-2xl"
        style={{ transformOrigin: "left center" }}
        initial={false}
        animate={flipped ? { rotateY: -100, skewY: -3, opacity: 0 } : { rotateY: 0, skewY: 0, opacity: 1 }}
        transition={{ duration: 0.75, ease: EASE, opacity: { delay: flipped ? 0.6 : 0, duration: 0.15 } }}
      >
        <div className="absolute inset-3 flex items-center justify-center rounded-xl border-2 border-paper/60">
          <span className="font-display text-6xl text-paper/90">縁</span>
        </div>
        <motion.div className="absolute inset-0 rounded-2xl bg-gradient-to-l from-paper-ink/60 to-transparent"
          initial={false} animate={{ opacity: flipped ? 1 : 0 }} transition={{ duration: 0.75 }} />
      </motion.div>
      {/* revealed page */}
      <motion.div
        className="paper-card absolute inset-0 overflow-hidden rounded-2xl"
        style={{ transformOrigin: "left center" }}
        initial={false}
        animate={flipped ? { rotateY: 0, opacity: 1 } : { rotateY: 25, opacity: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: flipped ? 0.35 : 0 }}
      >
        {back}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-paper-ink/20 to-transparent" />
      </motion.div>
    </div>
  );
}

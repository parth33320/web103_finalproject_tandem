import { motion } from "framer-motion";

/** Decorative deck on the table: it only plays a "deal" flick each round, it isn't playable. */
export function Deck({ round }: { round: number }) {
  return (
    <div className="pointer-events-none relative h-36 w-24 select-none" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="card-back absolute inset-0 rounded-lg shadow-md"
          style={{ transform: `translate(${i * -1.5}px, ${i * -2}px) rotate(${(i % 3) - 1}deg)` }} />
      ))}
      {round > 0 && (
        <motion.div key={round} className="card-back absolute inset-0 rounded-lg shadow-xl"
          initial={{ x: -10, y: -14, rotate: 0, opacity: 1 }}
          animate={{ x: 220, y: 30, rotate: 14, opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeIn" }} />
      )}
    </div>
  );
}

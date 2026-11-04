import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import hand from "@/assets/hand-point.png";

// Fingertip location inside the hand image (ratio of rendered width).
const SIZE = 300;
const TIP_X = 0.2 * SIZE;
const TIP_Y = 0.105 * SIZE;

export function HandCursor() {
  // On touch screens the hand is smaller and only appears briefly where you tap.
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const k = touch ? 0.4 : 1;
  const [shown, setShown] = useState(!touch);
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const sx = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 });
  const [tap, setTap] = useState(false);

  useEffect(() => {
    const move = (e: PointerEvent) => { x.set(e.clientX - TIP_X * k); y.set(e.clientY - TIP_Y * k); };
    const down = (e: PointerEvent) => { move(e); setTap(true); if (touch) setShown(true); };
    let hide: ReturnType<typeof setTimeout> | undefined;
    const up = () => { setTap(false); if (touch) { clearTimeout(hide); hide = setTimeout(() => setShown(false), 900); } };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <motion.img
      src={hand}
      alt=""
      aria-hidden
      width={SIZE * k}
      height={SIZE * k}
      className="pointer-events-none fixed left-0 top-0 z-[100] select-none drop-shadow-[0_30px_25px_rgba(0,0,0,0.55)]"
      style={{ x: sx, y: sy, opacity: shown ? 1 : 0, transformOrigin: `${TIP_X * k}px ${TIP_Y * k}px` }}
      animate={{ scale: tap ? 0.9 : 1, rotate: tap ? -4 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
    />
  );
}

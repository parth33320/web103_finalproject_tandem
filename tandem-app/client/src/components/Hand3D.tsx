import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import modelUrl from "@/assets/pointing-hand.glb?url";


// Feel constants
const HAND_PX = 300;        // on-screen height of the hand
const FOLLOW = 18;          // position spring strength
const LEAN = 0.0009;        // tilt per px/s of motion
const YAW_EDGE = 0.55;      // radians of turn at the screen edges
const TAP_DIP = 0.22;       // how far the hand presses in on tap

// Per-theme 3D lighting (hex for three.js; mirrors each theme's mood).
const LIGHTS: Record<string, { key: string; rim: string; fill: string; env: number }> = {
  felt: { key: "#ffd9a0", rim: "#e9c46a", fill: "#2f6b4f", env: 1 },
  library: { key: "#ffcf8a", rim: "#c98a4b", fill: "#2b3a66", env: 0.9 },
  neon: { key: "#bfe9ff", rim: "#ff3fa4", fill: "#3fd0ff", env: 1.2 },
  ink: { key: "#ffffff", rim: "#f2e6d0", fill: "#d8d2c4", env: 1.3 },
  lacquer: { key: "#ffd68a", rim: "#ff5a3a", fill: "#7a1a14", env: 1 },
};

function useTheme() {
  const [t, setT] = useState("felt");
  useEffect(() => {
    const read = () => setT(document.documentElement.getAttribute("data-theme") || "felt");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return t;
}

type Pointer = { x: number; y: number; down: boolean; seen: boolean };

function Hand({ ptr }: { ptr: React.MutableRefObject<Pointer> }) {
  const { scene } = useGLTF(handAsset.url);
  const { size, viewport, camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const vel = useRef({ x: 0, y: 0, px: 0, py: 0, dip: 0 });

  // Normalize once: fingertip (highest vertex) becomes the pivot, height = 1.
  const model = useMemo(() => {
    const m = scene.clone(true);
    const box = new THREE.Box3().setFromObject(m);
    const h = box.max.y - box.min.y || 1;
    m.updateMatrixWorld(true);
    let tip = new THREE.Vector3(0, -Infinity, 0);
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const pos = mesh.geometry.getAttribute("position"); if (!pos) return;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += 7) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        if (v.y > tip.y) tip = v.clone();
      }
    });
    m.position.set(-tip.x / h, -tip.y / h, -tip.z / h);
    m.scale.setScalar(1 / h);
    const wrap = new THREE.Group();
    wrap.add(m);
    return wrap;
  }, [scene]);

  useEffect(() => { document.querySelector("[data-hand]")?.setAttribute("data-scene-ready", "1"); }, []);

  useFrame((_, d) => {
    const g = group.current; if (!g) return;
    const dt = Math.min(d, 0.05);
    const vp = viewport.getCurrentViewport(camera, [0, 0, 0]);
    const p = ptr.current;
    const tx = (p.x / size.width - 0.5) * vp.width;
    const ty = -(p.y / size.height - 0.5) * vp.height;
    const k = 1 - Math.exp(-FOLLOW * dt);
    const v = vel.current;
    g.position.x += (tx - g.position.x) * k;
    g.position.y += (ty - g.position.y) * k;
    // screen-space velocity for lean
    const sx = ((g.position.x - v.px) / vp.width) * size.width / Math.max(dt, 1e-3);
    const sy = ((g.position.y - v.py) / vp.height) * size.height / Math.max(dt, 1e-3);
    v.px = g.position.x; v.py = g.position.y;
    v.x += (sx - v.x) * 0.2; v.y += (sy - v.y) * 0.2;
    v.dip += ((p.down ? 1 : 0) - v.dip) * (1 - Math.exp(-25 * dt));

    // Smaller hand on tablets/phones so it never covers the answers.
    const px = Math.min(HAND_PX, Math.max(150, size.width * 0.22));
    const scale = (px / size.height) * vp.height;
    g.scale.setScalar(scale * (1 - v.dip * 0.08));
    g.position.z = -v.dip * TAP_DIP * scale;
    const edge = p.x / size.width - 0.5;
    g.rotation.y = -edge * YAW_EDGE * 2 + Math.sin(performance.now() / 1400) * 0.04;
    g.rotation.z = THREE.MathUtils.clamp(-v.x * LEAN, -0.35, 0.35) - 0.12;
    g.rotation.x = -0.25 + v.dip * 0.5 + THREE.MathUtils.clamp(v.y * LEAN * 0.5, -0.2, 0.2);
    g.visible = p.seen;
  });

  return <group ref={group}><primitive object={model} /></group>;
}

export default function Hand3D() {
  const ptr = useRef<Pointer>({ x: -999, y: -999, down: false, seen: false });
  const theme = useTheme();
  const L = LIGHTS[theme] ?? LIGHTS["felt"]!;

  useEffect(() => {
    const move = (e: PointerEvent) => { ptr.current.x = e.clientX; ptr.current.y = e.clientY; ptr.current.seen = true; };
    const down = (e: PointerEvent) => { move(e); ptr.current.down = true; };
    const up = () => { ptr.current.down = false; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div data-hand aria-hidden className="hand-shadow pointer-events-none fixed inset-0 z-[100]">
      <Canvas dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 6], fov: 35 }} style={{ pointerEvents: "none" }}>
        <ambientLight intensity={0.35} color={L.fill} />
        <directionalLight position={[3, 5, 6]} intensity={2.2} color={L.key} />
        <directionalLight position={[-4, 2, -3]} intensity={1.6} color={L.rim} />
        <Environment resolution={64}>
          <Lightformer intensity={2 * L.env} color={L.key} position={[0, 5, 2]} scale={[10, 10, 1]} />
          <Lightformer intensity={1.2 * L.env} color={L.rim} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
          <Lightformer intensity={0.8 * L.env} color={L.fill} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
        </Environment>
        <Suspense fallback={null}><Hand ptr={ptr} /></Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload?.(handAsset.url);

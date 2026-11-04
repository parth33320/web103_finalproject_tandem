import { ClientOnly } from "@tanstack/react-router";
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { HandCursor } from "./HandCursor";

const Hand3D = lazy(() => import("./Hand3D"));

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function webglOk() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/** 3D hand pointer, falling back to the flat hand picture. */
export function HandPointer() {
  const [mode, setMode] = useState<"flat" | "3d" | null>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Touch screens: some phone graphics chips break the 3D textures, so use the flat hand.
    const touch = window.matchMedia("(pointer: coarse)").matches;
    setMode(!reduce && !touch && webglOk() ? "3d" : "flat");
  }, []);
  return (
    <ClientOnly fallback={null}>
      {mode === "flat" && <HandCursor />}
      {mode === "3d" && (
        <Boundary fallback={<HandCursor />}>
          <Suspense fallback={null}><Hand3D /></Suspense>
        </Boundary>
      )}
    </ClientOnly>
  );
}

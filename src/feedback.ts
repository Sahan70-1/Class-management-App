import type { Entity } from "./model";

let lastPulse = -Infinity;

/** Acknowledge the local check-in write even when the phone is offline. */
export function confirmCheckinSave(entity: Entity) {
  if (
    (entity !== "attendance" && entity !== "fees" && entity !== "issues") ||
    typeof window === "undefined" ||
    typeof navigator.vibrate !== "function" ||
    document.hidden ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  )
    return;

  const now = performance.now();
  if (now - lastPulse < 250) return;
  lastPulse = now;
  try {
    navigator.vibrate(12);
  } catch {
    // Some embedded browsers expose vibration but disallow its use.
  }
}

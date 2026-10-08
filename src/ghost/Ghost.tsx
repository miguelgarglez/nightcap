import { useEffect, useRef } from "react";

// The ghost is drawn fresh every frame from GhostState. Nothing here re-renders;
// the parent mutates `state` and the rAF loop reads it.

export type GhostMode = "hidden" | "premonition" | "materialize" | "alive" | "dissolve";

export type GhostState = {
  haunt: number; // 0..100 — size, opacity, agitation all derive from this
  mode: GhostMode;
  lookX: number; // -1..1
  lookY: number;
  overdose: boolean;
  idle: boolean; // long inactivity -> it dozes
  reduceMotion: boolean;
  pulse: number; // set to 1 on a drink landing — the ghost inhales
};

// layered value noise — cheap, organic
function n1(t: number): number {
  return Math.sin(t * 0.9) * 0.55 + Math.sin(t * 1.7 + 1.3) * 0.3 + Math.sin(t * 2.9 + 2.1) * 0.15;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function Ghost({ state }: { state: GhostState }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current!;
    const NS = "http://www.w3.org/2000/svg";
    const mk = <T extends SVGElement>(tag: string, attrs: Record<string, string>) => {
      const el = document.createElementNS(NS, tag) as T;
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    };

    const defs = mk("defs", {});
    defs.innerHTML = `
      <radialGradient id="ncBody" cx="50%" cy="26%" r="82%">
        <stop offset="0%" stop-color="#cdf7ee" stop-opacity="0.98"/>
        <stop offset="45%" stop-color="#a9e8dc" stop-opacity="0.72"/>
        <stop offset="88%" stop-color="#a9e8dc" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#a9e8dc" stop-opacity="0.02"/>
      </radialGradient>
      <radialGradient id="ncAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#a9e8dc" stop-opacity="0.30"/>
        <stop offset="70%" stop-color="#a9e8dc" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#a9e8dc" stop-opacity="0"/>
      </radialGradient>
      <filter id="ncSoft"><feGaussianBlur stdDeviation="0.55"/></filter>`;
    const aura = mk<SVGEllipseElement>("ellipse", { fill: "url(#ncAura)" });
    const edge = mk<SVGPathElement>("path", {
      fill: "none", stroke: "#cdf7ee", "stroke-width": "1.4",
      "stroke-linecap": "round", filter: "url(#ncSoft)", opacity: "0",
    });
    const body = mk<SVGPathElement>("path", { fill: "url(#ncBody)", opacity: "0" });
    const eyeL = mk<SVGEllipseElement>("ellipse", { fill: "#0b0e1a", opacity: "0" });
    const eyeR = mk<SVGEllipseElement>("ellipse", { fill: "#0b0e1a", opacity: "0" });
    const mouth = mk<SVGEllipseElement>("ellipse", { fill: "#0b0e1a", opacity: "0" });
    // a faint content smile while the haunting is still small
    const smile = mk<SVGPathElement>("path", {
      fill: "none", stroke: "#0b0e1a", "stroke-width": "2.2",
      "stroke-linecap": "round", opacity: "0",
    });
    svg.append(defs, aura, edge, body, eyeL, eyeR, mouth, smile);

    // animation state kept across frames
    let appear = 0; // 0 hidden -> 1 fully present
    let lookX = 0, lookY = 0;
    let blinkAt = performance.now() + 3500;
    let blinkT = -1;
    let lookAwayAt = performance.now() + 2400;
    let waveT = -1; // goodbye wave progress
    let prevMode: GhostMode = state.mode;
    let edgeDash = 0;
    let raf = 0;

    const tick = (now: number) => {
      const s = state;
      const w = now / 1000;
      const h = s.haunt / 100;
      const motion = s.reduceMotion ? 0 : 1;

      // --- presence by mode ---
      if (s.mode !== prevMode) {
        if (s.mode === "dissolve") waveT = 0;
        prevMode = s.mode;
      }
      const target =
        s.mode === "hidden" ? 0 :
        s.mode === "premonition" ? 0.5 :
        s.mode === "dissolve" ? 0 : 1;
      const speed = s.mode === "materialize" ? 0.028 : s.mode === "dissolve" ? 0.05 : 0.1;
      appear = lerp(appear, target, speed);
      if (s.mode === "dissolve" && waveT >= 0) {
        waveT += 0.018;
        if (waveT > 1) waveT = 1;
      }

      const agitation = s.overdose ? 1.6 : 0.25 + h * 0.75;
      const breathe = n1(w * 0.55) * (s.idle ? 2 : 3.2) * motion;
      const jitX = (s.overdose ? n1(w * 13) * 2.4 : n1(w * 0.8 + 9) * 1.1) * motion;
      // inhale: a drink landing makes the ghost swell briefly
      s.pulse = Math.max(0, s.pulse - 0.03);
      const inhale = s.pulse > 0 ? Math.sin(Math.min(1, 1 - s.pulse) * Math.PI) * 0.1 * motion : 0;
      const baseScale = 0.52 + h * 0.95;
      const scale = baseScale * (s.mode === "premonition" ? 0.96 : 1) * (1 + inhale) * (0.98 + 0.04 * Math.sin(w * 1.1) * motion);
      // posture: above 60% it leans over the line and narrows its eyes
      const loom = Math.max(0, h - 0.6) * 2.5;

      // --- geometry: a sheet ghost in a 160x200 box ---
      const W = 62 + h * 10;
      const top = 8, hem = 168;
      const hemAmp = (4 + agitation * 7) * motion;
      const lean = lookX * 4 * motion;
      const leftX = 80 - W + lean, rightX = 80 + W + lean, crownX = 80 + lean * 0.6;
      let d = `M ${leftX} ${hem} `;
      d += `C ${leftX} ${hem - 58} ${leftX} ${top + 26} ${crownX} ${top} `;
      d += `C ${rightX} ${top + 26} ${rightX} ${hem - 58} ${rightX} ${hem} `;
      // hem: scalloped lobes hanging down; the last one lifts for the goodbye wave
      const lobes = 5;
      for (let i = lobes; i >= 1; i--) {
        const x1 = leftX + (i / lobes) * W * 2;
        const x0 = leftX + ((i - 1) / lobes) * W * 2;
        const cx = (x0 + x1) / 2;
        const dip = 8 + h * 6 + n1(w * (1 + agitation * 0.8) + i * 1.9) * hemAmp;
        const wave = waveT > 0 && i === lobes ? Math.sin(waveT * Math.PI) * 30 : 0;
        d += `Q ${cx} ${hem + dip - wave} ${x0} ${hem + n1(w * 1.2 + i * 2.3) * hemAmp * 0.35} `;
      }
      d += "Z";
      body.setAttribute("d", d);

      // edge shimmer: same outline, dashed, drifting
      edgeDash = (edgeDash + 0.35 * motion) % 60;
      edge.setAttribute("d", d);
      edge.setAttribute("stroke-dasharray", "7 9");
      edge.setAttribute("stroke-dashoffset", String(-edgeDash));

      // --- opacity by mode ---
      const flicker = s.mode === "premonition" && motion ? 0.72 + 0.28 * Math.sin(w * 6.5) : 1;
      const bodyOp = clamp01(appear * (0.28 + h * 0.72) * flicker);
      body.setAttribute("opacity", bodyOp.toFixed(3));
      edge.setAttribute("opacity", (bodyOp * (s.mode === "premonition" ? 0.9 : 0.55)).toFixed(3));
      aura.setAttribute("cx", "80");
      aura.setAttribute("cy", "95");
      aura.setAttribute("rx", String(78 + h * 30));
      aura.setAttribute("ry", String(88 + h * 26));
      aura.setAttribute("opacity", (bodyOp * 0.75).toFixed(3));

      // --- eyes: track for ~2.4s after change, then drift away; blink; close when idle ---
      lookX = lerp(lookX, now < lookAwayAt ? s.lookX : s.lookX * 0.15, 0.08);
      lookY = lerp(lookY, now < lookAwayAt ? s.lookY : 0.35, 0.08);
      if (Math.abs(s.lookX - lookX) > 0.25) lookAwayAt = now + 2400;
      if (now > blinkAt) { blinkT = 0; blinkAt = now + 3800 + Math.random() * 5200; }
      if (blinkT >= 0) blinkT += 1 / 60;
      const blink = blinkT >= 0 && blinkT < 0.14 ? Math.sin((blinkT / 0.14) * Math.PI) : 0;
      if (blinkT >= 0.14) blinkT = -1;
      const eyeOpen = s.idle ? 0.1 : 1 - blink * 0.92;
      const ex = 80 + lean * 0.7 + lookX * 5 * motion;
      const ey = 74 + breathe * 0.4 + lookY * 4 * motion;
      const eyeSep = 21 + loom * 3;
      const eyeRx = 6.4 + h * 1.2, eyeRy = (8.6 + h * 1.6) * eyeOpen * (1 - loom * 0.22);
      eyeL.setAttribute("cx", String(ex - eyeSep));
      eyeR.setAttribute("cx", String(ex + eyeSep));
      eyeL.setAttribute("cy", String(ey)); eyeR.setAttribute("cy", String(ey));
      eyeL.setAttribute("rx", String(eyeRx)); eyeR.setAttribute("rx", String(eyeRx));
      eyeL.setAttribute("ry", String(Math.max(0.8, eyeRy)));
      eyeR.setAttribute("ry", String(Math.max(0.8, eyeRy)));
      eyeL.setAttribute("opacity", (bodyOp * 0.92).toFixed(3));
      eyeR.setAttribute("opacity", (bodyOp * 0.92).toFixed(3));
      const mOp = h > 0.55 && !s.idle ? bodyOp * 0.65 : 0;
      mouth.setAttribute("cx", String(ex + lookX * 2));
      mouth.setAttribute("cy", String(ey + 26));
      mouth.setAttribute("rx", "4.2"); mouth.setAttribute("ry", String(6 + h * 3));
      mouth.setAttribute("opacity", mOp.toFixed(3));
      // low haunt: a faint content smile instead of the worried mouth
      const sOp = h <= 0.4 && !s.idle ? bodyOp * 0.5 : 0;
      smile.setAttribute("d", `M ${ex - 8} ${ey + 24} Q ${ex} ${ey + 31} ${ex + 8} ${ey + 24}`);
      smile.setAttribute("opacity", sOp.toFixed(3));

      const tx = `translate(${80 + jitX} ${100 + breathe + loom * 9}) rotate(${lean * 0.4 + jitX * 0.3} 80 130) scale(${scale}) translate(-80 -100)`;
      for (const el of [aura, edge, body, eyeL, eyeR, mouth, smile]) {
        el.setAttribute("transform", tx);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      svg.replaceChildren();
    };
  }, [state]);

  return (
    <svg
      ref={ref}
      className="ghost-svg"
      viewBox="0 0 160 200"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    />
  );
}

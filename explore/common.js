// shared demo machinery for explore pages: ghost renderer + drink chips + demo state
"use strict";

const PAL = {
  spectral: "#a9e8dc",
  spectralDim: "#5fae9f",
  amber: "#f0a95c",
  bone: "#f2ebdc",
  violet: "#6c5ce7",
};

const DRINKS = [
  { id: "espresso", name: "espresso", mg: 63 },
  { id: "brewed", name: "brewed", mg: 95 },
  { id: "coldbrew", name: "cold brew", mg: 200 },
  { id: "matcha", name: "matcha", mg: 70 },
  { id: "energy", name: "energy", mg: 80 },
  { id: "cola", name: "cola", mg: 46 },
];

// --- tiny value noise for the hem ---
function n1(t) {
  return (
    Math.sin(t * 0.9) * 0.55 +
    Math.sin(t * 1.7 + 1.3) * 0.3 +
    Math.sin(t * 2.9 + 2.1) * 0.15
  );
}

// Ghost: a sheet specter drawn fresh every frame. haunt 0..100.
function createGhost(container) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 160 190");
  svg.style.overflow = "visible";
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `
    <radialGradient id="gBody" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="${PAL.spectral}" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="${PAL.spectral}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${PAL.spectral}" stop-opacity="0.06"/>
    </radialGradient>
    <filter id="gBlur"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="gGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
  svg.appendChild(defs);
  const glow = document.createElementNS(NS, "path");
  glow.setAttribute("fill", PAL.spectral);
  glow.setAttribute("filter", "url(#gBlur)");
  glow.setAttribute("opacity", "0.35");
  const body = document.createElementNS(NS, "path");
  body.setAttribute("fill", "url(#gBody)");
  body.setAttribute("filter", "url(#gGlow)");
  const eyeL = document.createElementNS(NS, "ellipse");
  const eyeR = document.createElementNS(NS, "ellipse");
  for (const e of [eyeL, eyeR]) {
    e.setAttribute("rx", "6.5");
    e.setAttribute("ry", "9");
    e.setAttribute("fill", "#0b0e1a");
    e.setAttribute("opacity", "0.9");
  }
  const mouth = document.createElementNS(NS, "ellipse");
  mouth.setAttribute("rx", "4.5");
  mouth.setAttribute("ry", "7");
  mouth.setAttribute("fill", "#0b0e1a");
  mouth.setAttribute("opacity", "0.7");
  svg.append(glow, body, eyeL, eyeR, mouth);
  container.appendChild(svg);

  let haunt = 60, lookX = 0, lookY = 0, agitation = 0.4, asleep = false, premonition = false;
  let scale = 1;

  function tick(t) {
    const w = t / 1000;
    const bob = n1(w * 0.7) * 4;
    const hemAmp = 6 + agitation * 8;
    // hem: 5 lobes driven by noise
    const pts = [];
    const H = 150, W2 = 62;
    for (let i = 0; i <= 10; i++) {
      const x = -W2 + (i / 10) * W2 * 2;
      const y = H + n1(w * (1 + agitation) + i * 1.7) * hemAmp * (i % 2 ? 1 : -0.4);
      pts.push([x, y]);
    }
    let d = `M ${-W2} ${H} L ${-W2} 60 Q ${-W2} 4 0 4 Q ${W2} 4 ${W2} 60 L ${W2} ${H}`;
    for (let i = 10; i >= 0; i -= 2) d += ` Q ${(pts[i][0] + (pts[Math.max(0, i - 1)][0])) / 2} ${pts[i][1]} ${pts[Math.max(0, i - 1)][0]} ${pts[Math.max(0, i - 1)][1]}`;
    d += " Z";
    body.setAttribute("d", d);
    glow.setAttribute("d", d);
    const h = haunt / 100;
    const op = asleep ? 0.12 : premonition ? 0.25 + 0.15 * Math.sin(w * 14) : 0.35 + h * 0.6;
    body.setAttribute("opacity", String(Math.max(0.05, Math.min(1, op))));
    glow.setAttribute("opacity", String(op * 0.4));
    const eyeY = 68 + bob * 0.4;
    const jx = asleep ? 0 : lookX * 3;
    const jy = asleep ? 4 : lookY * 3;
    eyeL.setAttribute("cx", String(-22 + jx)); eyeL.setAttribute("cy", String(eyeY + jy));
    eyeR.setAttribute("cx", String(22 + jx)); eyeR.setAttribute("cy", String(eyeY + jy));
    const eyeRy = asleep ? 1.2 : 9;
    eyeL.setAttribute("ry", String(eyeRy)); eyeR.setAttribute("ry", String(eyeRy));
    mouth.setAttribute("cx", String(jx * 0.5)); mouth.setAttribute("cy", String(96 + jy));
    svg.style.transform = `translateY(${bob}px) scale(${scale})`;
  }

  let raf;
  function loop(t) { tick(t); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);

  return {
    el: svg,
    setHaunt(v) { haunt = Math.max(0, Math.min(100, v)); scale = 0.45 + (haunt / 100) * 0.75; agitation = Math.min(1, haunt / 70); },
    setLook(x, y) { lookX = x; lookY = y; },
    setPremonition(v) { premonition = v; },
    setAsleep(v) { asleep = v; },
    stop() { cancelAnimationFrame(raf); },
  };
}

// demo state: drinks placed -> residual at bedtime -> haunted %
function residualAt(placed, bedtime, halfLife) {
  let r = 0;
  for (const p of placed) {
    if (p.minutes < bedtime) r += p.mg * Math.pow(0.5, (bedtime - p.minutes) / (halfLife * 60));
  }
  return r;
}

function makeChip(d, onPick) {
  const el = document.createElement("button");
  el.className = "drink";
  el.innerHTML = `${d.name}<span class="mg">${d.mg}</span>`;
  el.dataset.drink = d.id;
  el.addEventListener("pointerdown", (e) => onPick && onPick(d, e));
  return el;
}

import { useEffect, useState } from "react";

const STEPS = [
  { n: "one", text: "take a drink from the shelf" },
  { n: "two", text: "drop it on your day" },
  { n: "three", text: "drag it earlier. watch the ghost thin." },
  { n: "", text: "that's the whole trick. the rest is yours." },
];

export function Guide({
  step,
  target,
  onSkip,
}: {
  step: number;
  target: HTMLElement | null;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!target) { setRect(null); return; }
    const update = () => setRect(target.getBoundingClientRect());
    update();
    const iv = setInterval(update, 200);
    addEventListener("resize", update);
    return () => { clearInterval(iv); removeEventListener("resize", update); };
  }, [target, step]);

  const s = STEPS[Math.min(step, 3)];
  const pad = 10;
  const bubbleStyle: React.CSSProperties = rect
    ? rect.right + 290 < innerWidth
      ? { left: rect.right + 18, top: Math.max(12, rect.top + rect.height / 2 - 34) }
      : { left: Math.max(12, rect.left), top: Math.min(innerHeight - 120, rect.bottom + 16) }
    : { left: "50%", top: "40%", transform: "translate(-50%,-50%)" };

  return (
    <>
      {rect && step < 3 && (
        <div
          className="guide-ring"
          style={{
            left: rect.left - pad, top: rect.top - pad,
            width: rect.width + pad * 2, height: rect.height + pad * 2,
          }}
        />
      )}
      <div className="guide-bubble" style={bubbleStyle}>
        {s.n && <span className="step">step {s.n} of three</span>}
        {s.text}
      </div>
      {step < 3 && <button className="guide-skip" onClick={onSkip}>skip</button>}
    </>
  );
}

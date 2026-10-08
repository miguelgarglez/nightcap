import { useEffect, useState } from "react";

const STEPS = [
  { n: "one", sel: ".shelf", text: "take a drink from the shelf" },
  { n: "two", sel: ".descent", text: "drop it on your day" },
  { n: "three", sel: ".placed", text: "drag it earlier. watch the ghost thin." },
  { n: "", sel: "", text: "that's the whole trick. the rest is yours." },
];

export function Guide({
  step,
  onSkip,
}: {
  step: number;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const s = STEPS[Math.min(step, 3)];

  // the target may not exist yet (the placed drink mounts after the step
  // advances), so re-query every tick instead of trusting a mount-time ref
  useEffect(() => {
    const update = () => {
      const el = s.sel ? document.querySelector(s.sel) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    const iv = setInterval(update, 150);
    addEventListener("resize", update);
    return () => { clearInterval(iv); removeEventListener("resize", update); };
  }, [s.sel]);

  const pad = 10;
  const bubbleStyle: React.CSSProperties = rect
    ? rect.right + 290 < innerWidth
      ? { left: rect.right + 18, top: Math.max(12, rect.top + Math.min(rect.height / 2, 46) - 24) }
      : { left: Math.max(12, Math.min(rect.left, innerWidth - 300)), top: Math.min(innerHeight - 120, rect.bottom + 16) }
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

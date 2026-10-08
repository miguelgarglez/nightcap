import { useEffect, useRef, useState } from "react";
import { DRINKS, fmtTime, type SceneState, type Verdict } from "../domain";

// the certificate of haunting — drawn on canvas in the product's own palette
function drawCard(
  canvas: HTMLCanvasElement,
  state: SceneState,
  score: number,
  verdict: Verdict
) {
  const W = 1080, H = 1350;
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext("2d")!;

  // night
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#141a35");
  bg.addColorStop(0.55, "#0b0e1a");
  bg.addColorStop(1, "#05060f");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  // stars (deterministic)
  for (let i = 0; i < 90; i++) {
    const x = (i * 83.7) % W, y = ((i * 47.3) % (H * 0.6));
    const r = 0.6 + ((i * 13) % 3) * 0.5;
    c.globalAlpha = 0.12 + ((i * 7) % 5) * 0.08;
    c.fillStyle = "#f2ebdc";
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  c.globalAlpha = 1;

  // moon
  const mg = c.createRadialGradient(W - 180, 170, 10, W - 180, 170, 90);
  mg.addColorStop(0, "rgba(253,246,227,0.95)");
  mg.addColorStop(0.5, "rgba(221,210,174,0.5)");
  mg.addColorStop(1, "rgba(221,210,174,0)");
  c.fillStyle = mg;
  c.beginPath(); c.arc(W - 180, 170, 90, 0, 7); c.fill();

  // the ghost, same scalloped silhouette as the app
  const h = score / 100;
  const gw = 150 + h * 90, gh = 210 + h * 130;
  const cx = W / 2, top = H * 0.30;
  const left = cx - gw / 2, right = cx + gw / 2, hem = top + gh;
  c.save();
  c.shadowColor = "rgba(169,232,220,0.7)";
  c.shadowBlur = 60;
  const gg = c.createRadialGradient(cx, top + 60, 10, cx, top + 60, gh);
  gg.addColorStop(0, `rgba(205,247,238,${0.55 + h * 0.4})`);
  gg.addColorStop(0.6, `rgba(169,232,220,${0.3 + h * 0.3})`);
  gg.addColorStop(1, "rgba(169,232,220,0.03)");
  c.fillStyle = gg;
  c.beginPath();
  c.moveTo(left, hem);
  c.bezierCurveTo(left, hem - gh * 0.4, left, top + 40, cx, top);
  c.bezierCurveTo(right, top + 40, right, hem - gh * 0.4, right, hem);
  const lobes = 5;
  for (let i = lobes; i >= 1; i--) {
    const x1 = left + (i / lobes) * gw;
    const x0 = left + ((i - 1) / lobes) * gw;
    c.quadraticCurveTo((x0 + x1) / 2, hem + 18 + Math.sin(i * 1.9) * 7, x0, hem + Math.sin(i * 2.3) * 3);
  }
  c.closePath();
  c.fill();
  c.shadowBlur = 0;
  // eyes
  c.fillStyle = `rgba(11,14,26,${0.7 + h * 0.3})`;
  c.beginPath(); c.ellipse(cx - 34, top + gh * 0.38, 11, 16 + h * 6, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(cx + 34, top + gh * 0.38, 11, 16 + h * 6, 0, 0, 7); c.fill();
  if (h > 0.5) { c.beginPath(); c.ellipse(cx, top + gh * 0.38 + 52, 8, 13, 0, 0, 7); c.fill(); }
  c.restore();

  // the seal
  c.save();
  c.translate(150, 175);
  c.rotate(-0.1);
  c.strokeStyle = "rgba(169,232,220,0.8)";
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(0, 0, 74, 0, 7); c.stroke();
  c.setLineDash([3, 6]);
  c.beginPath(); c.arc(0, 0, 64, 0, 7); c.stroke();
  c.setLineDash([]);
  c.fillStyle = "#a9e8dc";
  c.font = "500 44px 'IBM Plex Mono'";
  c.textAlign = "center";
  c.fillText(`${score}%`, 0, 6);
  c.font = "400 15px 'IBM Plex Mono'";
  c.fillText("HAUNTED", 0, 34);
  c.restore();

  // copy
  c.textAlign = "center";
  c.fillStyle = "#f2ebdc";
  c.font = "italic 400 64px 'Instrument Serif'";
  c.fillText(verdict.band, W / 2, H * 0.72);
  c.fillStyle = "#8f887a";
  c.font = "italic 400 30px 'Instrument Serif'";
  c.fillText(verdict.line, W / 2, H * 0.72 + 52, undefined);

  // evidence
  c.font = "400 24px 'IBM Plex Mono'";
  let ey = H * 0.80;
  for (const p of state.placed.slice(0, 6)) {
    const d = DRINKS.find((x) => x.id === p.drinkId)!;
    c.fillStyle = "#8f887a";
    c.textAlign = "right";
    c.fillText(fmtTime(p.minutes), W / 2 - 20, ey);
    c.fillStyle = "#f0a95c";
    c.textAlign = "left";
    c.fillText(`${d.name} · ${d.mg}mg`, W / 2 + 20, ey);
    ey += 40;
  }

  // footer
  c.textAlign = "center";
  c.fillStyle = "#5fae9f";
  c.font = "400 22px 'IBM Plex Mono'";
  c.fillText("nightcap · how haunted is your night?", W / 2, H - 60);
}

export function ShareTray({
  state,
  score,
  verdict,
  onClose,
}: {
  state: SceneState;
  score: number;
  verdict: Verdict;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      drawCard(canvasRef.current!, state, score, verdict);
      setImg(canvasRef.current!.toDataURL("image/png"));
    });
  }, []);

  const download = () => {
    const a = document.createElement("a");
    a.href = img!; a.download = "nightcap-haunting.png"; a.click();
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); }
    catch { setCopied(false); }
  };

  return (
    <div className="tray-wrap" role="dialog" aria-label="share your haunting">
      <div className="tray-veil" onClick={onClose} />
      <div className="tray">
        {img ? <img src={img} alt="your certificate of haunting" /> : <div style={{ aspectRatio: "4/5" }} />}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div className="tray-actions">
          <button className="tray-btn" onClick={download} disabled={!img}>download card</button>
          <button className="tray-btn" onClick={copyLink}>{copied ? "copied!" : "copy link"}</button>
        </div>
        <div className="tray-note">the link carries your exact haunting: drinks, bedtime, liver and all.</div>
      </div>
    </div>
  );
}

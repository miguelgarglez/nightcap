import { useEffect, useRef, useState } from "react";
import { TextMorph } from "torph/react";
import { DRINKS, START, END, fmtTime, type SceneState, type Verdict } from "../domain";

// the share card: a miniature of the product's own night column
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

  // fireflies (deterministic)
  for (let i = 0; i < 26; i++) {
    const x = (i * 83.7) % W, y = ((i * 47.3) % H);
    c.globalAlpha = 0.08 + ((i * 7) % 5) * 0.05;
    c.fillStyle = "#f0d9a8";
    c.beginPath(); c.arc(x, y, 1.6 + ((i * 13) % 3), 0, 7); c.fill();
  }
  c.globalAlpha = 1;

  // moon
  const mg = c.createRadialGradient(W - 170, 150, 10, W - 170, 150, 80);
  mg.addColorStop(0, "rgba(253,246,227,0.9)");
  mg.addColorStop(0.5, "rgba(221,210,174,0.4)");
  mg.addColorStop(1, "rgba(221,210,174,0)");
  c.fillStyle = mg;
  c.beginPath(); c.arc(W - 170, 150, 80, 0, 7); c.fill();

  // --- the mini timeline, left third ---
  const col = { x: 120, y: 170, w: 250, h: 990 };
  const colG = c.createLinearGradient(0, col.y, 0, col.y + col.h);
  colG.addColorStop(0, "#1c2349"); colG.addColorStop(0.6, "#10142c"); colG.addColorStop(1, "#05060f");
  c.fillStyle = colG;
  c.beginPath(); c.roundRect(col.x, col.y, col.w, col.h, 26); c.fill();
  c.strokeStyle = "rgba(154,143,240,0.25)"; c.lineWidth = 2; c.stroke();

  const yFor = (m: number) => col.y + 20 + ((m - START) / (END - START)) * (col.h - 40);
  const bedY = yFor(state.bedtime);

  // night zone inside the mini column
  c.save();
  c.beginPath(); c.roundRect(col.x, col.y, col.w, col.h, 26); c.clip();
  const nz = c.createLinearGradient(0, bedY, 0, col.y + col.h);
  nz.addColorStop(0, "rgba(108,92,231,0.14)"); nz.addColorStop(1, "rgba(9,8,26,0.55)");
  c.fillStyle = nz; c.fillRect(col.x, bedY, col.w, col.y + col.h - bedY);
  // a few fireflies down there
  for (let i = 0; i < 8; i++) {
    c.globalAlpha = 0.3;
    c.fillStyle = "#f0d9a8";
    c.beginPath(); c.arc(col.x + 30 + (i * 61) % (col.w - 60), bedY + 40 + (i * 97) % (col.y + col.h - bedY - 80), 2.4, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  // hour ticks every 3h, labels only every 6h
  c.font = "400 16px 'IBM Plex Mono'";
  for (let m = START; m <= END; m += 180) {
    const y = yFor(m);
    c.strokeStyle = "rgba(242,235,220,0.06)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(col.x + 52, y); c.lineTo(col.x + col.w - 16, y); c.stroke();
    if (m % 360 === 0) {
      c.fillStyle = "#a89f8d"; c.textAlign = "left";
      c.fillText(fmtTime(m), col.x + 12, y + 5);
    }
  }
  // drinks
  for (const p of state.placed) {
    const y = yFor(p.minutes);
    const late = p.minutes > state.bedtime;
    c.globalAlpha = late ? 0.4 : 1;
    c.fillStyle = "#f0a95c";
    c.beginPath(); c.arc(col.x + 70, y, 7, 0, 7); c.fill();
    // amber thread sinking to the ghost
    if (!late) {
      c.strokeStyle = "rgba(240,169,92,0.5)"; c.lineWidth = 1.6;
      c.setLineDash([2, 6]);
      c.beginPath();
      c.moveTo(col.x + 78, y);
      c.bezierCurveTo(col.x + 140, y + 30, col.x + 150, bedY - 60, col.x + col.w / 2 + 18, bedY - 12);
      c.stroke();
      c.setLineDash([]);
    }
  }
  c.globalAlpha = 1;
  // bed line
  c.strokeStyle = "rgba(154,143,240,0.75)"; c.lineWidth = 2;
  c.setLineDash([7, 6]);
  c.beginPath(); c.moveTo(col.x, bedY); c.lineTo(col.x + col.w, bedY); c.stroke();
  c.setLineDash([]);
  c.fillStyle = "#b4a8f0"; c.font = "400 17px 'IBM Plex Mono'"; c.textAlign = "right";
  c.fillText(`bed ${fmtTime(state.bedtime)}`, col.x + col.w - 12, bedY - 12);
  c.restore();

  // the ghost straddling the line
  const h = score / 100;
  const gw = 90 + h * 60, gh = 130 + h * 90;
  const cx = col.x + col.w / 2 + 18, top = bedY - gh + 26;
  const left = cx - gw / 2, right = cx + gw / 2, hem = top + gh;
  c.save();
  c.shadowColor = "rgba(169,232,220,0.7)";
  c.shadowBlur = 44;
  const gg = c.createRadialGradient(cx, top + gh * 0.3, 8, cx, top + gh * 0.3, gh);
  gg.addColorStop(0, `rgba(205,247,238,${0.6 + h * 0.38})`);
  gg.addColorStop(0.6, `rgba(169,232,220,${0.32 + h * 0.3})`);
  gg.addColorStop(1, "rgba(169,232,220,0.04)");
  c.fillStyle = gg;
  c.beginPath();
  c.moveTo(left, hem);
  c.bezierCurveTo(left, hem - gh * 0.4, left, top + gh * 0.2, cx, top);
  c.bezierCurveTo(right, top + gh * 0.2, right, hem - gh * 0.4, right, hem);
  const lobes = 5;
  for (let i = lobes; i >= 1; i--) {
    const x1 = left + (i / lobes) * gw;
    const x0 = left + ((i - 1) / lobes) * gw;
    c.quadraticCurveTo((x0 + x1) / 2, hem + 14 + Math.sin(i * 1.9) * 6, x0, hem + Math.sin(i * 2.3) * 3);
  }
  c.closePath(); c.fill();
  c.shadowBlur = 0;
  c.fillStyle = `rgba(11,14,26,${0.7 + h * 0.3})`;
  const ey = top + gh * 0.38, sep = 17 + h * 8;
  c.beginPath(); c.ellipse(cx - sep, ey, 7.5, 11 + h * 4, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(cx + sep, ey, 7.5, 11 + h * 4, 0, 0, 7); c.fill();
  if (h > 0.5) { c.beginPath(); c.ellipse(cx, ey + 34, 5.5, 9, 0, 0, 7); c.fill(); }
  c.restore();

  // --- the right side: the reading ---
  const RX = 470;
  c.textAlign = "left";
  c.fillStyle = "#f2ebdc";
  c.font = "italic 400 84px 'Almendra'";
  c.fillText("nightcap", RX, 240);
  c.fillStyle = "#5fae9f";
  c.font = "400 20px 'IBM Plex Mono'";
  c.fillText("the caffeine you drank is still awake", RX + 4, 282);

  c.fillStyle = "#a9e8dc";
  c.font = "500 190px 'IBM Plex Mono'";
  c.fillText(`${score}`, RX, 510);
  c.font = "400 26px 'IBM Plex Mono'";
  c.fillStyle = "#8f887a";
  c.fillText("% haunted tonight", RX + 8, 552);

  c.fillStyle = "#f2ebdc";
  c.font = "italic 400 54px 'Almendra'";
  c.fillText(verdict.band, RX, 660);
  c.fillStyle = "#a89f8d";
  c.font = "italic 400 30px 'Almendra'";
  wrapText(c, verdict.line, RX, 706, W - RX - 80, 40);

  // evidence
  c.font = "400 27px 'IBM Plex Mono'";
  let ey2 = 840;
  for (const p of state.placed.slice(0, 6)) {
    const d = DRINKS.find((x) => x.id === p.drinkId)!;
    c.fillStyle = "#a89f8d";
    c.fillText(fmtTime(p.minutes), RX + 4, ey2);
    c.fillStyle = p.minutes > state.bedtime ? "#6b6656" : "#f0a95c";
    c.fillText(`${d.name} · ${d.mg}mg`, RX + 150, ey2);
    ey2 += 50;
  }

  c.textAlign = "left";
  c.fillStyle = "#5fae9f";
  c.font = "400 22px 'IBM Plex Mono'";
  c.fillText("nightcap · how haunted is your night?", RX + 4, H - 90);
}

function wrapText(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += lh; }
    else line = t;
  }
  c.fillText(line, x, yy);
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const [copy, setCopy] = useState<"idle" | "ok" | "err">("idle");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      drawCard(canvasRef.current!, state, score, verdict);
      setImg(canvasRef.current!.toDataURL("image/png"));
    });
  }, []);

  useEffect(() => {
    const d = dialogRef.current!;
    d.showModal();
    return () => { if (d.open) d.close(); };
  }, []);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 190);
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = img!; a.download = "nightcap-haunting.png"; a.click();
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopy("ok"); }
    catch { setCopy("err"); }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`tray-dialog ${closing ? "closing" : ""}`}
      aria-label="share your haunting"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="tray">
        <button className="tray-close" onClick={close} aria-label="close">×</button>
        {img ? <img src={img} alt="your night, rendered" /> : <div className="tray-loading" />}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div className="tray-actions">
          <button className="tray-primary" onClick={download} disabled={!img} autoFocus>save the night</button>
          <button className="tray-quiet" onClick={copyLink}>
            <TextMorph>{copy === "ok" ? "copied" : copy === "err" ? "couldn't copy — grab the address bar" : "copy link"}</TextMorph>
          </button>
        </div>
        <div className="tray-note">the link carries your exact haunting: drinks, bedtime, liver and all.</div>
      </div>
    </dialog>
  );
}

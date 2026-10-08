import { useEffect, useMemo, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { TextMorph } from "torph/react";
import { WebHaptics } from "web-haptics";

const haptics = new WebHaptics();
const haptic = (p: "nudge" | "success" | "buzz") => haptics.trigger(p);
import {
  DRINKS, START, END, MIN_BED, MAX_BED, OVERDOSE_MG, HALF_LIVES,
  decodeState, encodeState, fmtTime, hauntedScore, nextUid,
  residualAt, totalMg, verdictFor,
  type PlacedDrink,
} from "./domain";
import { Ghost, type GhostState } from "./ghost/Ghost";
import { audio, sfxDissolve, sfxDrop, sfxMaterialize, setHum } from "./audio";
import { Guide } from "./components/Guide";
import { ShareTray } from "./components/ShareTray";

type DragKind = { type: "shelf"; drinkId: string } | { type: "move"; uid: string };
type Drag = DragKind & { x: number; y: number; x0: number; y0: number; snap: number | null; over: boolean };
type BedDrag = { active: boolean };

const pct = (m: number) => 2.2 + ((m - START) / (END - START)) * 95.6;
const clampBed = (m: number) => Math.max(MIN_BED, Math.min(MAX_BED, m));
const snap15 = (m: number) => Math.round(m / 15) * 15;

export default function App() {
  const [state, setState] = useState(() => {
    const saved = decodeState(location.hash);
    return saved ?? { placed: [] as PlacedDrink[], bedtime: 23 * 60, liver: "average" as const };
  });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [kbCursor, setKbCursor] = useState<{ drinkId: string; minutes: number } | null>(null);
  const [sound, setSound] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [guideOn, setGuideOn] = useState(() => localStorage.getItem("nightcap.guide.v2") !== "done");
  const [guideStep, _setGuideStep] = useState(0);
  const guideStepRef = useRef(0);
  const setGuideStep = (n: number | ((p: number) => number)) => {
    guideStepRef.current = typeof n === "function" ? n(guideStepRef.current) : n;
    _setGuideStep(guideStepRef.current);
  };

  const columnRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const ghostModeTimer = useRef(0);
  const lastActivity = useRef(Date.now());
  const ghostState = useRef<GhostState>({
    haunt: 0, mode: "hidden", lookX: 0, lookY: 0,
    overdose: false, idle: false,
    reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    pulse: 0,
  });
  const dropFx = useRef<{ x: number; y: number; uid: string } | null>(null);
  const [poured, setPoured] = useState<{ uid: string; drinkId: string; minutes: number; name: string } | null>(null);
  const pouredTimer = useRef(0);
  const bedDetent = useRef(0);
  const earlierAcc = useRef(0);
  const bloomedOnce = useRef(false);
  const [bloom, setBloom] = useState(false);
  const [colSize, setColSize] = useState({ w: 0, h: 0 });

  const { placed, bedtime, liver } = state;
  const score = useMemo(() => hauntedScore(placed, bedtime, liver), [placed, bedtime, liver]);
  const residual = useMemo(() => residualAt(placed, bedtime, HALF_LIVES[liver]), [placed, bedtime, liver]);
  const overdose = totalMg(placed) > OVERDOSE_MG;
  const verdict = verdictFor(score, overdose);
  const bedPct = pct(bedtime);

  // ---------- ghost orchestration ----------
  useEffect(() => {
    const g = ghostState.current;
    g.haunt = score;
    g.overdose = overdose;
    if (g.mode === "premonition") return; // drag owns the ghost right now
    if (score >= 5) {
      if (g.mode === "hidden" || g.mode === "dissolve") {
        g.mode = "materialize";
        sfxMaterialize();
        if (!bloomedOnce.current) {
          bloomedOnce.current = true;
          setBloom(true);
          setTimeout(() => setBloom(false), 1400);
        }
        clearTimeout(ghostModeTimer.current);
        ghostModeTimer.current = window.setTimeout(() => { if (g.mode === "materialize") g.mode = "alive"; }, 900);
      } else g.mode = "alive";
    } else if (g.mode === "alive" || g.mode === "materialize") {
      g.mode = "dissolve";
      sfxDissolve();
      clearTimeout(ghostModeTimer.current);
      ghostModeTimer.current = window.setTimeout(() => { if (g.mode === "dissolve") g.mode = "hidden"; }, 1200);
    }
  }, [score, overdose]);

  useEffect(() => { audio.enabled = sound; setHum(sound ? score : 0); }, [score, sound]);

  // ---------- url hash ----------
  useEffect(() => {
    history.replaceState(null, "", encodeState(state));
  }, [state]);

  // measure the column so trails can be drawn in real pixels
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const r = columnRef.current!.getBoundingClientRect();
      setColSize({ w: r.width, h: r.height });
    });
    ro.observe(columnRef.current!);
    return () => ro.disconnect();
  }, []);

  // fly a freshly placed chip in from where the pointer released it
  useEffect(() => {
    const fx = dropFx.current;
    dropFx.current = null;
    if (!fx) return;
    const el = columnRef.current?.querySelector<HTMLElement>(`[data-uid="${fx.uid}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--dx", `${fx.x - (r.left + r.width / 2)}px`);
    el.style.setProperty("--dy", `${fx.y - (r.top + r.height / 2)}px`);
    el.classList.add("flyin");
    el.addEventListener("animationend", () => el.classList.remove("flyin"), { once: true });
  }, [placed]);

  // ---------- idle: the ghost dozes ----------
  useEffect(() => {
    const mark = () => { lastActivity.current = Date.now(); ghostState.current.idle = false; };
    const iv = setInterval(() => {
      if (Date.now() - lastActivity.current > 15000) ghostState.current.idle = true;
    }, 1000);
    for (const e of ["pointermove", "pointerdown", "keydown"] as const) addEventListener(e, mark, { passive: true });
    return () => { clearInterval(iv); for (const e of ["pointermove", "pointerdown", "keydown"] as const) removeEventListener(e, mark); };
  }, []);

  // ---------- drag plumbing ----------
  const yToMin = (y: number) => {
    const r = columnRef.current!.getBoundingClientRect();
    const p = ((y - r.top) / r.height) * 100;
    return START + ((p - 2.2) / 95.6) * (END - START);
  };
  const inColumn = (x: number, y: number) => {
    const r = columnRef.current!.getBoundingClientRect();
    return x > r.left && x < r.right && y > r.top && y < r.bottom;
  };

  const finishGuide = () => {
    setGuideStep(3);
    setTimeout(() => { setGuideOn(false); localStorage.setItem("nightcap.guide.v2", "done"); }, 2400);
  };
  const skipGuide = () => { setGuideOn(false); localStorage.setItem("nightcap.guide.v2", "done"); };

  const previewScore = (d: Drag, snap: number | null) => {
    if (snap == null) return score;
    const withIt = d.type === "shelf"
      ? [...placed, { uid: "prev", drinkId: d.drinkId, minutes: snap }]
      : placed.map((p) => (p.uid === d.uid ? { ...p, minutes: snap } : p));
    return hauntedScore(withIt, bedtime, liver);
  };

  const commit = (d: Drag) => {
    if (d.snap == null) {
      // a touch tap on a shelf chip: arm the placement cursor instead of a drag
      if (d.type === "shelf" && Math.hypot(d.x - d.x0, d.y - d.y0) < 10 && matchMedia("(pointer: coarse)").matches) {
        setKbCursor({ drinkId: d.drinkId, minutes: Math.max(START, bedtime - 8 * 60) });
      }
      // released outside the column — the drink is poured out, but recoverable
      if (d.type === "move") pourOut(d.uid);
      return;
    }
    ghostState.current.pulse = 1;
    if (d.type === "shelf") {
      const uid = nextUid();
      dropFx.current = { x: d.x, y: d.y, uid };
      setState((s) => ({ ...s, placed: [...s.placed, { uid, drinkId: d.drinkId, minutes: d.snap! }] }));
      if (guideStepRef.current === 1) setGuideStep(2);
    } else {
      dropFx.current = { x: d.x, y: d.y, uid: d.uid };
      setState((s) => ({ ...s, placed: s.placed.map((p) => (p.uid === d.uid ? { ...p, minutes: d.snap! } : p)) }));
      const before = placed.find((p) => p.uid === d.uid);
      if (guideStepRef.current === 2 && before && before.minutes - d.snap! >= 120) finishGuide();
    }
    haptic("nudge");
    sfxDrop();
    const g = ghostState.current;
    g.haunt = previewScore(d, d.snap);
    if (g.haunt >= 5) {
      g.mode = "materialize";
      sfxMaterialize();
      clearTimeout(ghostModeTimer.current);
      ghostModeTimer.current = window.setTimeout(() => { if (g.mode === "materialize") g.mode = "alive"; }, 900);
    }
  };

  const beginDrag = (kind: DragKind, x: number, y: number) => {
    const d: Drag = { ...kind, x, y, x0: x, y0: y, snap: null, over: false };
    dragRef.current = d;
    setDrag(d);
    if (guideStepRef.current === 0) setGuideStep(1);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current!;
      d.x = e.clientX; d.y = e.clientY;
      d.over = inColumn(e.clientX, e.clientY);
      d.snap = d.over ? Math.max(START, Math.min(END, snap15(yToMin(e.clientY)))) : null;
      const g = ghostState.current;
      if (d.over) {
        g.haunt = previewScore(d, d.snap);
        if (g.haunt >= 5) g.mode = "premonition";
      } else {
        g.haunt = score;
        if (g.mode === "premonition") g.mode = score >= 5 ? "alive" : "hidden";
      }
      setDrag({ ...d });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current!;
      d.over = inColumn(e.clientX, e.clientY);
      d.snap = d.over ? Math.max(START, Math.min(END, snap15(yToMin(e.clientY)))) : null;
      commit(d);
      dragRef.current = null;
      setDrag(null);
      const g = ghostState.current;
      if (g.mode === "premonition") g.mode = score >= 5 ? "alive" : "hidden";
    };
    const cancel = () => {
      dragRef.current = null;
      setDrag(null);
      const g = ghostState.current;
      if (g.mode === "premonition") g.mode = score >= 5 ? "alive" : "hidden";
      g.haunt = score;
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", cancel);
    return () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", cancel);
    };
  }, [drag != null]);

  // bed line drag
  const bedDrag = useRef<BedDrag>({ active: false });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!bedDrag.current.active || !columnRef.current) return;
      const m = Math.round(yToMin(e.clientY) / 30) * 30;
      if (m !== bedDetent.current) { bedDetent.current = m; haptic("nudge"); }
      setState((s) => ({ ...s, bedtime: clampBed(m) }));
    };
    const up = () => { bedDrag.current.active = false; };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
    return () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
  }, []);

  // keep the ghost informed when the motion preference changes
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => { ghostState.current.reduceMotion = mq.matches; };
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  // ghost looks at the cursor
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = ghostState.current;
      g.lookX = (e.clientX / innerWidth - 0.5) * 2;
      g.lookY = (e.clientY / innerHeight - 0.5) * 2;
    };
    addEventListener("pointermove", move, { passive: true });
    return () => removeEventListener("pointermove", move);
  }, []);

  // ---------- keyboard placement ----------
  useEffect(() => {
    if (!kbCursor) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { setKbCursor((c) => c && { ...c, minutes: Math.max(START, c.minutes - 15) }); e.preventDefault(); }
      else if (e.key === "ArrowDown") { setKbCursor((c) => c && { ...c, minutes: Math.min(END, c.minutes + 15) }); e.preventDefault(); }
      else if (e.key === "Enter") { commitKb(kbCursor); e.preventDefault(); }
      else if (e.key === "Escape") { setKbCursor(null); e.preventDefault(); }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [kbCursor]);

  const commitKb = (c: { drinkId: string; minutes: number }) => {
    dropFx.current = null;
    ghostState.current.pulse = 1;
    setState((s) => ({ ...s, placed: [...s.placed, { uid: nextUid(), drinkId: c.drinkId, minutes: c.minutes }] }));
    haptic("nudge"); sfxDrop();
    if (guideStepRef.current === 1) setGuideStep(2);
    setKbCursor(null);
  };

  const movePlaced = (uid: string, delta: number) => {
    if (delta < 0 && guideStepRef.current === 2) {
      earlierAcc.current -= delta;
      if (earlierAcc.current >= 120) finishGuide();
    }
    setState((s) => ({
      ...s,
      placed: s.placed.map((p) => p.uid === uid ? { ...p, minutes: Math.max(START, Math.min(END, p.minutes + delta)) } : p),
    }));
  };
  const pourOut = (uid: string) => {
    const old = placed.find((p) => p.uid === uid);
    setState((s) => ({ ...s, placed: s.placed.filter((p) => p.uid !== uid) }));
    if (old) {
      const name = DRINKS.find((x) => x.id === old.drinkId)?.name ?? "drink";
      setPoured({ ...old, name });
      clearTimeout(pouredTimer.current);
      pouredTimer.current = window.setTimeout(() => setPoured(null), 4200);
    }
  };
  const removePlaced = pourOut;

  const hours: number[] = [];
  for (let m = START; m <= END; m += 60) hours.push(m);

  // lane offsets so drinks at the same time never sit on top of each other
  const laneOf = useMemo(() => {
    const last: number[] = [];
    const map = new Map<string, number>();
    for (const p of [...placed].sort((a, b) => a.minutes - b.minutes)) {
      let lane = last.findIndex((t) => Math.abs(p.minutes - t) > 55);
      if (lane === -1) { lane = Math.min(last.length, 2); if (lane === last.length) last.push(-1e9); }
      last[lane] = p.minutes;
      map.set(p.uid, lane);
    }
    return map;
  }, [placed]);

  const fireflies = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37.7 + 13) % 100, y: (i * 23.3 + 7) % 100, o: 0.3 + ((i * 11) % 40) / 100, d: (i * 1.7) % 9, dur: 6 + (i % 4) * 2.3 })),
    []
  );

  const activeChipDrink = drag?.type === "shelf" ? drag.drinkId : drag?.type === "move" ? placed.find((p) => p.uid === (drag as { uid: string }).uid)?.drinkId : kbCursor?.drinkId;

  // trails are drawn in real pixels so they actually reach the ghost
  const bedY = (bedPct / 100) * colSize.h;
  const trailD = (m: number, lane: number) => {
    const y = (pct(m) / 100) * colSize.h;
    const x = 64 + lane * 104 + 46;
    const tx = colSize.w * 0.5;
    return `M ${x} ${y} C ${x + (tx - x) * 0.32} ${y + 44}, ${tx - 70} ${bedY - 78}, ${tx} ${bedY - 16}`;
  };

  return (
    <div className={`app ${bloom ? "bloom" : ""} ${guideOn ? "guide-on" : ""}`}>
      <header className="masthead">
        <div className="wordmark">nightcap</div>
        <div className="tagline">the caffeine you drank is still awake</div>
        <div className="mast-spacer" />
        <div className="iconrow">
          <button className="iconbtn" aria-label="share your haunting" title="share your haunting" onClick={() => setTrayOpen(true)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 10V2M8 2L5 5M8 2l3 3M3 9v4a1 1 0 001 1h8a1 1 0 001-1V9"/></svg>
          </button>
          <button className="iconbtn" aria-label={sound ? "mute sounds" : "unmute sounds"} aria-pressed={sound} title="sounds" onClick={() => setSound((v) => !v)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6v4h3l4 3V3L5 6H2z" strokeLinejoin="round"/>{sound ? <path d="M11 6c1 1 1 3 0 4M13 4.5c1.6 1.8 1.6 5 0 7"/> : <path d="M11 6l4 4M15 6l-4 4"/>}</svg>
          </button>
          <button className="iconbtn" aria-label="replay the guide" title="guide" onClick={() => { setGuideStep(0); setGuideOn(true); }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 5.5a1.8 1.8 0 113 1.3c-.6.6-1.5.9-1.5 2" strokeLinecap="round"/><circle cx="8" cy="12" r="0.6" fill="currentColor"/></svg>
          </button>
        </div>
        <div className="scoreblock">
          <div className="score-num"><NumberFlow value={score} suffix="%" /></div>
          <div className="score-label">haunted tonight</div>
          {residual >= 1 && <div className="score-mg">≈{Math.round(residual)}mg still circulating</div>}
        </div>
      </header>

      <main className="stage">
        <aside className="rail">
          <div className="rail-label">the shelf · drag onto the day</div>
          <div className="shelf" ref={shelfRef}>
            {DRINKS.map((d) => (
              <button
                key={d.id}
                className="chip"
                onPointerDown={(e) => { e.preventDefault(); beginDrag({ type: "shelf", drinkId: d.id }, e.clientX, e.clientY); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !kbCursor) { setKbCursor({ drinkId: d.id, minutes: Math.max(START, bedtime - 8 * 60) }); e.preventDefault(); e.stopPropagation(); } }}
                aria-label={`${d.name}, ${d.mg} milligrams. Drag onto the day, or press Enter then arrows to place.`}
              >
                <span>{d.name}<span className="note">{d.note}</span></span>
                <span className="mg">{d.mg}<span className="unit">mg</span></span>
              </button>
            ))}
          </div>
          <div className="spacer" />
          <div className="settings-block">
            <div className="setting">
              <span className="rail-label">bedtime</span>
              <span className="bedstepper">
                <button aria-label="bedtime earlier" onClick={() => setState((s) => ({ ...s, bedtime: clampBed(s.bedtime - 30) }))}>−</button>
                <span className="val">{fmtTime(bedtime)}</span>
                <button aria-label="bedtime later" onClick={() => setState((s) => ({ ...s, bedtime: clampBed(s.bedtime + 30) }))}>+</button>
              </span>
            </div>
            <div className="setting" style={{ marginTop: 10 }}>
              <span className="rail-label">your liver</span>
              <span className="moondial" role="group" aria-label="caffeine metabolism speed">
                {(["fast", "average", "slow"] as const).map((l, i) => (
                  <button key={l} className="moonstop" aria-pressed={liver === l} title={`${l} · half-life ${HALF_LIVES[l]}h`}
                    onClick={() => setState((s) => ({ ...s, liver: l }))}>
                    <svg viewBox="0 0 13 13">
                      {i === 0 && <path d="M8.5 1.5a5.2 5.2 0 102.6 9.7A5.8 5.8 0 018.5 1.5z" fill="currentColor"/>}
                      {i === 1 && <><circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 1.5a5 5 0 010 10z" fill="currentColor"/></>}
                      {i === 2 && <circle cx="6.5" cy="6.5" r="5" fill="currentColor"/>}
                    </svg>
                  </button>
                ))}
              </span>
            </div>
            <div className="rail-hint" style={{ marginTop: 12 }}>
              half-life {HALF_LIVES[liver]}h · the bed line on the right drags too
            </div>
          </div>
        </aside>

        <section
          className="descent"
          ref={columnRef}
          aria-label="your day. drop drinks on an hour"
          onPointerUp={(e) => {
            if (!kbCursor || dragRef.current) return;
            if ((e.target as HTMLElement).closest(".bedline")) return;
            const m = Math.max(START, Math.min(END, snap15(yToMin(e.clientY))));
            commitKb({ ...kbCursor, minutes: m });
          }}
        >
          {hours.map((m) => (
            <div key={m} className={`hourrow ${m % 360 === 0 ? "major" : ""}`} style={{ top: `${pct(m)}%` }}>
              <span className="hourlabel">{fmtTime(m)}</span>
              <span className="hourline" />
            </div>
          ))}

          <div className="nightzone" style={{ top: `${bedPct}%` }}>
            {fireflies.map((s, i) => (
              <i key={i} className="firefly" style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.o, animationDelay: `${-s.d}s`, animationDuration: `${s.dur}s` }} />
            ))}
            <div className="fogband f1" />
            <div className="fogband f2" />
            <div className="moon" style={{ right: "10%", top: "8%" }} />
          </div>

          <div className="mist" style={{ top: `${bedPct}%`, opacity: Math.min(1, score / 70) }} />
          <div className="ground" style={{ top: `calc(${bedPct}% + 34px)` }} />

          {colSize.w > 0 && (
            <svg className="trails" viewBox={`0 0 ${colSize.w} ${colSize.h}`}>
              <defs>
                <linearGradient id="trailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f0a95c" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#a9e8dc" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {placed.filter((p) => p.minutes <= bedtime).map((p) => (
                <path
                  key={p.uid}
                  d={trailD(p.minutes, laneOf.get(p.uid) ?? 0)}
                  fill="none" stroke="url(#trailGrad)" strokeWidth="1.5"
                  strokeDasharray="3 8" strokeLinecap="round" opacity="0.7"
                />
              ))}
              {drag?.snap != null && (
                <path
                  className="preview"
                  d={trailD(drag.snap, 0)}
                  fill="none" stroke="#f0a95c" strokeWidth="1.5"
                  strokeDasharray="2 9" strokeLinecap="round" opacity="0.9"
                />
              )}
              {kbCursor && (
                <path
                  className="preview"
                  d={trailD(kbCursor.minutes, 0)}
                  fill="none" stroke="#f0a95c" strokeWidth="1.5"
                  strokeDasharray="2 9" strokeLinecap="round" opacity="0.9"
                />
              )}
            </svg>
          )}

          {placed.map((p) => {
            const d = DRINKS.find((x) => x.id === p.drinkId)!;
            return (
              <div
                key={p.uid}
                data-uid={p.uid}
                className={`placed ${p.minutes > bedtime ? "in-night" : ""} ${drag?.type === "move" && drag.uid === p.uid ? "drag-src" : ""}`}
                style={{ top: `${pct(p.minutes)}%`, left: `calc(64px + ${(laneOf.get(p.uid) ?? 0) * 104}px)` }}
                tabIndex={0}
                role="button"
                aria-label={`${d.name} at ${fmtTime(p.minutes)}. Arrows move, Delete removes.`}
                onPointerDown={(e) => { e.preventDefault(); beginDrag({ type: "move", uid: p.uid }, e.clientX, e.clientY); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") { movePlaced(p.uid, -15); e.preventDefault(); }
                  else if (e.key === "ArrowDown") { movePlaced(p.uid, 15); e.preventDefault(); }
                  else if (e.key === "Delete" || e.key === "Backspace") { removePlaced(p.uid); e.preventDefault(); }
                }}
              >
                <span className="chip">{d.name}<span className="mg">{d.mg}<span className="unit">mg</span></span></span>
                <span className="when">{fmtTime(p.minutes)}</span>
              </div>
            );
          })}

          {drag?.snap != null && (
            <>
              <div className="slotline" style={{ top: `${pct(drag.snap)}%` }} />
              <div className="slottime" style={{ top: `${pct(drag.snap)}%` }}>{fmtTime(drag.snap)}</div>
            </>
          )}
          {kbCursor && (
            <>
              <div className="slotline" style={{ top: `${pct(kbCursor.minutes)}%` }} />
              <div className="slottime" style={{ top: `${pct(kbCursor.minutes)}%` }}>{fmtTime(kbCursor.minutes)} · {matchMedia("(pointer: coarse)").matches ? "tap the day to drop" : "↓↑ to move, ⏎ to drop"}</div>
            </>
          )}

          <div
            className="bedline"
            style={{ top: `${bedPct}%` }}
            role="slider"
            aria-label="bedtime"
            aria-valuemin={MIN_BED} aria-valuemax={MAX_BED} aria-valuenow={bedtime}
            tabIndex={0}
            onPointerDown={(e) => { bedDrag.current.active = true; e.currentTarget.setPointerCapture(e.pointerId); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") { setState((s) => ({ ...s, bedtime: clampBed(s.bedtime - 30) })); e.preventDefault(); }
              if (e.key === "ArrowDown") { setState((s) => ({ ...s, bedtime: clampBed(s.bedtime + 30) })); e.preventDefault(); }
            }}
          >
            <span className="bedtag">bed · {fmtTime(bedtime)}</span>
          </div>

          {score < 5 && <div className="dormant" style={{ top: `${bedPct}%` }} />}

          <div className="ghostspot" style={{ top: `${bedPct}%` }}>
            <Ghost state={ghostState.current} />
          </div>

          {score < 5 && (
            <div className="empty-night" style={{ top: `calc(${bedPct}% + 48px)` }}>
              {placed.length === 0 ? "nothing is haunting you yet. the drinks are on the shelf." : "the night is clear."}
            </div>
          )}
        </section>
      </main>

      <footer className="foot">
        <div className="verdict"><TextMorph>{verdict.band}</TextMorph></div>
        <div className="verdict-line">{verdict.line}</div>
        <div className="spacer" />
        <div className="foot-hint">drag · arrows to move · delete to pour out</div>
      </footer>

      {drag && (
        <div className="proxy" style={{ left: drag.x, top: drag.y }}>
          <span className="chip">
            {DRINKS.find((d) => d.id === activeChipDrink)?.name}
            <span className="mg">{DRINKS.find((d) => d.id === activeChipDrink)?.mg}</span>
          </span>
        </div>
      )}

      {poured && (
        <div className="pourback" role="status">
          <span>{poured.name} poured out</span>
          <button
            onClick={() => {
              const p = poured;
              setPoured(null);
              setState((s) => ({ ...s, placed: [...s.placed, { uid: p.uid, drinkId: p.drinkId, minutes: p.minutes }] }));
            }}
          >
            put it back
          </button>
        </div>
      )}
      {guideOn && <Guide step={guideStep} onSkip={skipGuide} />}
      {trayOpen && <ShareTray state={state} score={score} verdict={verdict} onClose={() => setTrayOpen(false)} />}
    </div>
  );
}

// the domain: drinks, the day, and how much of them is still awake at bedtime

export type Drink = {
  id: string;
  name: string;
  mg: number;
  note: string; // one dry line of copy
};

export type PlacedDrink = {
  uid: string;
  drinkId: string;
  minutes: number; // minutes since START
};

export type Liver = "fast" | "average" | "slow";

export type SceneState = {
  placed: PlacedDrink[];
  bedtime: number; // minutes since START
  liver: Liver;
};

export const START = 6 * 60; // 06:00
export const END = 27 * 60; // 03:00 next day
export const DEFAULT_BEDTIME = 23 * 60;
export const HALF_LIVES: Record<Liver, number> = { fast: 3, average: 5, slow: 9 };
export const MIN_BED = 20 * 60;
export const MAX_BED = 26 * 60;
export const OVERDOSE_MG = 400;

export const DRINKS: Drink[] = [
  { id: "espresso", name: "espresso", mg: 63, note: "small, dark, consequences" },
  { id: "doppio", name: "doppio", mg: 126, note: "twice the problem, same cup" },
  { id: "brewed", name: "brewed", mg: 95, note: "the honest one" },
  { id: "coldbrew", name: "cold brew", mg: 200, note: "it seemed so innocent" },
  { id: "latte", name: "latte", mg: 75, note: "milk cannot save you" },
  { id: "matcha", name: "matcha", mg: 70, note: "calm, green, persistent" },
  { id: "blacktea", name: "black tea", mg: 47, note: "polite but present" },
  { id: "greentea", name: "green tea", mg: 28, note: "barely a whisper" },
  { id: "energy", name: "energy drink", mg: 80, note: "the can is sweating" },
  { id: "cola", name: "cola", mg: 46, note: "lunch's quiet accomplice" },
  { id: "decaf", name: "decaf", mg: 3, note: "a placebo with manners" },
];

export const drinkById = (id: string) => DRINKS.find((d) => d.id === id)!;

// residual caffeine (mg) circulating at minute t from a list of placed drinks
export function residualAt(placed: PlacedDrink[], t: number, halfLifeH: number): number {
  let r = 0;
  for (const p of placed) {
    if (p.minutes <= t) r += drinkById(p.drinkId).mg * Math.pow(0.5, (t - p.minutes) / (halfLifeH * 60));
  }
  return r;
}

// residual curve samples from a drink across the remaining day
export function totalMg(placed: PlacedDrink[]): number {
  return placed.reduce((s, p) => s + drinkById(p.drinkId).mg, 0);
}

export function hauntedScore(placed: PlacedDrink[], bedtime: number, liver: Liver): number {
  return Math.min(100, Math.round(residualAt(placed, bedtime, HALF_LIVES[liver])));
}

export type Verdict = { band: string; line: string };

export function verdictFor(score: number, overdose: boolean): Verdict {
  if (overdose) return { band: "beyond haunting", line: "that stopped being a ghost a while ago. water first, rethink later." };
  if (score >= 90) return { band: "poltergeist", line: "the furniture has been rearranged. the ceiling will be watched." };
  if (score >= 60) return { band: "very haunted", line: "it is standing over the bed, reading your to-do list." };
  if (score >= 30) return { band: "haunted", line: "it is there. you can feel it watching the ceiling with you." };
  if (score >= 10) return { band: "lightly haunted", line: "a faint presence in the hallway. manageable." };
  return { band: "clear conscience", line: "nothing is haunting you tonight. the night is yours." };
}

// --- URL hash: #d=espresso@540.coldbrew@900&bed=1380&liver=average ---
export function encodeState(s: SceneState): string {
  const d = s.placed.map((p) => `${p.drinkId}@${p.minutes}`).join(".");
  return `#d=${d}&bed=${s.bedtime}&liver=${s.liver}`;
}

export function decodeState(hash: string): SceneState | null {
  if (!hash || hash.length < 3) return null;
  try {
    const q = new URLSearchParams(hash.replace(/^#/, ""));
    const placed: PlacedDrink[] = (q.get("d") ?? "")
      .split(".")
      .filter(Boolean)
      .map((tok, i) => {
        const [drinkId, m] = tok.split("@");
        return { uid: `h${i}`, drinkId, minutes: Math.max(START, Math.min(END, parseInt(m, 10) || 0)) };
      })
      .filter((p) => DRINKS.some((d) => d.id === p.drinkId));
    const bed = parseInt(q.get("bed") ?? "", 10);
    const liver = (q.get("liver") ?? "average") as Liver;
    return {
      placed,
      bedtime: bed >= MIN_BED && bed <= MAX_BED ? bed : DEFAULT_BEDTIME,
      liver: liver === "fast" || liver === "average" || liver === "slow" ? liver : "average",
    };
  } catch {
    return null;
  }
}

export const fmtTime = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

let uidN = 0;
export const nextUid = () => `p${++uidN}_${Date.now().toString(36)}`;

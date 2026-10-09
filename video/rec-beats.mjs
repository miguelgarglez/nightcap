import { chromium } from "playwright";
import { mkdirSync, renameSync, readdirSync } from "fs";

const URL = "https://nightcap-ashy.vercel.app";
const OUT = "/Users/miguelgarglez/Developer/nightcap/video/assets/footage";
mkdirSync(OUT, { recursive: true });

const CURSOR = `
  const c = document.createElement('div');
  c.id = 'vcursor';
  c.style.cssText = 'position:fixed;width:26px;height:26px;border:2.5px solid #f0a95c;border-radius:50%;pointer-events:none;z-index:99999;transform:translate(-50%,-50%);transition:width .12s,height .12s,background .12s;box-shadow:0 0 0 1px rgba(11,14,26,.4),0 0 14px rgba(240,169,92,.35);';
  document.body.appendChild(c);
  let tx=540,ty=540,x=540,y=540;
  addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;});
  addEventListener('mousedown',()=>{c.style.width='16px';c.style.height='16px';c.style.background='rgba(240,169,92,.85)';});
  addEventListener('mouseup',()=>{c.style.width='26px';c.style.height='26px';c.style.background='transparent';});
  (function f(){x+=(tx-x)*.35;y+=(ty-y)*.35;c.style.left=x+'px';c.style.top=y+'px';requestAnimationFrame(f);})();
`;

const b = await chromium.launch();
const makeCtx = () =>
  b.newContext({
    viewport: { width: 1080, height: 1080 },
    recordVideo: { dir: "/tmp/nc-vid", size: { width: 1080, height: 1080 } },
  });

async function clip(name, hash, fn, { keepGuide = false } = {}) {
  const ctx = await makeCtx();
  const p = await ctx.newPage();
  await p.addInitScript(CURSOR);
  await p.goto(URL + (hash || ""), { waitUntil: "networkidle" });
  if (!keepGuide) await p.locator(".guide-skip").click().catch(() => {});
  await p.waitForTimeout(1400);
  await fn(p);
  await p.waitForTimeout(400);
  const v = p.video();
  await ctx.close();
  const path = await v.path();
  renameSync(path, `${OUT}/${name}.webm`);
  console.log("saved", name);
}

const colBox = async (p) => await p.locator(".descent").boundingBox();
const frac = (min) => (min - 360) / 1260; // minutes -> column fraction

// drag a shelf chip (by name) to a minute on the column
async function dropDrink(p, name, minute, holdMs = 900) {
  const more = p.locator(".shelf .chip.more");
  if (await more.isVisible().catch(() => false)) {
    const target = p.locator(".shelf .chip", { hasText: name }).first();
    if (!(await target.isVisible().catch(() => false))) await more.click();
    await p.waitForTimeout(500);
  }
  const chip = p.locator(".shelf .chip", { hasText: name }).first();
  const bx = await chip.boundingBox();
  const cb = await colBox(p);
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2, { steps: 12 });
  await p.waitForTimeout(350);
  await p.mouse.down();
  await p.mouse.move(cb.x + cb.width * 0.45, cb.y + cb.height * frac(minute), { steps: 40 });
  await p.waitForTimeout(holdMs); // hold: amber preview trail + provisional score
  await p.mouse.up();
  await p.waitForTimeout(1400);
}

// ---- clip 1: hook — ghost already awake (~75% haunted) ----
await clip("hook", "#d=coldbrew@720.brewed@900&bed=1380&liver=average", async (p) => {
  await p.mouse.move(760, 620, { steps: 20 });
  await p.waitForTimeout(2600);
});

// ---- clip 2: drop espresso at 19:30 from empty ----
await clip("drop", "", async (p) => {
  await dropDrink(p, "espresso", 1170);
  await p.waitForTimeout(800);
}, { keepGuide: true });

// ---- clip 3: pour a doppio at 21:45 on top of existing espresso (~90%) ----
await clip("second", "#d=espresso@1170&bed=1380&liver=average", async (p) => {
  await dropDrink(p, "doppio", 1305, 1100);
  await p.waitForTimeout(900);
}, { keepGuide: true });

// ---- clip 4: drag bedtime earlier 23:00 -> 21:45 ----
await clip("bedtime", "#d=espresso@1170.doppio@1305&bed=1380&liver=average", async (p) => {
  const bl = await p.locator(".bedline").boundingBox();
  await p.mouse.move(bl.x + bl.width * 0.55, bl.y + bl.height / 2, { steps: 20 });
  await p.waitForTimeout(500);
  await p.mouse.down();
  const cb = await colBox(p);
  await p.mouse.move(bl.x + bl.width * 0.55, cb.y + cb.height * frac(1305), { steps: 45 });
  await p.waitForTimeout(1200);
  await p.mouse.up();
  await p.waitForTimeout(1400);
});

// ---- clip 5: payoff — 100% very haunted ----
await clip("payoff", "#d=doppio@1290.coldbrew@1140&bed=1410&liver=average", async (p) => {
  await p.waitForTimeout(3000);
});

// ---- clip 6: share tray certificate ----
await clip("share", "#d=doppio@1290.coldbrew@1140&bed=1410&liver=average", async (p) => {
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "share your haunting" }).click();
  await p.waitForTimeout(2400);
});

await b.close();
console.log(readdirSync(OUT));

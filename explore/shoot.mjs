import { chromium } from "playwright";
const base = "http://localhost:5200/explore";
const browser = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, "1440"], [375, 780, "375"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const v of ["a", "b", "c"]) {
    await page.goto(`${base}/${v}.html`);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `explore/shot-${v}-${tag}.png` });
  }
  await page.close();
}
await browser.close();
console.log("done");

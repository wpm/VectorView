import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push(String(e)));

import { resolve } from "path";
await page.goto("file://" + resolve(import.meta.dirname, "..", "index.html"));
await page.waitForTimeout(2400); // let the opening animation finish

// 1. initial state screenshot
await page.screenshot({ path: "shot1_initial.png" });

// 2. analysis panel content for symmetric matrix [2,1;1,2]
const analysis = await page.textContent("#analysis");
console.log("ANALYSIS:", analysis.replace(/\s+/g, " "));

// 3. exercise a singular preset (Rank 1) + kernel toggle
await page.click("text=Rank 1");
await page.check("#tgKernel");
await page.waitForTimeout(2200);
const analysis2 = await page.textContent("#analysis");
console.log("RANK1:", analysis2.replace(/\s+/g, " "));
await page.screenshot({ path: "shot2_rank1.png" });

// 4. complex eigenvalues preset
await page.click("text=Rotate + scale");
await page.waitForTimeout(2200);
console.log("COMPLEX:", (await page.textContent("#analysis")).replace(/\s+/g, " "));

// 5. tour click
await page.click("text=Null space: what gets crushed");
await page.waitForTimeout(2200);
const card = await page.textContent("#tourCard");
console.log("TOURCARD_LEN:", card.length);
await page.screenshot({ path: "shot3_tour_nullspace.png" });

// 6. drag î basis vector on canvas (from ~(1,2)... current M is rank1 preset [1,2;0.5,1] col1=(1,0.5))
const stage = await page.locator("#canvas").boundingBox();
// compute screen pos of î head via page eval
const pos = await page.evaluate(() => {
  const M = LA.lerpFromI(S.m, S.t);
  const s = [S.origin[0] + M[0]*S.scale, S.origin[1] - M[2]*S.scale];
  return s;
});
await page.mouse.move(stage.x + pos[0], stage.y + pos[1]);
await page.mouse.down();
await page.mouse.move(stage.x + pos[0] + 120, stage.y + pos[1] - 80, { steps: 8 });
await page.mouse.up();
const mAfter = await page.evaluate(() => S.m);
console.log("M_AFTER_DRAG:", mAfter);

// 7. slider scrub
await page.fill("#tSlider", "0.5");
await page.dispatchEvent("#tSlider", "input");
await page.waitForTimeout(300);
await page.screenshot({ path: "shot4_mid_animation.png" });

// 8. iterate button + inverse + transpose
await page.click("#btnIterate");
await page.click("#btnTranspose");
await page.waitForTimeout(1900);
await page.click("#btnInverse");
await page.waitForTimeout(1900);
console.log("AFTER_OPS_M:", await page.evaluate(() => S.m));

// 9. decompose Mv toggle + circle
await page.click("text=Symmetric");
await page.check("#tgPath");
await page.check("#tgCircle");
await page.waitForTimeout(2100);
await page.screenshot({ path: "shot5_decompose.png" });

// 10. eigen tour
await page.click("text=Eigenvectors: the directions that don't turn");
await page.waitForTimeout(2200);
await page.screenshot({ path: "shot6_eigen_tour.png" });

console.log("CONSOLE_ERRORS:", errors.length ? errors : "none");
await browser.close();

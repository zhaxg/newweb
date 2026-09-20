const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });

  // 鼠标不在侧边栏：滚动条应隐藏
  await page.mouse.move(1000, 500);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/30-scrollbar-out.png", clip: { x: 0, y: 0, width: 260, height: 900 } });

  // 鼠标进入侧边栏：滚动条应低调显示
  await page.mouse.move(120, 400);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/31-scrollbar-hover.png", clip: { x: 0, y: 0, width: 260, height: 900 } });

  console.log("ERRORS:\n" + (errors.join("\n") || "(none)"));
  await browser.close();
})();

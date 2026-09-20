const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });

  const info = await page.evaluate(() => {
    const el = document.querySelector(".erp-sidebar-scroll");
    return { exists: !!el, scrollHeight: el?.scrollHeight, clientHeight: el?.clientHeight, overflow: el ? el.scrollHeight > el.clientHeight : false };
  });
  console.log("scroll info:", JSON.stringify(info));

  await page.mouse.move(120, 400);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/32-scrollbar-hover-zoom.png", clip: { x: 222, y: 60, width: 40, height: 500 } });

  await page.mouse.move(1000, 500);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/33-scrollbar-out-zoom.png", clip: { x: 222, y: 60, width: 40, height: 500 } });

  console.log("ERRORS:\n" + (errors.join("\n") || "(none)"));
  await browser.close();
})();

const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 });

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
  await page.mouse.move(120, 400);
  await page.waitForTimeout(300);

  const dbg = await page.evaluate(() => {
    const el = document.querySelector(".erp-sidebar-scroll");
    const cs = getComputedStyle(el);
    const hovered = el.closest("aside")?.matches(":hover");
    const res = {
      hovered,
      scrollbarWidth: cs.scrollbarWidth,
      scrollbarColor: cs.scrollbarColor,
      offsetWidth: el.offsetWidth,
      clientWidth: el.offsetWidth - el.clientWidth,
    };
    el.style.scrollbarColor = "rgba(128,128,128,0.6) transparent";
    res.afterInline = getComputedStyle(el).scrollbarColor;
    return res;
  });
  console.log(JSON.stringify(dbg, null, 2));
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/34-scrollbar-inline-test.png", clip: { x: 222, y: 60, width: 40, height: 500 } });

  await browser.close();
})();

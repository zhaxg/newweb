const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });

  const dbg = await page.evaluate(() => {
    const els = document.querySelectorAll(".erp-sidebar-scroll");
    const el = els[0];
    el.scrollTop = 200;
    el.style.setProperty("scrollbar-color", "red red", "important");
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      count: els.length,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      display: cs.display,
      overflowY: cs.overflowY,
      clientW: el.clientWidth,
      offsetW: el.offsetWidth,
      ua: navigator.userAgent,
    };
  });
  console.log(JSON.stringify(dbg, null, 2));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/35-scrollbar-red.png", clip: { x: 0, y: 0, width: 260, height: 900 } });
  await browser.close();
})();

const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/01-welcome.png" });

  // 打开 销售订单（树默认已展开）
  await page.getByText("销售订单", { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/02-grid.png" });

  // 右键单元格 → 上下文菜单
  const cell = page.locator(".app-tab-bar ~ div, main").locator("text=SO-202610005").first();
  if (await cell.count()) {
    await cell.click({ button: "right" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "shots/03-contextmenu.png" });
    await page.keyboard.press("Escape");
  } else {
    errors.push("MISSING_CELL: 未找到订单号单元格（表格可能未渲染）");
  }

  // 拖拽选区：点击一个单元格再 shift 点另一个
  const c1 = page.locator("text=SO-202610001").first();
  const c2 = page.locator("text=SO-202610005").first();
  if ((await c1.count()) && (await c2.count())) {
    await c1.click();
    await c2.click({ modifiers: ["Shift"] });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "shots/04-selection.png" });
  }

  // 数值列选区 → SUM/AVG 统计
  const qtyCells = page.locator("main").getByText("169", { exact: true });
  if (await qtyCells.count()) {
    await qtyCells.first().click();
    await page.locator("main").getByText("45", { exact: true }).first().click({ modifiers: ["Shift"] });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "shots/07-selection-numeric.png" });
  }

  // 主题切换 → 深色
  await page.locator('button[title="主题切换"]').click();
  await page.waitForTimeout(200);
  await page.getByText("深色", { exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/05-dark.png" });

  // 列头右键 → 列菜单（排序/过滤/冻结）
  const header = page.locator("text=quantity").first();
  if (await header.count()) {
    await header.click({ button: "right" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "shots/06-header-menu-dark.png" });
    await page.keyboard.press("Escape");
  }

  console.log("ERRORS:\n" + (errors.join("\n") || "(none)"));
  await browser.close();
})();

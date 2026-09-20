const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });

  // 1) 销售订单表格：鼠标在表格内 → 滚动条低调显示
  await page.getByText("销售订单", { exact: true }).last().click();
  await page.waitForTimeout(600);
  await page.mouse.move(800, 400);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/40-grid-scrollbar-hover.png" });
  // 鼠标移出主内容区（标题栏）→ 表格滚动条隐藏
  await page.mouse.move(700, 20);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/41-grid-scrollbar-out.png" });

  // 2) select 下拉框：用户编辑弹窗的用户类型下拉
  await page.getByText("用户", { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByText("张伟", { exact: true }).first().click();
  await page.getByText("编辑", { exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.locator('[role="dialog"]').getByText("内部用户").first().click();
  await page.waitForTimeout(300);
  await page.mouse.move(760, 420);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "shots/42-select-scrollbar.png" });

  console.log("ERRORS:\n" + (errors.join("\n") || "(none)"));
  await browser.close();
})();

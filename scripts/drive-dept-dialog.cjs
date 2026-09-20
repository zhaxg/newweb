const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
  await page.getByText("部门", { exact: true }).first().click();
  await page.waitForTimeout(500);

  // 选中一行（会计部在 财务中心 下，先展开）
  await page.locator('xpath=//span[text()="财务中心"]/preceding-sibling::button').first().click();
  await page.waitForTimeout(200);
  await page.getByText("会计部", { exact: true }).first().click();
  await page.waitForTimeout(200);
  await page.getByText("添加子部门", { exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/18-dept-dialog-redesign.png" });

  console.log("ERRORS:\n" + (errors.join("\n") || "(none)"));
  await browser.close();
})();

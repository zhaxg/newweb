const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("erp.departments"));
  await page.reload({ waitUntil: "networkidle" });

  // 打开 系统管理 > 部门
  await page.getByText("部门", { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/10-dept-list.png" });

  // 展开 财务中心（点击该行的 chevron 按钮）
  await page.locator('xpath=//span[text()="财务中心"]/preceding-sibling::button').first().click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: "shots/11-dept-expanded.png" });

  // 选中一行 → 添加子部门 → 弹编辑框
  await page.getByText("会计部", { exact: true }).first().click();
  await page.getByText("添加子部门", { exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/12-dept-edit-dialog.png" });

  // 上级部门树下拉
  await page.getByRole("button", { name: "-请选择-（顶级部门）" }).click().catch(async () => {
    await page.locator('[role="dialog"] button:has-text("会计部")').first().click();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/13-dept-parent-dropdown.png" });
  await page.keyboard.press("Escape");

  // 填写名称并保存
  await page.locator('[role="dialog"] input').first().fill("测试预算科");
  await page.locator('[role="dialog"]').getByText("保存", { exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/14-dept-saved.png" });

  // 删除有子级的部门 → 应被拦截
  await page.getByText("财务中心", { exact: true }).first().click();
  await page.getByText("删除", { exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/15-dept-del-blocked.png" });

  // 删除叶子部门 → 确认弹窗
  await page.getByText("测试预算科", { exact: true }).first().click();
  await page.getByText("删除", { exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/16-dept-confirm.png" });
  await page.locator('[role="dialog"][data-state="open"]').getByText("删除", { exact: true }).last().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/17-dept-deleted.png" });

  console.log("ERRORS:\n" + (errors.join("\n") || "(none)"));
  await browser.close();
})();

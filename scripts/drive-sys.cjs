const { chromium } = require("C:/Users/ZHAXG/AppData/Roaming/npm/node_modules/@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });

  // 用户管理
  await page.getByText("用户", { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/20-users.png" });
  // 编辑弹窗
  await page.getByText("张伟", { exact: true }).first().click();
  await page.getByText("编辑", { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/21-user-edit.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  // 角色维护
  await page.getByText("角色维护", { exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/22-user-roles.png" });
  await page.keyboard.press("Escape");

  // 角色管理
  await page.getByText("角色", { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/23-roles.png" });
  await page.locator("main input").nth(1).click(); // 第一行角色名称输入框（冒泡选中行）
  await page.getByText("菜单与功能权限", { exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/24-role-perms.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await page.locator("main input").nth(1).click();
  await page.getByText("编辑用户", { exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/25-role-users.png" });
  await page.keyboard.press("Escape");

  // 菜单管理
  await page.getByText("菜单", { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/26-menus.png" });
  await page.locator('xpath=//span[contains(text(),"PU3100-采购执行")]/preceding-sibling::button').first().click();
  await page.waitForTimeout(200);
  await page.locator("main").getByText("PU3110-采购订单").first().click();
  await page.getByText("子级功能点", { exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/27-menu-btns.png" });
  await page.keyboard.press("Escape");

  // 键值对
  await page.getByText("键值对", { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/28-kv.png" });

  // 审计日志
  await page.getByText("审计日志", { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "shots/29-audit.png" });

  console.log("ERRORS:\n" + (errors.join("\n") || "(none)"));
  await browser.close();
})();

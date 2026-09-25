#!/usr/bin/env node
/**
 * 迁移页面浏览器实测（登录 → 进画面 → 逐页签截图 → 报错计数）
 *
 * 用法：
 *   node verify-page.mjs --menu "质量管理,带钢工艺标准,执行标准管理" [--tabs 成分,性能,取样,其他]
 *   node verify-page.mjs /A685838019735557B/.../sqm-tqmtd10-684485      # 直接给路由
 *
 * 选项：
 *   --base <url>   默认自动探测 5173/5174
 *   --out <前缀>   截图输出前缀，默认 temp/verify
 *   --user <账号>  默认 admin（Mock 模式任意密码）
 *   --full         整页截图（默认只截内容区）
 *
 * 退出码：0 = 无 overlay 且无 console 错误；1 = 有异常需修
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const positional = argv.find(
  (a, i) => !a.startsWith("--") && !["--menu", "--base", "--out", "--user", "--tabs"].includes(argv[i - 1]),
);
const MENU = opt("menu", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TABS = opt("tabs", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OUT = opt("out", "temp/verify");
const USER = opt("user", "admin");

const { chromium } = loadPlaywright();
// root/容器下 Chromium 需 no-sandbox；/dev/shm 小、无 GPU 时 renderer 会直接 crash（waitForTimeout: Page crashed）
const browser = await chromium.launch({
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--no-zygote",
    "--single-process",
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const issues = [];
page.on("console", (m) => m.type() === "error" && issues.push("console: " + m.text().slice(0, 200)));
page.on("pageerror", (e) => issues.push("pageerror: " + e.message.slice(0, 200)));

const BASE = await pickBase(opt("base", ""));
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);
// 用户名可能被首屏其它 input 抢占，优先按 placeholder；失败再退回 first()
const userInput = page.getByPlaceholder(/用户名/).first();
await ((await userInput.count()) ? userInput : page.locator("input").first()).fill(USER);
const pwd = page.locator("input").nth(1);
await pwd.click();
await pwd.pressSequentially("123456", { delay: 20 });
dropOverlay(page);
await page
  .getByText("点击开始人机验证")
  .first()
  .click({ timeout: 8000 })
  .catch(() => {});
// 等人机验证通过再点登录，否则偶发停在登录页
await page
  .getByText("验证成功")
  .first()
  .waitFor({ timeout: 10000 })
  .catch(() => {});
await page.waitForTimeout(800);
await page
  .getByRole("button", { name: /登\s*录/ })
  .first()
  .click({ timeout: 8000 })
  .catch(() => {});
await page.waitForTimeout(6000);
// 仍停在登录则再试一次（验证码偶发失效）
if (page.url().includes("/login")) {
  await page
    .getByText("点击开始人机验证")
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page
    .getByText("验证成功")
    .first()
    .waitFor({ timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(500);
  await page
    .getByRole("button", { name: /登\s*录/ })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(6000);
}

if (MENU.length) {
  for (const m of MENU) {
    await page
      .getByText(m, { exact: true })
      .first()
      .click({ timeout: 8000 })
      .catch((e) => issues.push(`menu "${m}": ${e.message.split("\n")[0]}`));
    await page.waitForTimeout(1200);
  }
} else if (positional) {
  await page.goto(BASE.replace(/\/$/, "") + (positional.startsWith("/") ? positional : "/" + positional), {
    waitUntil: "domcontentloaded",
  });
}
await page.waitForTimeout(5000);

mkdirSync(dirname(OUT), { recursive: true });
await snap("00");
for (const t of TABS) {
  await page
    .getByRole("tab", { name: t })
    .first()
    .click({ timeout: 5000 })
    .catch(async () => {
      await page
        .getByText(t, { exact: true })
        .last()
        .click({ timeout: 5000 })
        .catch((e) => issues.push(`tab "${t}": ${e.message.split("\n")[0]}`));
    });
  await page.waitForTimeout(2000);
  await snap(t);
}

const overlays = await page.locator("vite-error-overlay").count();
const grids = await page.locator(".ag-root-wrapper").count();
const tabs = await page.locator('[role="tab"]').count();
console.log(`base=${BASE}`);
console.log(`url=${page.url()}`);
console.log(`grids=${grids} tabs=${tabs} vite-error-overlay=${overlays} issues=${issues.length}`);
issues.slice(0, 10).forEach((i) => console.log("  ! " + i));
console.log(overlays === 0 && issues.length === 0 ? "PASS" : "FAIL");
await browser.close();
process.exit(overlays === 0 && issues.length === 0 ? 0 : 1);

async function snap(tag) {
  dropOverlay(page);
  const target = argv.includes("--full") ? page : page.locator("main, #app, body").first();
  await target.screenshot({ path: `${OUT}-${tag}.png` }).catch(() => page.screenshot({ path: `${OUT}-${tag}.png` }));
}
function dropOverlay(p) {
  p.evaluate(() => document.querySelectorAll("vite-error-overlay").forEach((o) => o.remove()));
}
async function pickBase(given) {
  const list = given ? [given] : ["http://localhost:5173/", "http://localhost:5174/"];
  const mark = appTitle();
  const wrong = [];
  for (const u of list) {
    let html;
    try {
      const r = await fetch(u, { method: "GET" });
      if (!r.ok) continue;
      html = await r.text();
    } catch {
      continue;
    }
    if (!mark || html.includes(mark)) return u;
    wrong.push(`  ${u} 端口上跑的不是本项目（<title> 里没有「${mark}」）`);
  }
  console.log(
    wrong.length
      ? `FAIL: 自动探测的端口都不是本项目：\n${wrong.join("\n")}\n用 --base http://localhost:<本项目端口> 显式指定`
      : "FAIL: 开发服务器未启动，先跑 npm run dev",
  );
  process.exit(1);
}
/** 身份指纹取自仓库 index.html 的 <title>；读不到就退回「任意 200 即认为可用」 */
function appTitle() {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
    return /<title>([^<]+)<\/title>/.exec(readFileSync(join(root, "index.html"), "utf8"))?.[1] ?? "";
  } catch {
    return "";
  }
}
function loadPlaywright() {
  const roots = [fileURLToPath(import.meta.url)];
  try {
    roots.push(join(execSync("npm root -g", { encoding: "utf8" }).trim(), "x.js"));
  } catch {
    /* 无 npm */
  }
  for (const r of roots) {
    const req = createRequire(r);
    for (const name of ["playwright-core", "playwright", "@playwright/test"]) {
      try {
        return req(name);
      } catch {
        /* 试下一个 */
      }
    }
  }
  console.log("FAIL: 找不到 playwright-core。执行 npm i -D playwright-core（或 npm i -g @playwright/test）后重试。");
  process.exit(1);
}

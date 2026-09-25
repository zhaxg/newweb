# AGENTS.md

给在本仓库工作的 AI agent / 新人的最小必要说明。**读完这一页再动手**。
人看的完整文档在 `README.md`；界面迁移规则在 `.qoder/skills/winforms-screen-migration/`。

---

## 1. 这是什么

给业务团队用的**前端基础设施平台**（Vue 3 + TS + Vite 8 + PrimeVue 5 + Tailwind 4 + AG Grid 36）。
`src/pages` 下的大写目录是各业务组的模块，平台负责壳层、路由、权限、主题、表格、mock、构建。

评价标准是**业务组挑不出毛病**：美观、简洁、好用、成熟、稳定。改框架层时按这个标准自检。

---

## 2. 最重要的一条边界

```
src/pages/  DDH  LIMS  SHR  SMP  SMS  SQM  SYD  Widgets   ← 业务组的【未写完示例】
```

- **不要评审、不要建议重构、不要在这几个目录里做"顺手清理"。**
- 只有当业务层代码是**平台层缺陷的证据**时才引用它，并且要点明根因在平台侧
  （例：283 个页面重复 ag-Grid 接线 → 说明平台缺 `<HmxGrid>` 聚合组件，不是让业务层去改）。
- 例外：`src/pages/_core`（登录/首页/个人中心）与 `src/pages/admin`（系统管理）是**平台自己的页面**，可以动。

框架层范围：`src/api/_core` `src/api/common` `src/api/admin` `src/router` `src/stores`
`src/lib` `src/composables` `src/layouts` `src/components` `src/styles` `src/mock`
`src/pages/_core` `src/pages/admin` + 根配置。

---

## 3. 命令

| 目的 | 命令 | 现状 |
|---|---|---|
| 开发服务器（mock） | `npm run dev` | ✅ |
| 生产构建 | `npm run build` | ✅ `.env.production` 已设 `VITE_USE_MOCK=false` |
| **静态检查门槛（替代原 vue-tsc）** | `npm run lint`（`typecheck` 为其别名） | ⚠️ 全仓 1 error + 250 warning：唯一 error 在业务示例 `SYD/YD2020/index.vue` 的自赋值 no-op（`no-self-assign`）；**框架层 0 error** |
| 字阶纪律审计 | `npm run audit:ui` | ⚠️ 当前 174 处违规、exit 1，多数在业务示例里（含 R5 存量 67 个未标 `autofocus` 的 Dialog；**框架层 0**） |
| 格式化 | `npm run format` / `npm run format:check` | ✅ 已接入 oxfmt（`.oxfmtrc.json`：printWidth 120、LF、忽略 `*.md`），全仓已格式化一遍 |

### 静态检查分工（vue-tsc 已退役）

`vue-tsc` 因 `tsconfig.json` 的 `baseUrl` 触发 TS5101 会跳过全部文件级诊断（假绿），
且仓库已删除 `tsconfig.json`，**类型级门槛暂停**，代之以 `oxlint`（`.oxlintrc.json`：
correctness=error、suspicious=warn；`.qoder` 不参与扫描；`primeLcmgr.ts` 单独豁免 `no-unused-vars`）。
要恢复类型门槛时：补一份无 `baseUrl` 的精简 `tsconfig.json`（仅 IDE/类型用）再评估 vue-tsc。

---

## 4. 架构骨架（改之前先定位）

### 4.1 菜单/路由的单真源链路（三层，各管一段）

```
后端 getUserRescList 平铺资源表
   │  ① src/api/common/menuRescTree.ts     → MenuResNode 语义树（唯一读后端 cXxx 字段处）
   ▼
MenuResNode
   │  ② src/router/fromMenu.ts             → RouteRecordRaw（路由编译：iframe/blank 策略、
   ▼                                          组件解析、pageId 命名；glob 预扫描 src/pages）
RouteRecordRaw
   │  ③ src/layouts/composables/menuFromRoutes.ts  → HmxMenuNode（菜单投影）
   ▼
侧栏 Tree / 顶栏 TieredMenu
```

**菜单不是独立数据结构，是路由表的投影**，`meta.hidden` 是不进菜单的唯一开关。
新增"菜单和实际能跳的页不一致"这类问题，先检查是不是有第二份数据混进来了。

### 4.2 路由三阶段（`src/router/index.ts`）

| 阶段 | 时机 | 做什么 |
|---|---|---|
| 一 | 模块求值 | 静态骨架 + `layouts.ts` 注册表按 `meta.layout` 生成布局父记录 |
| 二 | 登录后 | `perm.loadForUser()` → `toRouteRecords()` → `registerUserRoutes()` 挂进默认布局 |
| 三 | 退出 | `resetUserRoutes()` 整体移除，菜单回落到静态骨架（实现与状态在 `src/router/dynamicRoutes.ts`） |

守卫在 `src/router/guard.ts`（登录 → 动态注册 → 越权落 403 → router→tabs 单向同步）。
**循环依赖边界**：MainLayout / request / usePermission 等消费方只准 import 叶模块
`src/router/dynamicRoutes.ts`（动态路由清理）与 `src/router/bridge.ts`（router 实例桥），
反向 import `@/router`（index）会成环（index 依赖 layouts 注册表、request 经 guard→store→api 绕回）。
**加布局**只改 `src/layouts/composables/layouts.ts` 的注册表，不动 index。
**加业务页**写 `src/router/business.ts`（会进菜单的页走后端资源下发，不写这里）。

### 4.3 分层速查

| 想改什么 | 去哪 |
|---|---|
| 请求封装 / 401 / 错误信封 | `src/api/_core/request.ts` |
| 全局点击连击闸（防双击） | `src/lib/clickGuard.ts`（main.ts 挂载） |
| mock 开关、mock 路由 | `src/api/_core/request.ts:11` · `src/mock/mockAdapter.ts` |
| 主题预设 / PrimeVue locale | `src/lib/primeTheme.ts`（`HmxCompact`） |
| 主题色运行时覆盖 | `src/lib/themeSettings.ts` + `src/stores/settingsStore.ts` |
| 设计 token / 字阶 | `src/styles/tokens.css` · `globals.css`（`@theme`） |
| AG Grid 全局默认 | `src/lib/agGrid.ts`（`hmxDefaultColDef` / `makeHmxGridTheme`） |
| 图标解析 | `src/lib/tablerIcons.ts` |
| 按钮权限 `v-hp` | `src/composables/usePermission.ts` · `stores/permissionStore.ts` |
| 壳层布局 / 页签 | `src/layouts/MainLayout.vue` · `components/chromeTabs/` |
| localStorage 加密 | `src/lib/encryptedStorage.ts` |

---

## 5. 硬规则（红线）

1. **字阶只有四档**：`text-xs`(12) / `text-body`(13) / `text-sm`(14) / `text-base`(16)。
   禁止 `text-[14px]` 之类 arbitrary 字号、禁止越档类（`text-lg` 等）、禁止 `size="small"`（PrimeVue 已是紧凑档）。
   字段 label 唯一写法：`text-xs text-muted-foreground`。
   机检 `npm run audit:ui`；确需豁免就在该行加 `/* audit-allow */`。
2. **mock 与真实后端走同一条前端链路**，mock 只在 `src/mock/` 下，不许散进 `src/api`/`src/lib`。
   目录规范见 README「Mock 目录规范」。`VITE_USE_MOCK` 只有**精确等于 `"false"`** 才关
   （`request.ts:11` 是 `!== "false"`，写 `0`/`no`/`off` 都会被当成开）。
   **mock「后端」是刻意的 demo 壳子，不是安全模型**：`src/mock/admin/auth.ts` 对任意账密发 token、
   非 `mock-token.` 前缀一律回落 admin、验证码永远对、`getUserRescList` 无视用户全量下发、写操作进
   localStorage——这些都是设计意图（mock 层没有真实服务和数据库，宽松才能当演示壳用），
   **不是漏洞，不要"修复"、不要在评审/分析里当安全问题点名**。mock 相关的唯一红线是第 3 条。
3. **生产构建不得带 mock**：`.env.production` 必须保持 `VITE_USE_MOCK=false`。
4. **懒加载边界**：只有 `router/builtin.ts` 的骨架页（登录/首页/403）和 `layouts.ts` 的布局父记录
   允许静态 import —— 它们本来就在首屏链路上。业务页一律走 `fromMenu.ts` 的 `import.meta.glob` 懒加载；
   重型依赖（Univer、vue-print-designer）必须 `defineAsyncComponent` / 动态 `import()`，
   不得出现在静态 import 链里。**新增静态 import 到 `main.ts` → `router` → `layouts` 这条链 = 让全体用户多下体积。**
5. **注释写"为什么"不写"是什么"**。本仓库注释密度高、有根因和版本号，保持这个水准。
6. **中文文案**与现有风格一致（按钮动词化、无标点结尾、toast 短句）。
7. **每个 `<Dialog>` 必须主动标 `autofocus` 初始焦点**（表单弹窗→首个可用输入框、确认类→右下主按钮）。
   PrimeVue `Dialog.focus()` 找不到标记就兜底聚焦右上角关闭按钮（回车/空格误触关闭）；
   **不许**给上游 Dialog 打全局 focus 补丁（曾覆写私有 `methods.focus`，已移除——见 `src/lib/primeTheme.ts` 注释）。
   机检 `npm run audit:ui` R5；坑点全文见 `.qoder/skills/winforms-screen-migration/references/ui-rules.md` §2。

---

## 6. 已知坑（别踩、也别当成新发现）

- **`oxlint` / `oxfmt` 已接入**（`.oxlintrc.json` + `.oxfmtrc.json` + npm scripts）。现状：
  框架层 0 error / 47 warning，全仓唯一 error 是业务示例 `SYD/YD2020` 的 `no-self-assign`。
  oxfmt 是**格式化真源**：写完代码 `npm run format`，验收 `npm run format:check`；`*.md` 不参与。
  lint 分级：correctness=error（挂 CI 阻断），suspicious=warn；`unicorn/no-useless-*` 等风格规则降为 warn，
  `primeLcmgr.ts` 单独豁免 `no-unused-vars`（许可桩文件，见下方许可坑）。`.qoder/` 不扫描。
- **行尾**：`.gitattributes` 已建立（`* text=auto eol=lf`），工作区统一 LF，oxfmt `endOfLine=lf` 与之配套。
- **`.env` 里有 7 个变量无人消费**：`VITE_MOBILE_ROUTER_NAMESPACE`、`VITE_APP_NAMESPACE`、
  `VITE_BASE_URL`、`VITE_API_URL_PREFIX`（接口前缀实际硬编码在 `request.ts:58`）、
  `VITE_APP_NAME`、`VITE_CUSTOMER`、`VITE_COPYRIGHT`（标题硬编码在 `index.html`）。
  **改了不生效**；新增 `VITE_` 变量要同时补 `src/env.d.ts` 并真正读取它。
- **`NextStrId()`（`src/lib/yitIdHelper.ts`）已修复为可用**（原实现状态写在函数体内每次重置、
  WorkerId 每次重掷，同毫秒几乎必然碰撞）：现为模块级状态 + sessionStorage 固定 WorkerId +
  虚拟时钟防回拨/溢出借位，同毫秒唯一且单调递增。**仅 64 个/毫秒**，跨标签页靠 6-bit WorkerId
  区分（同毫秒两页碰撞概率 1/64）；无此约束的场景仍首选 `crypto.randomUUID()`。
- **许可相关是硬编码的**：`vite.config.ts` 把 `@primeui/license-manager` alias 到
  `src/lib/primeLcmgr.ts`（恒返回 valid），`agGrid.ts:71` 有明文 AG Grid 企业版 key，
  `prime-overrides.css` 隐藏 `#p-license-host`。**动这几个文件前先确认授权状态**，不要"顺手清理"。
- **`encryptedStorage` 是混淆不是安全**：`VITE_` 变量会内联进 bundle，密钥公开。
  别把它当访问控制来设计安全方案。
- **权限默认放行**：`permissionStore.hasPermission` 三道兜底全返回 `true`（fail-open），
  `v-hp` 目前全仓零使用。前端隐藏**不构成安全边界**，后端必须自行校验。
- **网络层刻意「无重试 · 无全局取消 · 无请求合并」**（评审别当缺陷点名）：
  生成器查询也走 POST、幂等不可知，重试即双写风险（15s timeout 已兜底）；KeepAlive 多页签下
  后台轮询在途请求无归属，启发式「离页即取消」必误杀缓存页；同参合并且会悄悄改轮询/刷新语义。
  并发保护只做了 **401 单飞闸**（`request.ts`：并发 401 仅第一个执行登出 + toast + 回登录页）。
- **全局点击连击闸**（`clickGuard.ts`）在 500ms 内吞同一 button 的第二击（capture 吞事件、
  不翻 disabled，避免和 `:loading` 互踩）——调试「点击没反应」先想到它；
  「响应完毕前不可再点」的契约仍是页面 `:loading` 的责任，闸只兜双击/三击。
- **`globalError` 刻意抑制原生 unhandledrejection 输出**（已接管：console 全量留痕 + toast 克制提示，
  同类错误 3s 去重）——`preventDefault()` 是设计行为，别当 bug 去掉。
- **全局禁用右键**（`App.vue:25`），是刻意行为不是 bug。
- **图标有两套加载策略**互相打架：`tablerIcons.ts` 的 `import.meta.glob` 懒加载
  vs 全仓 300 处 `import { IconX } from "@tabler/icons-vue"`（barrel 静态 re-export 全量）。
  构建因此产出 6000+ 个 chunk，且持续刷 `INEFFECTIVE_DYNAMIC_IMPORT` 警告——**是已知问题，不是新引入的**。

---

## 7. 提交前自检

```bash
npm run lint                                     # oxlint 静态门槛（原 vue-tsc 位置）
npm run format:check                             # 格式（oxfmt，不改动时秒级通过）
npm run audit:ui                                 # 字阶纪律
npm run build                                    # 能否构建
```

改动涉及路由/菜单/布局时，手动验证三条路径：**登录 → 首次导航**、**刷新页面**、**登出再登入**。
改动涉及主题/token 时，浅色和深色都看一眼。

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
| 生产构建 | `npm run build` | ✅ `.env.production` 已设 `VITE_USE_MOCK=false`；产 `.gz` 静态预压缩（钩子用 `writeBundle`，见 `vite.config.ts` 注释） |
| **静态检查门槛（替代原 vue-tsc）** | `npm run lint`（`typecheck` 为其别名） | ⚠️ 全仓 1 error + 234 warning：唯一 error 在业务示例 `SYD/YD2020/index.vue:189` 的自赋值 no-op（`no-self-assign`）；**框架层 0 error / 31 warning** |
| 字阶纪律审计 | `npm run audit:ui` | ⚠️ 当前 174 处违规、exit 1（R2 89 · R5 67 · R4 15 · R3 2 · R1 1），多数在业务示例里；**框架层 9 处**：`pages/_core` 5 · `layouts/pages` 2 · `components/common` 2 |
| 格式化 | `npm run format` / `npm run format:check` | ✅ 已接入 oxfmt（`.oxfmtrc.json`：printWidth 120、LF、忽略 `*.md`），全仓已格式化一遍 |

### 静态检查分工（vue-tsc 已退役）

`vue-tsc` 因 `tsconfig.json` 的 `baseUrl` 触发 TS5101 会跳过全部文件级诊断（假绿），
且仓库已删除 `tsconfig.json`，**类型级门槛暂停**，代之以 `oxlint`（`.oxlintrc.json`：
correctness=error、suspicious=warn；`.qoder` 不参与扫描。**无 overrides**——原先为 `primeLcmgr.ts` 开的
`no-unused-vars` 豁免已删（改为给它的未用参数加 `_` 前缀，签名不变）。
要恢复类型门槛时：补一份无 `baseUrl` 的精简 `tsconfig.json`（仅 IDE/类型用）再评估 vue-tsc。

---

## 4. 架构骨架（改之前先定位）

### 4.1 菜单/路由的单真源链路（三层，各管一段）

```
后端 getUserRescList 平铺资源表
   │  ① src/api/common/menuRescTree.ts     → MenuResNode 语义树（唯一读后端 cXxx 字段处）
   ▼
MenuResNode
   │  ② src/router/core/fromMenu.ts             → RouteRecordRaw（路由编译：iframe/blank 策略、
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
| 一 | 模块求值 | 静态骨架 + `layouts.ts` 注册表按 `meta.layout` 生成布局父记录（仍在 `index.ts`） |
| 二 | 登录后 | `perm.loadForUser()` → `toRouteRecords()` → `registerUserRoutes(默认布局名, records)` 挂进默认布局 |
| 三 | 退出 | **落到 `/login` 即触发**：守卫在 public 分支里 `perm.reset()` + `resetUserRoutes()`，菜单回落静态骨架 |

阶段二/三的实现与状态同在 `src/router/core/dynamicRoutes.ts`（一对 register/remove 收在一处）。

> ⚠️ **文件夹记录必须带 `name`（`folder:${祖先链路径}`）**，否则清理静默失效：Vue Router 的
> `addRoute` 移除器**按 name 移除**，无名记录的移除器是**空操作**。`fromMenu.ts` 早期生成的顶层
> 分组记录就没有 name，导致 `resetUserRoutes()` 一直没生效——登出后 434 条动态路由留在路由表里
> （实测确认，2026-09 修复）。菜单回退是好的（`setUserMenuRoutes([])` 与路由表无关），所以
> 这个 bug 用户看不出来，只在换账号登录时以「旧菜单路由残留」的形式显形。加 `folder:` 前缀即可，
> 带 name 的父记录无 component，RouterView 照旧跳过该层。

守卫在 `src/router/core/guard.ts`（登录 → 动态注册 → 越权落 403 → router→tabs 单向同步）。

**目录分层**：`src/router/` 根下只留**你会改的三样**——`index.ts`（阶段一装配 + 阶段二/三注入）、
`builtin.ts`（骨架页）、`business.ts`（业务静态路由）；**不常改的机制**收进 `src/router/core/`：

```
src/router/
├─ index.ts          # 阶段一装配 + 绑定 router/布局名注入守卫（加布局/改装配动这里）
├─ builtin.ts        # 登录/首页/403/404 骨架页
├─ business.ts       # 业务静态路由
└─ core/             # 机制层，日常不动
   ├─ routeMeta.ts      RouteMeta 类型增强（纯类型，靠 index 的 side-effect import 生效）
   ├─ dynamicRoutes.ts  阶段二 register + 阶段三 reset
   ├─ guard.ts          守卫：导航拦截 + 落到 /login 的清理 + 认证失败处理器注册
   └─ fromMenu.ts       后端资源 → 路由记录编译
```

> ✅ **一句话规则：`src/router/` 对外零消费方。** 需要 router 实例一律走**注入**，不 import——
> 传输层用 `setAuthFailureHandler`（由 guard 注册），指令层用 `app.use(hmxPermissionPlugin, { router })`
> （由 main.ts 传入）。原先为破环而设的 `core/bridge.ts` 已删除。

> **这条边界**曾经**由 lint 强制**（`no-restricted-imports` 禁 `@/router`），2026-09 按「配置尽量简单」
> 的要求去掉了——现在零违规、纯靠约定与上面这段说明。**代价要清楚**：若有人在 `request.ts` 之类
> 的位置重新 `import ... from "@/router"`，环会悄悄回来且没有任何工具会拦。

### 4.2.1 依赖倒置：传输层不认识 store 与 router

`api/_core/request.ts` 是依赖图最底层（`api/common/menuRescTree` → `api/admin/request` → 它），
**反向 import store / router 必成环**。曾经有两处这样的回边：

| 曾经的环 | 现状 |
|---|---|
| `request → @/router`（认证失败要导航） | 改为 `setAuthFailureHandler` 注入，由 guard 注册 |
| `request ↔ authStore`（读 token / 登出） | 改为 `setTokenProvider` 注入，由 authStore 注册 |

`authStore → api/admin/request → _core/request → authStore` 是**真实的双向环**（AGENTS 挂了很久的
「余下 request↔store 同族环另行处理」）。倒置后箭头单向：**应用 → 传输**。

```ts
// _core/request.ts —— 只声明，不认识 store/router
let tokenProvider = () => notWired("tokenProvider");   // 未接线即抛，不静默「请求不带 token」
export function setTokenProvider(fn) { ... }
export function setAuthFailureHandler(fn) { ... }

// authStore（拥有 token）：首次实例化时注册
setTokenProvider(() => session.value?.token);

// router/core/guard（拥有导航）：模块求值时注册
setAuthFailureHandler(() => { auth.logout(); return router.replace({ name: "login", ... }); });
```

这是 soybean-admin `@sa/axios` 的做法——那个包对应用**零知识**，行为全由 `onRequest` /
`isBackendSuccess` / `onBackendFail` 等 hook 注入。判定与并发单飞闸留在传输层（它的关注点），
「怎么做」交给注入方。

> **为什么不用 re-export 表达这条边界**：在 index 里 `export { getRouter } from "..."` 看似提供了
> 安全入口，实则更危险——消费方仍得 `import ... from "@/router"`，而**import index 这个动作本身**
> 就会拉进 guard → permissionStore → menuRescTree → api/admin/request → _core/request，精确复现那条环。
> re-export 只是把叶模块伪装成安全的，改不了 index 的静态依赖图。**把桥的代码合并进 index 更糟**——
> 连「零依赖」这个性质都丢了。正解是倒置，让消费方根本不需要那个实例。

> **为什么清理挂在守卫而不是调用方**（曾经不是）：早先 `MainLayout.logout()` 与 `request` 的认证失败
> 各自调 `resetUserRoutes()` + `perm.reset()`，于是这两个**外部**文件都得 import router 内部模块。
> 改为「落到 `/login` 就地清理」后，调用方只负责导航。对标 tdesign-starter 确认这是更简的路子。

> `dynamicRoutes.ts` 的 `registerUserRoutes(router, layoutName, records)` **把 router 与布局名都做成
> 参数**，正是因为两者分别住在 `@/router/index` 与 `@/layouts/composables/layouts`——import 任一都会造回边。
> 绑定在 `index.ts` 的 `setupRouterGuards` 注入处完成。

**加布局**只改 `src/layouts/composables/layouts.ts` 的注册表，不动 index。
**加业务页**写 `src/router/business.ts`（会进菜单的页走后端资源下发，不写这里）。

### 4.3 分层速查

| 想改什么 | 去哪 |
|---|---|
| 请求封装 / 认证失败 / 错误信封 | `src/api/_core/request.ts` |
| 认证失败后怎么办（登出+导航） | `setAuthFailureHandler`，注册在 `src/router/core/guard.ts` |
| token 从哪来 | `setTokenProvider`，注册在 `src/stores/authStore.ts` |
| 全局点击连击闸（防双击） | `src/lib/clickGuard.ts`（main.ts 挂载） |
| mock 开关、mock 路由 | `src/api/_core/request.ts` 的 `USE_MOCK` · `src/mock/mockAdapter.ts` |
| 主题预设 / PrimeVue locale | `src/lib/primeTheme.ts`（`HmxCompact`） |
| 主题色运行时覆盖 | `src/lib/themeSettings.ts` + `src/stores/settingsStore.ts` |
| 设计 token / 字阶 | `src/styles/tokens.css` · `globals.css`（`@theme`） |
| AG Grid 全局默认 | `src/lib/agGrid.ts`（`hmxDefaultColDef` / `makeHmxGridTheme`） |
| 图标解析（壳层，首屏链） | `src/lib/tablerIcons.ts`（白名单 + 兜底） |
| 图标全量注册表（勿进首屏） | `src/lib/tablerIconRegistry.ts`（仅 IconPicker 用） |
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
   （`request.ts` 的 `USE_MOCK` 是 `!== "false"`，写 `0`/`no`/`off` 都会被当成开）。
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
  框架层 0 error / 31 warning，全仓唯一 error 是业务示例 `SYD/YD2020` 的 `no-self-assign`。
  oxfmt 是**格式化真源**：写完代码 `npm run format`，验收 `npm run format:check`；`*.md` 不参与。
  lint 分级：correctness=error（挂 CI 阻断），suspicious=warn；`unicorn/no-useless-*` 等风格规则降为 warn，
  `.qoder/` 不扫描。**配置刻意保持最小**：无 overrides、无自定义限制规则；`rules` 里那 4 条
  `unicorn/*` 设成 `warn` 是**降级**（它们属 `correctness`，默认是 error）——业务示例里有一批
  `{...(x ?? {})}` 写法会因此报 error，而 AGENTS §2 不许动业务目录，故必须降级挡在门外。
- **行尾**：`.gitattributes` 已建立（`* text=auto eol=lf`），工作区统一 LF，oxfmt `endOfLine=lf` 与之配套。
- **`.env` 里有 7 个变量无人消费**：`VITE_MOBILE_ROUTER_NAMESPACE`、`VITE_APP_NAMESPACE`、
  `VITE_BASE_URL`、`VITE_API_URL_PREFIX`（接口前缀实际硬编码在 `request.ts` 的 `withApiPrefix()`）、
  `VITE_APP_NAME`、`VITE_CUSTOMER`、`VITE_COPYRIGHT`（标题硬编码在 `index.html`）。
  **改了不生效**；新增 `VITE_` 变量要同时补 `src/env.d.ts` 并真正读取它。
- **`NextStrId()`（`src/lib/yitIdHelper.ts`）已修复为可用**（原实现状态写在函数体内每次重置、
  WorkerId 每次重掷，同毫秒几乎必然碰撞）：现为模块级状态 + sessionStorage 固定 WorkerId +
  虚拟时钟防回拨/溢出借位，同毫秒唯一且单调递增。**仅 64 个/毫秒**，跨标签页靠 6-bit WorkerId
  区分（同毫秒两页碰撞概率 1/64）；无此约束的场景仍首选 `crypto.randomUUID()`。
- **许可相关是硬编码的**：`vite.config.ts` 把 `@primeui/license-manager` alias 到
  `src/lib/primeLcmgr.ts`（恒返回 valid），`agGrid.ts:136` 有明文 AG Grid 企业版 key，
  `prime-overrides.css` 隐藏 `#p-license-host`。**动这几个文件前先确认授权状态**，不要"顺手清理"。
- **`encryptedStorage` 是混淆不是安全**：`VITE_` 变量会内联进 bundle，密钥公开。
  别把它当访问控制来设计安全方案。
- **权限默认放行**：`permissionStore.hasPermission` 三道兜底全返回 `true`（fail-open），
  `v-hp` 目前全仓零使用。前端隐藏**不构成安全边界**，后端必须自行校验。
- **网络层刻意「无重试 · 无全局取消 · 无请求合并」**（评审别当缺陷点名）：
  生成器查询也走 POST、幂等不可知，重试即双写风险（15s timeout 已兜底）；KeepAlive 多页签下
  后台轮询在途请求无归属，启发式「离页即取消」必误杀缓存页；同参合并且会悄悄改轮询/刷新语义。
  并发保护只做了 **认证失败单飞闸**（`request.ts`：并发认证失败仅第一个执行登出 + toast + 回登录页）。
- **认证失败是「信封式」不是 HTTP 401**——别按状态码判。真实后端返回的是
  `HTTP 200` + `{success:false, code:"401", message:"hmxapi: User is not authenticated"}`，
  **`code` 是字符串**（mock 原先发 HTTP 401 + 数字码，与真实后端不符，见下）。
  判定统一走 `request.ts` 的 `isUnauthenticated()`（`String(code) === "401"`，兼容字符串与数字），
  HTTP 401 分支仅作网关/代理兜底。**这个不一致曾导致会话过期在生产环境只弹一个 message toast、
  既不登出也不跳转**，用户卡在死页面（2026-09 修正）。改一处判定时，另一条分支要一起看。
- **mock 的保真度是这个 bug 的温床**：`mockAdapter` 原以 HTTP 401 表达认证失败，于是演示环境走 401
  分支一切正常、生产走信封分支静默失效。现已按真实形状改为 `HTTP 200 + envelope(false, "401", ...)`。
  新增 mock 端点时，**响应的形状（状态码 + 信封字段类型）要对齐真实后端**，否则又会掩盖同类问题。
- **全局点击连击闸**（`clickGuard.ts`）在 500ms 内吞同一 button 的第二击（capture 吞事件、
  不翻 disabled，避免和 `:loading` 互踩）——调试「点击没反应」先想到它；
  「响应完毕前不可再点」的契约仍是页面 `:loading` 的责任，闸只兜双击/三击。
- **`globalError` 刻意抑制原生 unhandledrejection 输出**（已接管：console 全量留痕 + toast 克制提示，
  同类错误 3s 去重）——`preventDefault()` 是设计行为，别当 bug 去掉。
- **全局禁用右键**（`App.vue:25`），是刻意行为不是 bug。
- **图标加载分两层**（2026-09 拆，此前全量注册表在首屏）：
  - `lib/tablerIcons.ts` —— **壳层侧，在首屏链上**。持一份**白名单小映射**（后端菜单 cIcon +
    静态路由 meta.icon + 兜底 File + gen 页硬编码，见该文件里的花括号模式）。未收录的名字走
    **兜底动态 import** `lib/tablerIconRegistry.ts`，所以白名单**漏了不会坏**，只是那次多下一个 chunk。
  - `lib/tablerIconRegistry.ts` —— **全量 6202 个，刻意不在首屏链上**。只有
    `pages/admin/resc/IconPicker.vue` 直接 import（它要全量做搜索）。
  拆分前全量 glob 内联 6202 条映射，实测占 entry chunk **1,177,347 B（约 70%）**；拆后 entry
  原始 1.67 MB → **494 KB**、gz 299 KB → **117 KB**。
  **别把 glob 挪回 tablerIcons.ts**。完整性自检：dev 下开首页看 Network，若出现
  `tablerIconRegistry` 请求就是白名单漏了图标（优化被悄悄抵消）。
- **barrel 静态 import 仍在**：全仓约 300 处 `import { IconX } from "@tabler/icons-vue"`
  （业务页自己用，不经 `tablerIcon()`），构建因此仍产出 6000+ chunk 并刷
  `INEFFECTIVE_DYNAMIC_IMPORT` 警告——**是已知问题，不是新引入的**；它与上面的两层拆分是两件事。

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

---

## 8. AI 自动化测试：免登录 + 免等遮罩

自动化测试（Playwright 等）不必走登录 UI，也不必等刷新遮罩淡出。两个机制都是**测试侧注入**，
不需要改动应用代码。

### 8.1 免登录：直接种入会话

mock 模式下 `getUserRescList` 无视用户全量下发，token 不参与校验，所以任何 token 都能登录。
会话在 localStorage 的 `hmx.auth-session`，值经 `lib/encryptedStorage` **AES 加密**——不能直接塞明文 JSON。

**固定 token**：`mock-token.admin`（`mock-token.` 前缀后的首段会被还原成 userId，见 `src/mock/admin/auth.ts:49`）。

**现成密文**（密钥 `VITE_APP_STORE_SECURE_KEY` = `5432167890` 时可直接粘贴）：

```
U2FsdGVkX18aLmj+hjGaIv11Wv/6j5JvZIwPKy8QRejeVDMzIGwrjjEkeutBmJhuG4ffLCdmzWGIFT+shWUcf0lSmwkXyfm7cA5SAjFl0djjeb/hc+ay4KuV12D9Bd/R
```

密钥若变更，用下面这行重新生成（crypto-js 已在依赖里）：

```js
CryptoJS.AES.encrypt(JSON.stringify({ userId: "admin", userName: "系统管理员", token: "mock-token.admin" }), "5432167890").toString()
```

### 8.2 免等遮罩：`HMX_DISABLE_LOADING`

全局置 `true` 时刷新遮罩**完全不创建**（`src/components/loading/loading.ts`）。实测每次页面加载
可省约 **0.75s**（遮罩退场已由 2s 降到 1s）：

| | 页面就绪 | 遮罩消失 |
|---|---|---|
| 默认 | 1327ms | 2199ms |
| 置 `true` | 1419ms | **1445ms** |

它只影响这个纯视觉过渡——遮罩不承载任何权限/数据语义，跳过不改变业务行为。**未挂 `import.meta.env.DEV`**：
那样就没法对生产构建产物做同样的提速验证，而代价只是首次导航时一次属性读取；生产无人设置即行为不变。

**两个会让测量失真的环境因素**（都踩过）：

- **headless Chrome 默认就报 `prefers-reduced-motion: reduce`**，而遮罩对 reduced-motion 是
  **无淡出直接移除**，于是你量到的「淡出」只有几十毫秒。要测真实淡出，必须显式
  `page.emulateMedia({ reducedMotion: "no-preference" })`。
- **无 GPU 环境（CI/容器）会命中 `hmx-effects-off`**（`lib/effectsPerf` 探测到 SwiftShader/llvmpipe
  等软件渲染器即打到 `<html>`），遮罩里的 3 条滑动渐变会自动停——`animationName` 量到 `none` 是
  **正确行为**，不是样式被破坏。

### 8.3 推荐配方

**开关必须用 `addInitScript`**——`page.evaluate` 设的 global 会随下一次 `goto` 的上下文销毁而丢失。

```js
const SESSION = "U2FsdGVkX18aLmj+hjGaIv11Wv/6j5JvZIwPKy8QRejeVDMzIGwrjjEkeutBmJhuG4ffLCdmzWGIFT+shWUcf0lSmwkXyfm7cA5SAjFl0djjeb/hc+ay4KuV12D9Bd/R";

// ① 开关走 addInitScript：每个新文档都生效
await page.addInitScript(() => { globalThis.HMX_DISABLE_LOADING = true; });

// ② 先加载一次拿到 origin（localStorage 按 origin 隔离）
await page.goto(BASE);
await page.evaluate(([k, v]) => localStorage.setItem(k, v), ["hmx.auth-session", SESSION]);

// ③ 直达目标页，全程不碰登录 UI
await page.goto(BASE + targetPath);
```

### 8.4 两条注意

1. **免登录只在 mock 模式有效**。`.env.production` 是 `VITE_USE_MOCK=false`，假 token 过不了真实后端的
   `getUserRescList`，守卫会 `logout()` 把人弹回 `/login`（已实测）。所以这是 dev/测试环境的提速手段，
   拿生产构建跑测试时该走真实登录。
2. **不要往应用代码里加 token 直通/后门**。权限层已经是 fail-open（`permissionStore.hasPermission`
   三道兜底全返回 `true`），再开一条旁路就是把风险带进产物。测试侧种 localStorage 已经完全够用且零侵入。

> 另：登出是**两步**——菜单项「退出」→ 确认弹窗「是否确定退出系统？」→ 再点确认。测试里漏第二步会
> 一直停在原页（这个坑踩过一次）。


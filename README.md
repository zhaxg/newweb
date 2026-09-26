# HiMind 工业互联网平台

基于 Vue 3 + TypeScript 构建的工业互联网平台**前端基础设施**，为各业务组提供壳层、路由与权限、主题与设计 token、表格与报表基建、Mock 与构建链路。

- **给 AI agent / 新人的最小必要说明**：见 [`AGENTS.md`](./AGENTS.md)（边界、命令、红线、已知坑）。
- **WinForms 画面迁移规则**：见 `.qoder/skills/winforms-screen-migration/`。

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`) |
| 语言 | TypeScript 6（`strict: true`） |
| 构建 | [Vite 8](https://vite.dev/)（rolldown） |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) + 自有设计 token 层 |
| UI 组件库 | [PrimeVue 5](https://primevue.org/) + `@primeuix/themes` 自定义预设 |
| 数据表格 | [AG Grid Enterprise 36](https://www.ag-grid.com/) |
| 电子表格 / 打印 | [Univer](https://univer.ai/) · [vue-print-designer](https://github.com/1080418/vue-print-designer) |
| 甘特图 | 自研 canvas 引擎（`src/components/gantt`，由 WinForms 版迁移） |
| 状态管理 | [Pinia 3](https://pinia.vuejs.org/) |
| 路由 | [Vue Router 5](https://router.vuejs.org/)（v5 已并入文件式路由，本平台**不使用**——路由由后端运行时下发，见「架构速览」） |
| HTTP 客户端 | [Axios](https://axios-http.com/) |
| RPC | [Hprose 3](https://hprose.com/)（`@hprose/io` 序列化） |
| 图标 | [Tabler Icons](https://tabler.io/icons) |
| 代码检查 / 格式化 | [oxlint](https://oxc.rs/) `^1.85` · [oxfmt](https://oxc.rs/) `^0.70`（已接线，**取代原 vue-tsc 静态门槛**） |

## 功能模块

### 系统管理（`src/pages/admin`，平台自有）
- 部门管理、用户管理、角色管理、菜单/资源管理（含按钮级资源）
- 键值对配置、计划任务、代码生成、系统设置

### 业务模块（`src/pages` 下大写目录）
平台预留的业务域接入点，由各业务组维护。**当前多为迁移中的示例实现，尚未定稿**：

| 目录 | 域 |
|---|---|
| `SHR` / `SMP` / `SMS` / `SQM` / `SYD` / `LIMS` / `DDH` | 各生产业务域（按 WinForms 画面迁移，规模见下） |
| `Widgets` | 通用控件型页面（报表模板、表结构、接口配置等） |

> 已落地画面数（各域 `*/index.vue` 计数）：SHR 110 · SMP 42 · SMS 37 · SQM 29 · SYD 19 · LIMS 18 · Widgets 16 · DDH 2，合计 **273**。
> 后端资源种子表（`src/mock/admin/data/rescs.ts`）共 **809** 条：517 条菜单/目录 + 288 条按钮级 + 4 条其它，全部 `cNsCode=TDWEB`。

### 基础架构（平台能力）
- 登录/登出、验证码（MathPow 工作量证明）、"记住我"历史
- **后端资源表 → 路由记录动态注册**；菜单由路由表投影（`meta.hidden` 是不进菜单的唯一开关）
- 多标签页（Chrome Tabs 风格，原生 Custom Element）导航 + KeepAlive 缓存
  （`:max="25"` LRU 兜底；关签即该页代号世代 +1 使缓存键失效，重开 = 全新挂载）
- 常驻 iframe 池承载外嵌链接（切页签只显隐不卸载，规避 Chromium 反挂载重载）
- 浅色/深色主题、运行时主题色、中英文字体自定义、字号三档缩放（`standard/large/xlarge` = 1/1.15/1.3）
- 四档字阶 + `audit:ui` 机检；PrimeVue 紧凑预设 `HmxCompact`；每个 `<Dialog>` 强制标 `autofocus` 初始焦点
- Mock 模式与真实后端模式走同一条前端链路
- 刷新白屏过渡动画（路由守卫驱动）、新版本检测、全局错误兜底、全局点击连击闸（500ms 吞同一按钮第二击）
- 网络层并发保护只做 **401 单飞闸**（并发 401 仅第一个执行登出）；**刻意无重试 / 无全局取消 / 无请求合并**
- 生产构建产 `.gz` 静态预压缩文件（`vite.config.ts` 的 `hmxGzipAssets`，level 9、仅 ≥10KB）

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装

```bash
npm install
```

### 开发（Mock 模式，默认）

```bash
npm run dev
```

默认启用进程内 Mock 数据，无需后端服务即可完整运行。

### 开发（对接真实后端）

```bash
# .env 中设置
VITE_USE_MOCK=false
VITE_API_TARGET=http://your-backend:8080

npm run dev
```

所有 API 请求统一走 `/api/[area]/[controller]/[action]`，Vite 开发服务器自动代理至后端（target 取 `VITE_API_TARGET`）。

### 构建

```bash
npm run build      # 生产构建（vite build）
npm run preview    # 预览产物
```

环境文件按 Vite mode 覆盖：`.env` → `.env.[mode]`。**`.env.production` 已钉死 `VITE_USE_MOCK=false`**，
生产构建不会带 Mock 适配器与演示数据；`.env.develop` 为 `true`。

构建同时产出 `.gz` 静态预压缩文件（`hmxGzipAssets` 插件，level 9，仅 ≥10KB 的 js/css/html/svg），
配合 nginx `gzip_static` / IIS 静态压缩，避免服务器实时压缩 6000+ chunk 烧 CPU。
**原文件保留**——服务器未配预压缩时退化为不压缩，不会 404。

> `npm run build` **只跑 `vite build`，不含任何静态检查**（类型门槛已随 vue-tsc 退役，见下节）。
> 发布前请手动跑「代码检查」的四道命令。

## 代码检查

四道门禁，**全部靠人工执行**（仓库**没有 CI、没有测试框架、没有 husky**）：

```bash
npm run lint          # ① oxlint —— 静态门槛（取代原 vue-tsc 的位置）
npm run format:check  # ② oxfmt —— 格式（不改动时秒级通过）
npm run audit:ui      # ③ 字阶 / 密度纪律（node scripts/audit-ui.mjs，零依赖）
npm run build         # ④ 能否构建
```

提交前的完整自检清单见 [`AGENTS.md` §7](./AGENTS.md)。

### 为什么没有类型门槛：vue-tsc 已退役

`tsconfig.json` 的 `baseUrl`（TypeScript 6 已 deprecated）触发 **TS5101**，`vue-tsc` 因此
**跳过全部文件级诊断**、只报这一条就非零退出——**一个文件都没检查**（假绿）。

仓库已**直接删除 `tsconfig.json`**，**类型级门槛暂停**，代之以 `oxlint`。

要恢复类型门槛时：补一份**无 `baseUrl`** 的精简 `tsconfig.json`（仅 IDE / 类型用，
`paths` 已足够解析 `@/*`）再评估 `vue-tsc`。

### ① oxlint（`npm run lint`；`typecheck` 为其别名）

配置 `.oxlintrc.json`：

- 分级：`correctness=error`（挂 CI 阻断）· `suspicious=warn`；`pedantic/style/restriction/nursery` 全关。
- `unicorn/no-useless-spread`、`unicorn/no-useless-fallback-in-spread`、
  `unicorn/no-single-promise-in-promise-methods`、`unicorn/prefer-string-starts-ends-with` 降为 warn。
- `src/lib/primeLcmgr.ts` 单独豁免 `no-unused-vars`（许可证桩文件：`vite.config.ts` 把
  `@primeui/license-manager` alias 到它并恒返回 valid。**动许可相关文件前先确认授权状态**，
  见 [`AGENTS.md` §6](./AGENTS.md)）。
- `ignorePatterns`：`dist` `temp` `shots` `node_modules` `.qoder` `*.md`。

当前实测（exit 1）：

| 范围 | error | warning |
|---|---|---|
| 全仓 | **1** | **234** |
| 框架层 | **0** | 31 |

唯一 error 在业务示例 `src/pages/SYD/YD2020/index.vue:189` 的自赋值 no-op（`no-self-assign`）。
框架层 31 条 warning 分布：`src/mock/admin` 10 · `src/components/gantt` 8 · `src/api/common` 6 ·
`src/mock/mes4ddh` 4 · `src/pages/admin` 3；规则上集中在 `no-array-sort`（`Array#sort` 改 `toSorted`）、
`no-underscore-dangle`（`__trackId` 等）、`consistent-function-scoping`。

> **框架层 0 error** —— 若把 CI 配成"只拦 error"，现在就是绿的。

### ② oxfmt（`npm run format` / `format:check`）

`oxfmt` 是**格式化真源**：写完代码 `npm run format`，验收 `npm run format:check`
（当前**全绿**：458 个文件，~6.5s）。

配置 `.oxfmtrc.json`：`printWidth: 120` · `tabWidth: 2` · `endOfLine: lf` · `trailingComma: all` ·
双引号 · `*.md` 不参与。

行尾：`.gitattributes` 已建立（`* text=auto eol=lf`），工作区统一 LF，与 `endOfLine=lf` 配套——
保证 `format:check` 在所有机器上结果一致。

### ③ `audit:ui` 现状

**174 处违规、exit 1**，分布：

| 规则 | 条数 |
|---|---|
| R2 `size="small"` | 89 |
| R5 Dialog 未标初始焦点 | 67 |
| R4 裸 label 未声明辅助档 | 15 |
| R3 越档字号 | 2 |
| R1 arbitrary 字号 | 1 |

其中 **框架层 9 处**（`src/pages/_core` 5 · `src/layouts/pages` 2 · `src/components/common` 2），
其余在业务示例目录（SHR 85 · Widgets 34 · SQM 25 · LIMS 14 占大头）。

### 接入 `build` 前注意

`lint`（1 error）与 `audit:ui`（174 处）**目前都 exit 1**，直接挂进 `build` 会把构建一起拖红。
要接入先清零，或改成"只拦 error 且分目录豁免业务示例"。

## 项目结构

```
src/
├── App.vue                 # 根组件（全局禁用右键等全局行为）
├── main.ts                 # 应用装配：Pinia → settings 即时实例化 → router → 三个插件 → 挂载
├── env.d.ts                # ImportMetaEnv 声明（新增 VITE_ 变量必须同步补这里）
├── api/
│   ├── _core/              # 请求封装：request.ts（axios 实例、token 注入、信封解包、401 单飞闸、mock 开关）
│   │                       #            types.ts
│   ├── admin/              # 系统管理接口（enums / request / types.d.ts）
│   ├── common/             # crudAppService · menuRescTree(资源树) · permissionTree · mathPowCaptcha · trackableList
│   └── mes4ddh/            # 各业务域 swagger 生成接口（ddh/lims/shr/smp/sms/sqm/syd .swagger.ts + printReport.ts，勿手改）
├── assets/                 # favicon.svg · world.svg · login/(HG-A..F.jpg 登录背景)
├── components/
│   ├── chromeTabs/         # Chrome 风格标签栏（原生 Custom Element：hmxChromeTabs.ts + .css）
│   ├── common/             # Captcha / CheckUpdates / ErrorBoundary / RangeInput / ThemeToggle
│   ├── gantt/              # 自研 canvas 甘特引擎（engine/：chart · geometry · model · renderer · rules · style）+ GanttChart.vue
│   └── loading/            # 刷新白屏全屏遮罩（loading.ts 路由守卫驱动 + loading.html）
├── composables/            # useAppTheme · usePermission(v-hp) · useFrameKeepAlive · useTabs · useToast
│                           # useCaptcha · useUniverTheme
├── layouts/
│   ├── MainLayout.vue      # 壳层：Header + Sidebar + TabBar + 内容区(KeepAlive :max=25) + 常驻 iframe 池
│   ├── BlankLayout.vue     # 整屏布局（设计器类页面）
│   ├── components/         # HmxHeader / HmxSidebar / HmxTabBar / HmxIframeHost / SettingsDialog
│   ├── composables/        # layouts.ts 布局注册表 · menuFromRoutes.ts 菜单投影
│   └── pages/              # 框架自带页（ForbiddenPage 403 / PlaceholderPage 占位 / IframePage 外链承载）
├── lib/                    # agGrid · primeTheme(HmxCompact) · themeSettings · encryptedStorage
│                           # clickGuard(连击闸) · globalError · effectsPerf · fontSettings
│                           # tablerIcons · menuQuery · yitIdHelper · primeLcmgr(许可桩)
├── mock/
│   ├── admin/              # 系统管理域：*.ts 路由（auth/crud/users/roles/resc/kv/jobs/department/settings/codegen/store）
│   │   └── data/           #   种子（一表一文件：depts · kvs · rescs · roles · users）
│   ├── mes4ddh/            # MES4DDH 六域（lims/shr/smp/sms/sqm/syd + printReport）+ data/
│   └── mockAdapter.ts      # 各域 RouteMap 合并 + 401/404 门
├── pages/
│   ├── _core/              # 登录(LoginPage/LoginCard/FlowBg)、首页(HomePage)、个人中心(ModifyPasswd)（平台自有）
│   ├── admin/              # 系统管理各子页（dept/user/role/resc/kvs/jobs/gen/settings）（平台自有）
│   └── DDH|LIMS|SHR|SMP|SMS|SQM|SYD|Widgets/   # 业务组模块（示例，迁移中）
├── router/                 # index 阶段一装配 + 注入守卫 · builtin 骨架页 · business 业务静态路由
│   └── core/               # 机制层（不常改）：bridge router 实例桥(✅唯一叶模块) · routeMeta 类型增强
│                           #   dynamicRoutes 阶段二挂接+阶段三移除 · guard 守卫 · fromMenu 后端资源→路由编译
│                           #   ⛔ 外部只准 import @/router/core/bridge，其余均为 router 内部模块
├── stores/                 # auth · permission · tabs · settings
└── styles/                 # tokens(设计 token) · globals(字阶 @theme) · prime-overrides · agGrid · scrollbar

根目录
├── AGENTS.md               # 给 agent / 新人的最小必要说明
├── README.md               # 本文件
├── .oxlintrc.json          # oxlint 配置（correctness=error / suspicious=warn）
├── .oxfmtrc.json           # oxfmt 配置（printWidth 120 / LF）—— 格式化真源
├── .gitattributes          # 统一 LF（* text=auto eol=lf），与 oxfmt endOfLine=lf 配套
├── vite.config.ts          # 代理 /api · alias(@、@primeui/license-manager→primeLcmgr) · hmxGzipAssets 预压缩
├── index.html              # 页面标题硬编码处
├── scripts/audit-ui.mjs    # 字阶纪律机检（零依赖）
└── .qoder/skills/          # WinForms 画面迁移规则与脚本
```

## 架构速览：菜单与路由的单真源链路

```
后端 getUserRescList 平铺资源表
  │ ① api/common/menuRescTree.ts        → MenuResNode 语义树（唯一读后端 cXxx 字段处）
  ▼
MenuResNode
  │ ② router/core/fromMenu.ts           → RouteRecordRaw（路由编译：iframe/blank、组件解析、pageId）
  ▼
RouteRecordRaw
  │ ③ layouts/composables/menuFromRoutes.ts → HmxMenuNode（菜单投影）
  ▼
侧栏 Tree / 顶栏 TieredMenu
```

**菜单是路由表的投影，不是第二份数据**——所以菜单与"实际能跳的路由"天然一致。
`meta.hidden` 是不进菜单的唯一开关；`meta.layout` 决定归入哪个布局父记录（注册表见 `layouts/composables/layouts.ts`）。

路由三阶段（`router/index.ts`）：**静态骨架 → 登录后动态注册 → 退出整体移除**，守卫在 `router/core/guard.ts`。

- **加布局**：只往 `layouts/composables/layouts.ts` 的注册表加一条，不动 `router/index`。
- **加业务页**：写 `src/router/business.ts`；会进菜单的页走后端资源下发，不写这里。
- **循环依赖边界**：MainLayout / request / usePermission 等消费方只准 import 叶模块
  `router/core/dynamicRoutes.ts`（动态路由清理）与 `router/core/bridge.ts`（router 实例桥）；
  反向 import `@/router`（index）会成环。
- **懒加载边界**：只有 `router/builtin.ts` 的骨架页（登录/首页/403）和 `layouts.ts` 的布局父记录
  允许静态 import；业务页一律走 `fromMenu.ts` 的 `import.meta.glob` 懒加载。重型依赖
  （Univer、vue-print-designer）必须 `defineAsyncComponent` / 动态 `import()`。

## 敏感键加密

`src/lib/encryptedStorage.ts` 提供 `readJson<T>(key)` / `writeJson(key, value)`，用 crypto-js（纯 JS、同步，**不依赖 HTTPS/安全上下文**）给落盘的 JSON 加一层 AES。

- 开关：`VITE_APP_STORE_SECURE_KEY` 非空即加密；留空时读写退化成明文 `JSON.parse/stringify`，行为逐字一致。
- **主动调用，不做全局拦截**：目前只包 `authStore` 的 `hmx.auth-session`（含 token）与 `hmx.login-history`（勾「记住我」时存明文密码）。其它键（编辑器设置、mock 各表、Univer 的 `UniverLocalStorage/*`）保持明文原样。
- 兼容老数据：读到不以 `U2FsdGVkX1`（crypto-js 密文固定头）开头的值按明文直接解析，下次写入自动变密文，不需要迁移代码。
- 失败即降级：换密钥 / 脏数据 → `console.warn` + 返回 `null`，调用方回落默认值（等于未登录），绝不抛进启动链。
- **定位：`VITE_` 变量会内联进 bundle，密钥是公开的，本层属本地留存混淆**（防从设备/备份直接翻明文），**不是访问控制**。后端仍须独立校验。

## Mock 目录规范

**域路由与演示数据分目录放置**，与 `admin/` 同构：

| 放什么 | 位置 | 例 |
|---|---|---|
| 业务域 mock 路由（导出 `*Routes: RouteMap`） | `src/mock/<域>/` | `src/mock/mes4ddh/lims.ts`、`src/mock/admin/users.ts` |
| 该域演示/种子数据（数组、JSON，一域/一表一文件） | `src/mock/<域>/data/` | `src/mock/mes4ddh/data/lims.ts`、`src/mock/admin/data/users.ts` |
| 适配器（合并各域路由表、401/404 门） | `src/mock/mockAdapter.ts` | 不放业务数据 |

规则：

1. **禁止**把业务域 mock 平铺在 `src/mock/` 根下；根下只允许 `mockAdapter.ts` 与域目录。
2. **演示数据不内联进路由文件**：种子数组、抓取的 JSON 等放 `<域>/data/`，路由侧经 `loadJson(key, seed)` 或直接 import 引用；域内共享的小工具（如 `stamp()`）随数据文件走。
3. MES4DDH 六域（lims/shr/smp/sms/sqm/syd）统一在 `src/mock/mes4ddh/`；新增业务域照此建 `src/mock/<新域>/` + `data/`。
4. 占位路由里 ≤5 行的 `demoRows` 工厂可留在路由文件；成规模的静态演示行必须下沉 `data/`。
5. **开关判定是精确匹配**：`request.ts` 写的是 `import.meta.env.VITE_USE_MOCK !== "false"`，
   只有字面量 `false` 才关；写 `0` / `no` / `off` 都会被当成"开"。
6. **mock「后端」是刻意的演示壳，不是安全模型**：`src/mock/admin/auth.ts` 对任意账密发 token、
   非 mock token 一律回落 admin、验证码永远对、`getUserRescList` 无视用户全量下发——mock 层没有真实
   服务和数据库，宽松才便于当演示壳用，这些都是设计意图而非漏洞，不该被"修复"。唯一红线是
   生产构建不带 mock（`.env.production` 保持 `VITE_USE_MOCK=false`）。

## 字号与密度纪律

全站两层密度：**字阶**（开发者写死的语义档）× **缩放档位**（用户可调的整体密度）。字阶钉在 `src/styles/globals.css` 的 `@theme`，四档语义类名为 `text-xs` / `text-body` / `text-sm` / `text-base`，全部 rem。

**细则真源在 skill `winforms-screen-migration` 的 `references/ui-rules.md`**（四档用途落位、红线、三档缩放机制、控件映射、布局纪律），本文件不复述。

机检：

```bash
npm run audit:ui     # node scripts/audit-ui.mjs，零依赖
```

扫 `src/pages` / `src/layouts` / `src/components`，规则 R1（arbitrary 字号）/ R2（`size="small"`）/ R3（越档字号）/ R4（裸 `<label>` 未声明 `text-xs`）/ R5（`<Dialog>` 块内未标 `autofocus` 初始焦点，坑点见 ui-rules.md §2），违规打印 `文件:行 [规则] 片段` 并非零退出；可挂 CI / pre-commit。豁免：违规行同加 `audit-allow` 注释。

> 密度还有一层 `--hmx-scale` 系数（系统设置 → 字体大小，`settingsStore.fontScale`），与字阶正交；
> PrimeVue 侧紧凑参数统一在 `lib/primeTheme.ts` 的 `HmxCompact` 预设里，不要再往页面挂 `size="small"` 双重压缩。

## WinForms 画面迁移规则

**规则真源已迁到 skill `winforms-screen-migration`**（`.qoder/skills/winforms-screen-migration/`），本文件不再复述，避免两处规则打架：

| 要查什么 | 去哪 |
|---|---|
| 迁移契约、执行流程（8 步 + 批量提效）、踩坑 | `SKILL.md` |
| 窗体来源定位、源项目→目标目录、产出命名、路由接线、四档字阶与红线、控件→组件映射、**布局结构（包含/上下左右/Splitter，不抄 Location）**、工具栏/查询条件区/主子表布局、AG Grid 与 colDefs 规则 | `references/ui-rules.md` |
| C# `Svc<I*AppService>.Proxy.Method()` → 前端 `<svc>Api.<method>()` → URL、swagger 复用、各类保存按台账映射、`TrackableList` 使用边界、Mock 占位、事件逻辑搬迁 | `references/backend-api.md` |
| Designer/事件代码提取器能还原什么、丢什么、怎么自检 | `references/extractor.md` |
| 可执行脚本 | `scripts/extract-screen.mjs`（骨架 + 后端调用台账）。`scripts/verify-page.mjs` **迁移默认不用**——静态校验后由用户自行打开浏览器验收，AI 不跑无头截图 |

一句话契约：**一个窗体一次迁完**——画面 + 事件逻辑 + 后端接口 + 增删改保存，不做「先只迁画面、逻辑留空」的两阶段迁移。**布局最重元素齐全 + 结构关系**（包含/上下左右/Splitter），不抄 `Location` 像素坐标。**AI 侧止于静态校验**（`npm run lint` + `npm run audit:ui`；类型门槛已随 vue-tsc 退役，见「代码检查」）；不跑浏览器实测/截图，画面由你自行打开检查。

C# 源码副本在 `temp/ddh_rmes`（已 gitignore）。

## 环境变量

环境文件按 Vite mode 覆盖：`.env` → `.env.local` → `.env.[mode]` → `.env.[mode].local`。

| 文件 | 用途 | `VITE_USE_MOCK` |
|---|---|---|
| `.env` | 所有环境共享的兜底 | `true` |
| `.env.develop` | 开发模式覆盖 | `true` |
| `.env.production` | **生产构建覆盖** | **`false`** |

**实际被代码消费的**（已核对引用点，行号对应当前 HEAD）：

| 变量 | 默认值 | 消费点 | 说明 |
|---|---|---|---|
| `VITE_USE_MOCK` | `true` | `api/_core/request.ts:14` | 是否启用 Mock；**仅精确 `false` 关闭** |
| `VITE_API_TARGET` | `http://10.11.5.49:9525` | `vite.config.ts:52`（经 `loadEnv`，非 `import.meta.env`） | Vite dev proxy target（未设则回退 `http://localhost:8080`）；`.env.production` 里是 `/` |
| `VITE_APP_STORE_SECURE_KEY` | `5432167890` | `lib/encryptedStorage.ts:17` | localStorage 加密密钥（**会内联进 bundle，属混淆非安全**），留空 = 明文 |
| `VITE_ROUTER_NAMESPACE` | `TDWEB` | `api/common/menuRescTree.ts:45` · `pages/admin/role/RolePermissionDialog.vue:26` · `pages/admin/resc/index.vue:53` | 后端资源拉取的 `groupId`，决定本端可见的菜单资源域 |
| `VITE_HELP_URL` | `https://hmx.rv.com.cn` | `layouts/components/HmxHeader.vue:77` | 帮助文档基地址；用户下拉「帮助文档」新标签打开它并追加 `pageid`/`code`，未配置则 toast 提示 |

**已定义但当前无任何代码消费**（改了不生效，属待接线或历史遗留）：

`VITE_MOBILE_ROUTER_NAMESPACE` · `VITE_APP_NAMESPACE` · `VITE_BASE_URL` · `VITE_API_URL_PREFIX`
（接口前缀实际硬编码在 `request.ts:76` 的 `withApiPrefix`）
· `VITE_APP_NAME` · `VITE_CUSTOMER` · `VITE_COPYRIGHT`
（页面标题硬编码在 `index.html` 的 `<title>`，登录页文案在组件里）

> 新增 `VITE_` 变量时，请同步补 `src/env.d.ts` 的声明并在代码里真正读取，否则 `.env` 里只是死配置。

## 开发指令

```bash
npm run dev            # 启动开发服务器（默认 Mock 模式）
npm run build          # 生产构建（只跑 vite build，不含静态检查）
npm run preview        # 预览构建产物

npm run lint           # oxlint 静态门槛（typecheck 为其别名）
npm run lint:fix       # oxlint --fix
npm run format         # oxfmt 写入格式化（格式化真源）
npm run format:check   # oxfmt 校验（CI / 提交前）
npm run audit:ui       # 字阶 / 密度纪律审计
```

提交前的完整自检清单见 [`AGENTS.md` §7](./AGENTS.md)；
**已知坑（刻意行为 vs 真缺陷）见 [`AGENTS.md` §6](./AGENTS.md)** —— 改框架层前先扫一遍，避免把设计意图当 bug 修掉。

## License

私有项目，未公开授权。

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
| 路由 | [Vue Router 4](https://router.vuejs.org/) |
| HTTP 客户端 | [Axios](https://axios-http.com/) |
| RPC | [Hprose 3](https://hprose.com/)（`@hprose/io` 序列化） |
| 图标 | [Tabler Icons](https://tabler.io/icons) |
| 代码检查 / 格式化 | [oxlint](https://oxc.rs/) · [oxfmt](https://oxc.rs/)（已安装，**配置尚未接线**，见「代码检查」） |

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

> 待迁规模（按菜单资源去重统计）：SHR 110 · SMP 41 · SMS 37 · SQM 29 · SYD 19 · LIMS 18 · Widgets 14 · DDH 2，合计约 280 个窗体 / 400+ 菜单。

### 基础架构（平台能力）
- 登录/登出、验证码（MathPow 工作量证明）、"记住我"历史
- **后端资源表 → 路由记录动态注册**；菜单由路由表投影（`meta.hidden` 是不进菜单的唯一开关）
- 多标签页（Chrome Tabs 风格）导航 + KeepAlive 缓存（关签即世代 +1 使缓存失效）
- 常驻 iframe 池承载外嵌链接（切页签只显隐不卸载，规避 Chromium 反挂载重载）
- 浅色/深色主题、运行时主题色、中英文字体自定义、字号三档缩放
- 四档字阶 + `audit:ui` 机检；PrimeVue 紧凑预设 `HmxCompact`
- Mock 模式与真实后端模式走同一条前端链路
- 刷新白屏过渡动画、新版本检测、全局错误兜底

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
npm run build      # 生产构建
npm run preview    # 预览产物
```

环境文件按 Vite mode 覆盖：`.env` → `.env.[mode]`。**`.env.production` 已钉死 `VITE_USE_MOCK=false`**，
生产构建不会带 Mock 适配器与演示数据；`.env.develop` 为 `true`。

> `npm run build` **不包含类型检查**，发布前请手动跑「代码检查」那一步。

## 代码检查

```bash
# ① 类型检查 —— 真门槛
npx vue-tsc --noEmit --ignoreDeprecations 6.0

# ② 字阶 / 密度纪律
npm run audit:ui

# ③ Lint
npx oxlint src
```

### ⚠️ `npm run typecheck` 当前是假绿

`tsconfig.json` 的 `baseUrl`（TypeScript 6 已 deprecated）触发 **TS5101**，
`vue-tsc` 因此**跳过全部文件级诊断**、只报这一条就非零退出——**一个文件都没检查**。

```bash
npm run typecheck                          # ❌ 只报 TS5101，不检查任何文件
npx vue-tsc --noEmit --ignoreDeprecations 6.0   # ✅ 真检查
```

**根治**：删掉 `tsconfig.json` 的 `baseUrl`（`paths` 已足够解析 `@/*`）。
修完之后 `npm run typecheck` 即可信，本节可整段删除。当前实测带 flag 有 15 个错，全部在业务示例目录里。

### Lint / 格式化（已安装，尚未接线）

`oxlint` / `oxfmt` 已进 devDependencies，但**没有配置文件、没有 npm script**：

- `npx oxlint src` 可直接用，但**当前 exit 1**：全仓 255 条（13 error + 242 warning），
  框架层 48 条（4 error + 44 warning），4 个 error 全部在 `src/lib/primeLcmgr.ts`（许可证桩的未用参数）。
  业务示例目录占绝大多数 —— **直接挂进 `build` 会红**。
- **`npx oxfmt` 不要直接 `--write`**：无配置时按默认规则重排（实测 `src/lib` 11 个文件里 9 个会变，长行按默认宽度断行）。
  要接入先 `oxfmt --init`，把 `printWidth` 调到与现有代码一致（本仓长行普遍到 ~120），再分批跑。
- 行尾注意：本机 `core.autocrlf=true`，工作区 CRLF、git index LF，仓库无 `.gitattributes`。

### 接入建议

```jsonc
// package.json scripts 建议补齐
"typecheck": "vue-tsc --noEmit --ignoreDeprecations 6.0",
"lint": "oxlint src",
"fmt:check": "oxfmt --check src",
"build": "vue-tsc --noEmit --ignoreDeprecations 6.0 && vite build"
```

**顺序注意**：`lint` 目前 exit 1，接入前要先清零或改成"只拦 error 且分目录豁免业务示例"，
否则会把 `build` 一起拖红。`audit:ui` 同理（当前 174 处违规、exit 1）。

仓库目前**没有 CI、没有测试框架、没有 husky** —— 上述三道门禁目前都只靠人工执行。

## 项目结构

```
src/
├── api/
│   ├── _core/              # 请求封装（axios 实例、token 注入、信封解包、401、mock 开关）
│   ├── admin/              # 系统管理接口（auth/user/role/resc/kv/job/settings/codegen）
│   ├── common/             # 通用 CRUD、菜单资源树、权限树、验证码、TrackableList
│   └── mes4ddh/            # 各业务域 swagger 生成接口（*.swagger.ts，勿手改）
├── assets/                 # 静态资源（登录背景、favicon）
├── components/
│   ├── chromeTabs/         # Chrome 风格标签栏（原生 Custom Element）
│   ├── common/             # Captcha / CheckUpdates / ErrorBoundary / RangeInput / ThemeToggle
│   ├── gantt/              # 自研 canvas 甘特引擎（chart/geometry/renderer + GanttChart）
│   └── loading/            # 刷新白屏全屏遮罩（路由守卫驱动）
├── composables/            # useAppTheme / usePermission(v-hp) / useFrameKeepAlive / useToast / useCaptcha …
├── layouts/
│   ├── MainLayout.vue      # 壳层：Header + Sidebar + TabBar + 内容区 + iframe 池
│   ├── BlankLayout.vue     # 整屏布局（设计器类页面）
│   ├── components/         # HmxHeader / HmxSidebar / HmxTabBar / HmxIframeHost / SettingsDialog
│   ├── composables/        # layouts.ts 布局注册表 · menuFromRoutes.ts 菜单投影
│   └── pages/              # 框架自带页（403 / 占位 / 外链 iframe 承载）
├── lib/                    # agGrid · primeTheme(HmxCompact) · themeSettings · encryptedStorage
│                           # tablerIcons · fontSettings · globalError · effectsPerf · yitIdHelper
├── mock/
│   ├── admin/              # 系统管理域：*.ts 路由 + data/ 种子（一表一文件）
│   ├── mes4ddh/            # MES4DDH 六域（lims/shr/smp/sms/sqm/syd）+ data/
│   └── mockAdapter.ts      # 各域 RouteMap 合并 + 401/404 门
├── pages/
│   ├── _core/              # 登录、首页、个人中心（平台自有）
│   ├── admin/              # 系统管理各子页（平台自有）
│   └── DDH|LIMS|SHR|SMP|SMS|SQM|SYD|Widgets/   # 业务组模块（示例，迁移中）
├── router/                 # index 三阶段装配 · builtin 骨架 · business 业务静态路由
│                           # fromMenu 后端资源→路由编译 · guard 守卫
├── stores/                 # auth · permission · tabs · settings
└── styles/                 # tokens(设计 token) · globals(字阶 @theme) · prime-overrides · agGrid · scrollbar

根目录
├── AGENTS.md               # 给 agent / 新人的最小必要说明
├── scripts/audit-ui.mjs    # 字阶纪律机检（零依赖）
└── .qoder/skills/          # WinForms 画面迁移规则与脚本
```

## 架构速览：菜单与路由的单真源链路

```
后端 getUserRescList 平铺资源表
  │ ① api/common/menuRescTree.ts        → MenuResNode 语义树（唯一读后端 cXxx 字段处）
  ▼
MenuResNode
  │ ② router/fromMenu.ts                → RouteRecordRaw（路由编译：iframe/blank、组件解析、pageId）
  ▼
RouteRecordRaw
  │ ③ layouts/composables/menuFromRoutes.ts → HmxMenuNode（菜单投影）
  ▼
侧栏 Tree / 顶栏 TieredMenu
```

**菜单是路由表的投影，不是第二份数据**——所以菜单与"实际能跳的路由"天然一致。
`meta.hidden` 是不进菜单的唯一开关；`meta.layout` 决定归入哪个布局父记录（注册表见 `layouts/composables/layouts.ts`）。

路由三阶段（`router/index.ts`）：**静态骨架 → 登录后动态注册 → 退出整体移除**，守卫在 `router/guard.ts`。

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

一句话契约：**一个窗体一次迁完**——画面 + 事件逻辑 + 后端接口 + 增删改保存，不做「先只迁画面、逻辑留空」的两阶段迁移。**布局最重元素齐全 + 结构关系**（包含/上下左右/Splitter），不抄 `Location` 像素坐标。**AI 侧止于静态校验**（`vue-tsc` + `audit:ui`）；不跑浏览器实测/截图，画面由你自行打开检查。

C# 源码副本在 `temp/ddh_rmes`（已 gitignore）。

## 环境变量

环境文件按 Vite mode 覆盖：`.env` → `.env.local` → `.env.[mode]` → `.env.[mode].local`。

| 文件 | 用途 | `VITE_USE_MOCK` |
|---|---|---|
| `.env` | 所有环境共享的兜底 | `true` |
| `.env.develop` | 开发模式覆盖 | `true` |
| `.env.production` | **生产构建覆盖** | **`false`** |

**实际被代码消费的**（已核对引用点）：

| 变量 | 默认值 | 消费点 | 说明 |
|---|---|---|---|
| `VITE_USE_MOCK` | `true` | `api/_core/request.ts:11` | 是否启用 Mock；**仅精确 `false` 关闭** |
| `VITE_API_TARGET` | `http://10.11.5.49:9525` | `vite.config.ts:26` | Vite dev proxy target（未设则回退 `http://localhost:8080`） |
| `VITE_APP_STORE_SECURE_KEY` | `5432167890` | `lib/encryptedStorage.ts:17` | localStorage 加密密钥（**会内联进 bundle，属混淆非安全**），留空 = 明文 |
| `VITE_ROUTER_NAMESPACE` | `TDWEB` | `api/common/menuRescTree.ts:45` | 后端资源拉取的 `groupId`，决定本端可见的菜单资源域 |
| `VITE_HELP_URL` | `https://hmx.rv.com.cn` | `layouts/components/HmxHeader.vue:77` | 帮助文档基地址；用户下拉「帮助文档」新标签打开它并追加 `pageid`/`code`，未配置则 toast 提示 |

**已定义但当前无任何代码消费**（改了不生效，属待接线或历史遗留）：

`VITE_MOBILE_ROUTER_NAMESPACE` · `VITE_APP_NAMESPACE` · `VITE_BASE_URL` · `VITE_API_URL_PREFIX`
（接口前缀实际硬编码在 `request.ts:58` 的 `withApiPrefix`）
· `VITE_APP_NAME` · `VITE_CUSTOMER` · `VITE_COPYRIGHT`
（页面标题硬编码在 `index.html`，登录页文案在组件里）

> 新增 `VITE_` 变量时，请同步补 `src/env.d.ts` 的声明并在代码里真正读取，否则 `.env` 里只是死配置。

## 开发指令

```bash
npm run dev          # 启动开发服务器（默认 Mock 模式）
npm run build        # 生产构建（不跑类型检查）
npm run preview      # 预览构建产物

npx vue-tsc --noEmit --ignoreDeprecations 6.0   # 类型检查（真门槛）
npm run audit:ui     # 字阶/密度纪律审计
npx oxlint src       # lint
```

提交前的完整自检清单见 [`AGENTS.md` §7](./AGENTS.md)。

## License

私有项目，未公开授权。

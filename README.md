# ERP Web

基于 Vue 3 + TypeScript 构建的企业资源管理（ERP）系统前端，涵盖采购、销售、库存、财务及系统管理等核心业务模块。

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`) |
| 语言 | TypeScript 6（严格模式） |
| 构建 | [Vite 8](https://vite.dev/) |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) |
| UI 组件库 | [PrimeVue 5](https://primevue.org/) |
| 数据表格 | [AG Grid Enterprise 36](https://www.ag-grid.com/) |
| 状态管理 | [Pinia 3](https://pinia.vuejs.org/) |
| 路由 | [Vue Router 4](https://router.vuejs.org/) |
| HTTP 客户端 | [Axios](https://axios-http.com/) |
| RPC | [Hprose 3](https://hprose.com/) |
| 图标 | [Tabler Icons](https://tabler.io/icons) |

## 功能模块

### 系统管理
- 部门管理、用户管理、角色管理、菜单/资源管理
- 键值对配置、计划任务、代码生成、系统设置、审计日志

### 业务模块
- **采购管理** — 采购订单、采购入库、询价单、报价对比
- **销售管理** — 键售订单、销售出库、业绩排行、客户分析
- **库存管理** — 库存查询、调拨单、盘点单、出入库流水
- **财务管理** — 应收账款、收款单、应付账款、付款单
- **报表中心** — 销售统计、库存周转分析

### 基础架构
- 登录/登出、验证码、"记住我"历史
- 后端权限菜单驱动的动态路由注册
- 多标签页（Chrome Tabs 风格）导航 + KeepAlive 缓存
- 浅色/深色主题切换
- 中英文字体自定义、字体大小三档缩放（标准/大字体/更大字体）
- 刷新白屏过渡动画
- Mock 模式与真实后端模式无缝切换
- 自动更新检测

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

默认启用进程内 Mock 数据，无需后端服务即可完整运行所有页面。

### 开发（对接真实后端）

```bash
# .env 中设置
VITE_USE_MOCK=false
VITE_API_TARGET=http://your-backend:8080

npm run dev
```

所有 API 请求统一走 `/api/[area]/[controller]/[action]`，Vite 开发服务器自动代理至后端。

### 构建

```bash
npm run build
```

### 预览构建产物

```bash
npm run preview
```

### 类型检查

```bash
npx vue-tsc --noEmit --ignoreDeprecations 6.0   # 真门槛
npm run typecheck                               # 当前会假绿：见下
```

`npm run typecheck` 因 `tsconfig` 的 `baseUrl` 触发 TS5101 配置错误，`vue-tsc` 会**跳过全部文件级诊断**只报这一条，仓库里因此藏着几十个错。修 `tsconfig`（去掉 `baseUrl`）之前，以带 `--ignoreDeprecations 6.0` 的那条为准。

## 项目结构

```
src/
├── api/                    # 后端 API 定义
│   ├── _core/              # 请求封装、类型定义
│   ├── admin/              # 系统管理接口
│   ├── common/             # 通用 CRUD / 菜单 / 权限接口
│   ├── lims/               # 实验室管理接口
│   ├── smp/ sqm/ shr/ ...  # 各业务域接口
│   └── widgets/            # 控件接口
├── assets/                 # 静态资源（登录背景图等）
├── components/             # 公共组件
│   ├── chromeTabs/         # Chrome 风格标签栏
│   ├── common/             # 验证码、主题切换、更新检测
│   ├── loading/            # 刷新白屏过渡
│   └── mask/               # 输入掩码指令
├── composables/            # 组合式函数（主题、验证码、标签、Toast）
├── data/                   # 静态数据 / Mock 菜单定义
├── layouts/                # 壳层布局（Header + Sidebar + TabBar + 内容区）
├── lib/                    # 工具库（AG Grid 配置、PrimeVue 主题、字体等）
├── mock/                   # Mock 数据与适配器
├── pages/                  # 页面视图
│   ├── _core/              # 登录、首页、403 等核心页面
│   └── admin/              # 系统管理各子页面
├── router/                 # 路由配置与动态注册
├── stores/                 # Pinia 状态（auth、permission、settings、tabs）
└── styles/                 # 全局样式与组件覆盖
```

## 字号与密度纪律

全站两层密度：**字阶**（开发者写死的语义档）× **缩放档位**（用户可调的整体密度）。字阶钉在 `src/styles/globals.css` 的 `@theme`，四档语义类名为 `text-xs` / `text-body` / `text-sm` / `text-base`，全部 rem。

**细则真源在 skill `winforms-screen-migration` 的 `references/ui-rules.md`**（四档用途落位、红线、三档缩放机制、控件映射、布局纪律），本文件不复述。

机检：

```bash
npm run audit:ui     # node scripts/audit-ui.mjs，零依赖
```

扫 `src/pages` / `src/layouts` / `src/components`，规则 R1（arbitrary 字号）/ R2（`size="small"`）/ R3（越档字号）/ R4（裸 `<label>` 未声明 `text-xs`），违规打印 `文件:行 [规则] 片段` 并非零退出；可挂 CI / pre-commit。豁免：违规行同加 `audit-allow` 注释。

## WinForms 画面迁移规则

**规则真源已迁到 skill `winforms-screen-migration`**（`.qoder/skills/winforms-screen-migration/`），本文件不再复述，避免两处规则打架：

| 要查什么 | 去哪 |
|---|---|
| 迁移契约、执行流程（9 步 + 批量提效）、实测踩坑 | `SKILL.md` |
| 窗体来源定位、源项目→目标目录、产出命名、路由接线、四档字阶与红线、控件→组件映射、工具栏/查询条件区/主子表布局、AG Grid 与 colDefs 规则 | `references/ui-rules.md` |
| C# `Svc<I*AppService>.Proxy.Method()` → 前端 `<svc>Api.<method>()` → URL、swagger 复用、`GetTrackingList<T>()` → `TrackableList<T>` + `crudAppService.SaveList`、事件逻辑搬迁 | `references/backend-api.md` |
| Designer/事件代码提取器能还原什么、丢什么、怎么自检 | `references/extractor.md` |
| 可执行脚本 | `scripts/extract-screen.mjs`（骨架 + 后端调用台账）、`scripts/verify-page.mjs`（无头浏览器实测） |

一句话契约：**一个窗体一次迁完**——画面 + 事件逻辑 + 后端接口 + 增删改保存，不做「先只迁画面、逻辑留空」的两阶段迁移。

待迁规模（按菜单资源去重统计）：SHR 110 窗体 · SMP 41 · SMS 37 · SQM 29 · SYD 19 · LIMS 18 · Widgets 14 · DDH.Winforms 2 · Hmx.WinForms 2，合计约 280 个窗体 / 400+ 菜单。C# 源码副本在 `temp/ddh_rmes`（已 gitignore）。

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_USE_MOCK` | `true` | 是否启用 Mock 模式；设为 `false` 走真实后端 |
| `VITE_API_TARGET` | `http://localhost:8080` | 真实后端地址（仅 `VITE_USE_MOCK=false` 时生效） |

## 开发指令

```bash
npm run dev          # 启动开发服务器（默认 Mock 模式）
npm run build        # 生产构建
npm run preview      # 预览构建产物
npm run typecheck    # TypeScript 类型检查
npm run audit:ui     # 字阶/密度纪律审计（见「字号与密度纪律」）
```

## License

私有项目，未公开授权。

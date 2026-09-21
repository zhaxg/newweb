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
- 中英文字体自定义
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
npm run typecheck
```

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

## WinForms 画面迁移规则

源码仓：`../ddh_gzmes`（C# WinForms 原系统）。目标：把原窗体的**画面**移植为 Vue 页面；只迁画面，不迁业务逻辑（服务调用、计算、校验、打印实现等后续按新契约单独接入）。

### 1. 来源定位（由菜单资源表驱动）

侧栏每个 type=2 菜单在资源种子（`src/mock/admin/data/rescs.ts`）中指向原窗体：

- `cResPath` = 源程序集名（如 `DDH.Winforms.SYD.dll`）→ 决定源项目与目标目录
- `cResSubPath` = 窗体全名（如 `DDH.Winforms.SYD.Forms.FrmYD2001`）→ 最后一段类名即窗体文件
- 源文件 = `<项目>/**/<类名>.cs` + `<类名>.Designer.cs`，**布局一律以 Designer.cs 为准**（控件树、Caption、列定义、初始尺寸）

### 2. 项目 → 目标目录映射

| 源项目 | 位置 | 目标目录 |
|---|---|---|
| Hmx.WinForms | rmes.core | `src/pages/admin` |
| Hmx.WinForms.Widgets | rmes.core | `src/pages/Widgets` |
| DDH.Winforms | rmes.winform | `src/pages/DDH` |
| DDH.Winforms.LIMS | rmes.winform | `src/pages/LIMS` |
| DDH.Winforms.SHR | rmes.winform | `src/pages/SHR` |
| DDH.Winforms.SMP | rmes.winform | `src/pages/SMP` |
| DDH.Winforms.SMS | rmes.winform | `src/pages/SMS` |
| DDH.Winforms.SQM | rmes.winform | `src/pages/SQM` |
| DDH.Winforms.SYD | rmes.winform | `src/pages/SYD` |

即 `DDH.Winforms.<X>` → `src/pages/<X>`，依次类推。

### 3. 产出文件命名

- 窗体 `Frm<CODE>` → `src/pages/<目标目录>/<CODE>/index.vue`（去掉 `Frm` 前缀；带对话框等配套组件时同目录放 `XxxDialog.vue`）
- 多个菜单共用同一窗体（`cResSubPath` 相同、`cQueryString` 不同，如 `FrmHR2000` 同挂轧钢/棒材日计划）→ 只产出一个 vue，运行参数经路由 query 传入
- 已迁移的 admin 7 页（user/role/resc/kv/department/jobs/gen）即此规则的先行样例

### 4. 控件 → Web 组件映射

| WinForms / DevExpress | 本项目 |
|---|---|
| XtraForm / UserControl 壳 | Vue 页面（页签、面包屑由壳层负责，页面只管内容区） |
| GridView（含列 Caption/宽度/样式） | AG Grid Enterprise colDefs（沿用 hmxAgGridPlugin 全站约定） |
| BarManager / 工具栏按钮 | 页面顶部 Button 组（名称、顺序、位置照原样） |
| XtraTabControl | TabView |
| TextEdit / SpinEdit / DateEdit / CheckEdit / LookUpEdit | PrimeVue InputText / InputNumber / DatePicker / Checkbox / Select |
| Panel / GroupControl / SplitContainer | Tailwind flex/grid + Card |
| 窗体内嵌弹窗（GridFilter、选择器） | 对应 Dialog 组件 |

保留画面关键信息：中文列头与字段名、查询条件区布局、按钮文案与位置、必填/只读视觉态。事件绑定与业务代码一律不带入，处理器留空。

### 5. 路由接线（每迁完一个菜单）

1. 种子资源行 `cResPath` 改语义段、`cResSubPath` 改 vue 组件路径（相对 `src/pages`，如 `/SYD/YD2001/index.vue`）
2. `src/mock/admin/store.ts` 的 `RESCS_KEY` 版本号 +1（强制 localStorage 重播种）
3. `npm run typecheck` + 浏览器实测渲染

### 6. 待迁规模（按菜单资源去重统计）

SHR 110 窗体 · SMP 41 · SMS 37 · SQM 29 · SYD 19 · LIMS 18 · Widgets 14 · DDH.Winforms 2 · Hmx.WinForms 2，合计约 280 个窗体 / 400+ 菜单。

### 7. 不迁移内容

业务逻辑与服务端调用、权限判定、打印/导出实现、DevExpress 非可视机制、菜单资源未收录的内部二级窗体（由父页面需要时再评估移植）。

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
```

## License

私有项目，未公开授权。

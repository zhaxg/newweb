---
name: winforms-screen-migration
description: 把 DDH-MES 的 WinForms 窗体复刻迁移为本仓库的 Vue 页面（第一阶段只迁画面、不接 API）。当用户说「复刻迁移 QM3006 画面」「迁移 FrmYD2001」「迁移这个菜单」「按 README 规则迁画面」或给出菜单代码/窗体类名要求做成 web 页面时使用。覆盖：Designer.cs 骨架提取、实体中文列头解析、index.vue 产出、路由接线、typecheck/audit:ui 与无头浏览器实测。
argument-hint: <菜单代码或 Frm 类名>
---

# WinForms 画面复刻迁移

## Overview

把一个 DevExpress WinForms 窗体（`FrmXXXX` + `*.Designer.cs`）忠实复刻成本仓库的 Vue 页面。规则真源是 `README.md` 的「WinForms 画面迁移规则」§1–§9 与「字号与密度纪律」——本 skill 只规定**执行顺序**和**可复用脚本**，不复述规则；两者冲突时以 README 为准。

第一阶段（画面迁移）的硬契约：页面**不发任何请求、不写任何业务逻辑**——所有 `rows` 是空数组，所有处理器是 `toast("画面迁移：X逻辑待接入", 2000, "warn")`，`onQuery` 只清空数据并重新自适应列宽。

## 前置：确认两件事

1. **WinForms 源码根**。README §1 写的是 `../ddh_gzmes`，各机器不同（另一台是 `D:\gitRepos\DDH-MES\DDH-MES`）。先探测：`ls ../ddh_gzmes` 失败就问用户要路径，**本会话内不再重复问**。实体/Dto 在 `<源码根>/rmes.service/DDH.Service/<模块>/`。
2. **开发服务器**。`npm run dev`（默认 5173，被占则顺延到 5174）；Mock 模式下 `admin` + 任意密码可登录。

## 流程

### 1. 定位窗体

在 `src/mock/admin/data/rescs.ts` 里按 `cCode`（菜单代码，如 `QM3006`）或 `cTitle` 搜种子行：

- `cResSubPath` 已是 `/SQM/Tqmtd10/index.vue` → 页面已存在，本次是**修订**；
- `cResSubPath` 还是 `DDH.Winforms.X.Forms.FrmYyy` → 待迁，最后一段类名即窗体文件；
- 种子行已被改写、需要回溯原始窗体 → 查 `temp/HMX_RES.json` 的 `C_RES_SUB_PATH`（README §1.1）。

记下 `cQueryString`（同窗体多菜单的产线参数）与 `cPid` 链（父菜单标题，第 7 步进画面要用）。多个菜单共用一个窗体时只产出一个 vue（README §3）。

### 2. 提取画面骨架（别整读 Designer.cs）

一个窗体的 Designer 常 500~900 行、信息密度极低。先跑脚本拿摘要：

```bash
node .qoder/skills/winforms-screen-migration/scripts/extract-screen.mjs \
  "<源码根>/.../Frm<CODE>.Designer.cs" --uc \
  --entity-root "<源码根>/rmes.service/DDH.Service/<模块>"
```

输出即复刻清单：按钮（容器 `Controls.Add` 顺序 = 画面原序）、分栏（上下/左右 + `SplitterPosition`）、页签（标题 + 内含控件）、每个表格的**绑定实体**、按 `VisibleIndex` 排序的可见列（中文列头优先取 Designer 的 `Caption`，否则取该实体 `[LDisplay]`，并标注来源）、以及必须带 `hide: true` 迁入的隐藏列。`--uc` 会顺着 `UC*.Designer.cs` 引用递归（默认 3 层，`--depth` 可调）。

只有摘要里标了 `←需查实体` 的列，或需要核对个别尺寸时，才回读原 Designer.cs。

### 3. 判读与提问

对着摘要确认三件事，有疑问先问用户、不要猜：

- 主/子表关系与分栏比例（`SplitterPosition` ÷ 容器高度 → `SplitterPanel :size` 百分比）；
- 二级弹窗（父窗体 `ShowDialog()` 的内部窗体）默认**只留占位**，经确认再连带迁移（README §8.4）；
- 隐藏列、`Selected` 列、化学元素列头（Si/Mn/Cr… 保持英文，README §9.5）。

### 4. 产出 index.vue

路径 `src/pages/<模块>/<CODE>/index.vue`（README §2、§3），`<script setup>` 开头必须写来源注释（README §3.1）。

**直接抄最接近的样例，不要从零发明**：

| 画面形态 | 样例 |
|---|---|
| 上下主子表 + 页签 + 候选/明细转移列 | `src/pages/SQM/Tqmtd10/index.vue` |
| 单表格 + 工具栏 | `src/pages/Widgets/Tpa1000/index.vue` |
| 左右主子表 | `src/pages/Widgets/Tax1100/index.vue` |
| 页签（PrimeVue 5 无 TabView） | `src/pages/Widgets/InterfaceCallLog/index.vue` |

控件映射、查询条件区 grid 布局、按钮集中成 `h-9` 工具栏、`hmx-ag-grid` 类、`autoSizeOnFirstData`、`rowSelection` 对象写法、Splitter 用法——全部按 README §4/§8 执行，此处不重复。

### 5. 路由接线

改种子行 `cResPath`（语义段）+ `cResSubPath`（vue 路径），`src/mock/admin/store.ts` 的 `RESCS_KEY` +1。**一批页面集中改、`RESCS_KEY` 只 +1 一次**（README §5、§8.3）。

### 6. 静态校验

```bash
npm run typecheck          # 只允许既有 TS5101(baseUrl 弃用) 报错
node scripts/audit-ui.mjs  # 新页面必须 0 命中（R1 任意字号 / R2 size=small / R3 越档字号 / R4 label 未声明辅助档）
```

### 7. 浏览器实测

```bash
node .qoder/skills/winforms-screen-migration/scripts/verify-page.mjs \
  --menu "质量管理,带钢工艺标准,执行标准管理" --tabs "成分,性能,取样,其他" --out temp/qm3006
```

脚本走登录 → 逐层点菜单（或直接给路由路径作位置参数）→ 逐页签截图 → 打印 `grids/tabs/vite-error-overlay/issues` 与 `PASS|FAIL`。**必须真的看截图**：核对列序与中文列头、按钮文案与顺序、分栏比例、页签内容，光看 PASS 不算验完。

### 8. 收尾

- 多个菜单共用窗体时，说明 `cQueryString` 参数目前未经路由下发（`HmxMenuNode` 不带该字段）；
- 与原画面的**已知偏差**要主动报（例：原 `XtraTabControl HeaderLocation=Left`，PrimeVue Tabs 页签在顶部）；
- 批量作业时往 `temp/migration-log.md`（已 gitignore）追加一行：菜单代码 · 窗体 · 产出路径 · 待接入逻辑 · 偏差。

## 实测踩过的坑

- **中文列头必须按绑定实体取**。同名 `FieldName` 在不同实体里含义不同：`NStatus` 在 `Tqmtd10` 是「状态」、在别的实体是「库存状态」；`CProdCode` 是「品名代码」不是「品名」。脚本已按 `gridControl → bindingSource → typeof(Entity)` 定位实体，人工查 `LDisplay` 时也要按实体查，别用全局字典。
- **隐藏列照样迁**。Designer 里没排 `VisibleIndex` 或 `Visible=false` 的列（`Id`、`CNkStlGrd`、审计字段）全部以 `hide: true` 迁入，列集与原窗体一一对应（README §9.2）。
- **`Selected` 列**：原窗体的 `Selected` 常是「转移标记」勾选列，与 AG Grid 行选择 checkbox 不是一回事；不要为行选择手写 checkbox 列（README §8「选择列」），转移标记若确有交互语义则留待第二阶段接入。
- **转移列 `>>` / `<<`**：Designer 里是 `FieldName` 为 GUID、`Caption` 为 `>>` 的 Unbound 列（`Width=30`）。web 侧做成 `colId: xfer-in/xfer-out` + `cellRenderer`，`width/minWidth` 给到 52——列头右侧的 ⋮ 菜单按钮会占宽，30/34 会把 `>>` 截成 `>`。
- **`autoSizeAllColumns` 会压窄窄列**：给固定窄列设 `minWidth`；`flex: 1` 的列直接忽略 autoSize。
- **Vite dev overlay 会吞点击**：页面 import 解析失败时，overlay 由 `vite/client` 注入，应用层 catch 不掉。`src/router/index.ts` 的 `resolvePageComponent` 已把加载失败的页面降级为「建设中」占位，但 overlay 仍可能出现——`verify-page.mjs` 会统计并移除它，别把它当成页面坏了。
- **PrimeVue 5 无 `TabView`**：用 `Tabs` + `TabList`/`Tab` + `TabPanels`/`TabPanel`（README §4）。

## Resources

- `scripts/extract-screen.mjs` — Designer.cs → 画面骨架摘要（按钮序/分栏/页签/列序+中文列头/隐藏列）。选项：`--uc`、`--depth n`、`--entity-root <dir>`、`--quiet`。
- `scripts/verify-page.mjs` — 无头浏览器实测（登录、点菜单或直连路由、逐页签截图、报错计数）。退出码 0=PASS。选项：`--menu`、`--tabs`、`--base`、`--out`、`--user`、`--full`；依赖 `playwright-core`（项目未装时自动找全局 `npm root -g`）。

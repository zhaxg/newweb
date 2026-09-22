---
name: winforms-screen-migration
description: 把 DDH-MES 的 WinForms 窗体一次迁移到位——画面 + 事件逻辑 + 后端接口 + 增删改保存，复刻为本仓库的 Vue 页面。当用户说「复刻迁移 QM3006 画面」「迁移 FrmYD2001」「迁移这个菜单」「按 README 规则迁画面」或给出菜单代码/窗体类名要求做成 web 页面时使用。覆盖：Designer.cs 骨架提取、实体中文列头解析、C# Svc<I*>.Proxy → swagger API 映射、TrackableList 变更跟踪、index.vue 产出、路由接线、typecheck/audit:ui 与无头浏览器实测。
argument-hint: <菜单代码或 Frm 类名>
---

# WinForms 窗体完整迁移

## Overview

把一个 DevExpress WinForms 窗体（`FrmXXXX.cs` + `FrmXXXX.Designer.cs`）忠实复刻成本仓库的 Vue 页面，**一次做完**：布局与列、查询与保存、下拉候选与校验掩码、二级弹窗占位，全部对照 C# 原样落地。

## 硬规则（不迁完就是没迁完）

1. **一个窗体一次迁完**——画面 + 事件逻辑 + 后端接口 + 变更跟踪。禁止「先只迁画面、处理器留 `toast("待接入")`」的两阶段做法；只有打印/L2 等后端确实没提供的能力才允许留占位，且必须写进页面来源注释的「待接入」清单（见流程第 4 步）。
2. **不发明控件**：Designer 里没有的输入框、按钮、页签，一律不加；查询条件区就是 `LayoutControlItem` 那一批。
3. **列集与原窗体一一对应**：Designer 声明的列全部迁入，未排 `VisibleIndex`/`Visible=false` 的以 `hide: true` 收着；中文列头按**绑定实体**取，化学元素列头保持英文。
4. **接口不手拼 URL**：一律先查 `src/api/mes4ddh/<域>.swagger.ts` 已生成的 `<svc>Api.<method>`；缺方法才按命名规则补进同一域文件。
5. **保存一律走 `TrackableList` + `crudAppService.SaveList`**，不自己 diff、不自己攒增删改数组。
6. **验证以截图为准**：`audit:ui` / `typecheck` 只证明代码没坏，第 8 步真看截图才证明画面复刻对了。

## 规则真源

本 skill 就是迁移规则的唯一真源；`README.md` 的「WinForms 画面迁移规则」「字号与密度纪律」已收敛为指向这里的指针。细则按需加载：

| 要查什么 | 文件 |
|---|---|
| 页面设计纪律：四档字阶/红线/缩放档、控件→组件映射、工具栏与查询条件区布局、主子表 Splitter、colDefs 规则 | `references/ui-rules.md` |
| 后端接入：`Svc<I*>.Proxy.Method` → `<svc>Api.method` → URL、参数 `data`/`params`、`GetTrackingList` → `TrackableList`、`crudAppService` | `references/backend-api.md` |
| 提取器能还原什么、丢什么、怎么自检 | `references/extractor.md` |

## 前置：确认两件事

1. **WinForms 源码根**。默认就在仓库内：`temp/ddh_rmes`（后端 C# 源码副本，约 60MB，`temp/` 已 gitignore）。四类路径：

   | 要找的东西 | 位置 |
   |---|---|
   | 业务窗体 Designer / 事件代码 | `temp/ddh_rmes/rmes.winform/DDH.Winforms.<模块>/Forms/**/Frm<NAME>{.Designer,}.cs` |
   | 内嵌 UserControl | `temp/ddh_rmes/rmes.winform/DDH.Winforms/Controls/UC*{.Designer,}.cs` |
   | 管理端窗体 | `temp/ddh_rmes/rmes.core/Hmx.WinForms/Forms/**` |
   | 实体 / `[LDisplay]` / `I*AppService` | `temp/ddh_rmes/rmes.service/DDH.Service/<模块>/{Entities,Services}/**/*.cs` |

   窗体名不确定在哪时直接全查，别猜目录：`find temp/ddh_rmes -name "FrmYl01*.cs"`。`temp/ddh_rmes` 不存在（新克隆）才回落到 `../ddh_gzmes`，再失败就问用户要路径，**本会话内不再重复问**。
2. **开发服务器**。`npm run dev`（默认 5173，被占则顺延）；Mock 模式下 `admin` + 任意密码可登录。**端口自动探测不可信**：同机常挂着别的 vite 项目，返回 200 但不是本应用，脚本会在别人家的登录页上超时。`verify-page.mjs` 已改为拿 `index.html` 的 `<title>` 做身份指纹；仍不对时显式给 `--base http://localhost:<端口>`。

## 流程

### 1. 定位窗体

在 `src/mock/admin/data/rescs.ts` 里按 `cCode`（菜单代码，如 `QM3006`）或 `cTitle` 搜种子行：

- `cResSubPath` 已是 `/SQM/Tqmtd10/index.vue` → 页面已存在，本次是**修订**（先 diff 现有 vue，缺的接口/逻辑补上就是本次的活）；
- `cResSubPath` 还是 `DDH.Winforms.X.Forms.FrmYyy` → 待迁，最后一段类名即窗体文件；
- 种子行已被改写、需要回溯原始窗体 → 查 `temp/HMX_RES.json` 的 `C_RES_SUB_PATH`。

记下 `cQueryString`（同窗体多菜单的产线参数）与 `cPid` 链（父菜单标题，第 8 步进画面要用）。多个菜单共用一个窗体时只产出一个 vue（源项目→目标目录、产出命名见 `references/ui-rules.md` §0）。

### 2. 提取画面骨架 + 逻辑台账

一个窗体的 Designer 常 500~900 行、信息密度极低。先跑脚本拿摘要，**别整读 Designer.cs**：

```bash
node .qoder/skills/winforms-screen-migration/scripts/extract-screen.mjs \
  "temp/ddh_rmes/rmes.winform/DDH.Winforms.SQM/Forms/Tqmyl/FrmYl01.Designer.cs" --uc \
  --entity-root "temp/ddh_rmes/rmes.service/DDH.Service/SQM"
```

输出即复刻清单：按钮（容器 `Controls.Add` 顺序 = 画面原序）、分栏（上下/左右 + `SplitterPosition`）、页签（标题 + 内含控件）、每个表格的**绑定实体**、按 `VisibleIndex` 排序的可见列（中文列头优先 Designer `Caption`，否则该实体 `[LDisplay]`，并标注来源）、必须带 `hide: true` 迁入的隐藏列、**输入控件区**（挂在哪个标签下、`bind=EditValue→字段@绑定源`、`下拉[文本=枚举值]`、`mask=… maskType=…`），以及**后端调用台账**（文件末尾）：

```
----- 后端调用台账 FrmHR1000.cs -----
  服务调用 1 处（前端映射规则见 references/backend-api.md §1）:
    btnQuery_Click               hR1000Api.queryList        [已生成]  /dDH.Service.SHR.Services/hR1000/queryList
    btnSave_Click                thr1000BindingSource.GetTrackingList<Thr1000>().ToSaveChangesData()  [跟踪]
                              → new TrackableList<Thr1000>(rows) + crudAppService.SaveList(list, "Thr1000")
  二级弹窗（默认只留占位，经确认再连带迁移）: FrmFormulaEditor  FrmYl04
```

台账就是第 5 步的待办清单。`--uc` 递归展开内嵌 UserControl（默认 3 层，`--depth` 可调），UC 的调用与弹窗一起列。只有摘要标了 `←需查实体` 的列、或要核对个别尺寸时才回读原文件；能力边界与**丢数据自检**见 `references/extractor.md`（提取后必跑一次，两个数不等就是有列被静默吞掉）。

### 3. 判读与提问

对着摘要确认，有疑问先问用户、不要猜：

- 主/子表关系与分栏比例（`SplitterPosition` ÷ 容器高度 → `SplitterPanel :size` 百分比）；
- 二级弹窗（父窗体 `ShowDialog()` 的内部窗体）默认**只留占位**，经确认再连带迁移；
- 隐藏列、`Selected` 转移列、化学元素列头（保持英文）；
- 下拉候选值：给了 `下拉[文本=枚举值]` 的直接照抄成 `Select` 选项表；只给了 `bind=…@绑定源` 而**没有** `下拉[…]` 的，选项是运行时灌的（字典表或枚举），回读同名 `.cs` 或问用户，**别自己编**；
- 台账里标 `[需补]` 的接口：确认后端方法签名与入参形状（读 `I*AppService.cs`）后再补进 swagger 文件。

### 4. 产出 index.vue

路径 `src/pages/<模块>/<CODE>/index.vue`，`<script setup>` 开头写来源注释（这是该画面的接口台账）：

```ts
/** 对应 FrmHR1000（轧钢计划管理）：DDH.Winforms.SHR.Forms.FrmHR1000
 *  已接入：hR1000Api.queryList / crudAppService.SaveList("Thr1000")
 *  待接入：打印（后端未提供）*/
```

**直接抄最接近的样例，不要从零发明**：

| 画面形态 | 样例 |
|---|---|
| 上下主子表 + 页签 + 候选/明细转移列 | `src/pages/SQM/Tqmtd10/index.vue` |
| 单表格 + 工具栏 | `src/pages/Widgets/Tpa1000/index.vue` |
| 左右主子表 | `src/pages/Widgets/Tax1100/index.vue` |
| 页签（PrimeVue 5 无 TabView） | `src/pages/Widgets/InterfaceCallLog/index.vue` |
| **行内编辑 + 增删改保存（TrackableList 全套）** | `src/pages/admin/role/index.vue` |

布局、控件映射、字阶密度、colDefs 写法 → `references/ui-rules.md`（工具栏 `h-9`、查询条件区 `grid grid-cols-6`、`hmx-ag-grid`、`autoSizeOnFirstData`、`rowSelection` 对象写法、Splitter 等全部照它执行）。

### 5. 接后端：把台账逐条落地

规则与模板在 `references/backend-api.md`，三条铁律：

- `Svc<IHR1000AppService>.Proxy.QueryList(...)` → `hR1000Api.queryList(...)`，URL `/dDH.Service.SHR.Services/hR1000/queryList`；**先 `grep -n "hR1000Api" src/api/mes4ddh/shr.swagger.ts`，命中就 import**，别手拼 URL、别另立 request 文件；
- 每个 `GridView` 一个 `shallowRef<TrackableList<T>>` 直接当 `:row-data`；新增 `push` 后取回数组里的跟踪项再 `applyTransaction`；删除 `remove(pred)`；保存 `crudAppService.SaveList(trackList.value, "<实体名>")`；
- 其余计算/校验回读 `Frm<NAME>.cs` 对着搬：中文提示逐字照抄，`MessageBox` → `toast`/受控 `Dialog`，`catch` 里不重复弹错（拦截层已 toast）。

### 6. 路由接线

改种子行 `cResPath`（语义段）+ `cResSubPath`（vue 路径，相对 `src/pages`），`src/mock/admin/store.ts` 的 `RESCS_KEY` +1。**一批页面集中改、`RESCS_KEY` 只 +1 一次**。

### 7. 静态校验

```bash
npx vue-tsc --noEmit --ignoreDeprecations 6.0   # 真门槛：npm run typecheck 因 tsconfig baseUrl 触发 TS5101，会跳过所有文件级诊断（假绿，仓库里藏着 41 个错）
node scripts/audit-ui.mjs                        # 新页面必须 0 命中（R1 任意字号 / R2 size=small / R3 越档字号 / R4 label 未声明辅助档）
```

既存命中是历史页留下的，别顺手改别人的页面。

### 8. 浏览器实测

```bash
node .qoder/skills/winforms-screen-migration/scripts/verify-page.mjs \
  --menu "质量管理,带钢工艺标准,执行标准管理" --tabs "成分,性能,取样,其他" --out temp/qm3006
```

`--menu` 用 **`cCode-cTitle`** 拼出的侧栏文本（`menuApi.ts` 就是那么渲染的）；`--out` 是文件名前缀（产出 `temp/qm3006-00.png` 等）；没有位置参数深链接，非默认路由先登录再点菜单。脚本走登录 → 逐层点菜单 → 逐页签截图 → 打印 `grids/tabs/vite-error-overlay/issues` 与 `PASS|FAIL`，退出码 0=PASS。**必须真的看截图**：核对列序与中文列头、按钮文案与顺序、分栏比例、页签内容；接了后端的画面还要验查询回填与保存往返（Mock 模式下看请求是否打到 mock、行是否落库），光看 PASS 不算验完。

### 9. 收尾

- 多个菜单共用窗体时，说明 `cQueryString` 参数目前未经路由下发（`HmxMenuNode` 不带该字段）；
- 与原画面的**已知偏差**主动报（例：原 `XtraTabControl HeaderLocation=Left`，PrimeVue Tabs 页签在顶部）；
- 批量作业时往 `temp/migration-log.md`（已 gitignore）追加一行：菜单代码 · 窗体 · 产出路径 · 已接接口 · 待接入 · 偏差。

### 批量迁移（多窗体一批做）

1. **约定只确认一次**：首迁产出即为模板样例，同批后续页面直接套模板，不重复读参考页；
2. **提取可以一次性跑完**：批内每个窗体各跑一次 `extract-screen.mjs`，把台账汇总成一份待办清单再动手，避免边读边写；
3. **接线集中改**：种子行 `cResPath/cResSubPath` 一批改完、`RESCS_KEY` 只 +1 一次、`vue-tsc`/`audit:ui` 只跑一次收尾；
4. **二级弹窗先问后迁**：`ShowDialog()` 的内部弹窗默认只留占位（台账已列名），经确认再连带迁移，避免多读多写；
5. 一批里接口台账 `[需补]` 的窗体单独收尾：补进 swagger 后要重跑 `vue-tsc`，因为它改了共享类型文件。

## 实测踩过的坑

- **中文列头必须按绑定实体取**。同名 `FieldName` 在不同实体里含义不同：`NStatus` 在 `Tqmtd10` 是「状态」、在别的实体是「库存状态」；`CProdCode` 是「品名代码」不是「品名」。脚本已按 `gridControl → bindingSource → typeof(Entity)` 定位实体，人工查 `LDisplay` 时也要按实体查，别用全局字典。
- **隐藏列照样迁**（`Id`、`CNkStlGrd`、审计字段以 `hide: true` 收着），否则列面板与原窗体对不上。
- **`Selected` 列**常是「转移标记」勾选列，与 AG Grid 行选择 checkbox 不是一回事；不要为行选择手写 checkbox 列。
- **转移列 `>>` / `<<`**：Designer 里是 `FieldName` 为 GUID、`Caption` 为 `>>` 的 Unbound 列（`Width=30`）。web 侧做成 `colId: xfer-in/xfer-out` + `cellRenderer`，`width/minWidth` 给到 52——列头右侧的 ⋮ 菜单按钮会占宽，30/34 会把 `>>` 截成 `>`。
- **`autoSizeAllColumns` 会压窄窄列**：给固定窄列设 `minWidth`；`flex: 1` 的列直接忽略 autoSize。
- **fitWidth 估宽**：中文列头按 `字数 × 13 + 60` 给初始宽，再靠 autoSize 收；直接给 `width: 80` 会让 4 字列头换行截断。
- **不要发明控件**：Tqmtd10 曾凭空加了一行「查找」快速过滤，Designer 里没有，属违规（硬规则 2）。
- **Vite dev overlay 会吞点击**：页面 import 解析失败时 overlay 由 `vite/client` 注入，应用层 catch 不掉。`src/router/index.ts` 的 `resolvePageComponent` 已把加载失败的页面降级为「建设中」占位，`verify-page.mjs` 会统计并移除 overlay——别把它当成页面坏了。
- **PrimeVue 5 无 `TabView`**：用 `Tabs` + `TabList`/`Tab` + `TabPanels`/`TabPanel`。
- **换引用 = 丢跟踪**：`trackList.value = someRows` 只在查询回填时做；行内新增删除一律 `push`/`remove`，否则 `SaveChangesData` 算成全删全加。

## Resources

- `references/ui-rules.md` — 页面设计纪律：四档字阶与红线、缩放档、控件→组件映射、工具栏/查询条件区/主子表布局、AG Grid 与 colDefs 规则。
- `references/backend-api.md` — 后端接入：`Svc<I*>.Proxy` → `<svc>Api.<method>` → URL 映射、swagger 复用、`TrackableList`/`crudAppService` 保存、事件逻辑搬迁清单。
- `references/extractor.md` — 提取器能力边界：可靠项、盲区（几何是有意不抄）、丢数据自检命令。
- `scripts/extract-screen.mjs` — Designer.cs + 同名 .cs → 画面骨架与后端调用台账。选项：`--uc`、`--depth n`、`--entity-root <dir>`、`--svc-root <dir>`（`I*AppService` 搜索根，默认自动找 `rmes.service`）、`--api-root <dir>`（默认 `src/api/mes4ddh`）、`--no-calls`、`--quiet`。
- `scripts/verify-page.mjs` — 无头浏览器实测（登录、点菜单、逐页签截图、报错计数；`<title>` 指纹认项目）。退出码 0=PASS。选项：`--menu`、`--tabs`、`--base`、`--out`、`--user`、`--full`；依赖 `playwright-core`（项目未装时自动找全局 `npm root -g`）。

# 页面设计纪律（字号 / 密度 / 布局 / 控件映射）

迁移产出的每一页都必须过这一关；`npm run audit:ui` 机检 R1–R4，人工核布局。本文件与 `scripts/audit-ui.mjs` 一致，冲突时以审计脚本为准。

## 0. 窗体来源与产出路径

### 0.1 定位（由菜单资源表驱动）

侧栏每个 type=2 菜单在资源种子 `src/mock/admin/data/rescs.ts` 中指向原窗体：

- `cResPath` = 源程序集名（如 `DDH.Winforms.SYD.dll`）→ 决定源项目与目标目录；
- `cResSubPath` = 窗体全名（如 `DDH.Winforms.SYD.Forms.FrmYD2001`）→ 最后一段类名即窗体文件；
- 源文件 = `<项目>/**/<类名>.cs` + `<类名>.Designer.cs`，**布局一律以 Designer.cs 为准**（控件树、Caption、列定义、初始尺寸）；
- 种子行已被改写（`cResSubPath` 已是 vue 路径）、需要回溯原始窗体 → 查 `temp/HMX_RES.json`（`HM_X_RES` 表原始导出，字段大写下划线：`C_RES_SUB_PATH`/`C_CODE`/`C_TITLE`/`C_PID`）按 `C_TITLE` 或 `ID` 找到记录，读 `C_RES_SUB_PATH` 得全限定类名。

### 0.2 源项目 → 目标目录

| 源项目 | 位置 | 目标目录 |
|---|---|---|
| Hmx.WinForms | rmes.core | `src/pages/admin` |
| Hmx.WinForms.Widgets | rmes.core | `src/pages/Widgets` |
| DDH.Winforms | rmes.winform | `src/pages/DDH` |
| DDH.Winforms.LIMS / SHR / SMP / SMS / SQM / SYD | rmes.winform | `src/pages/<同名段>` |

即 `DDH.Winforms.<X>` → `src/pages/<X>`。

### 0.3 产出文件

- 窗体 `Frm<CODE>` → `src/pages/<目标目录>/<CODE>/index.vue`（去 `Frm` 前缀；对话框等配套组件同目录放 `XxxDialog.vue`）；
- 多个菜单共用同一窗体（`cResSubPath` 相同、`cQueryString` 不同，如 `FrmHR2000` 同挂轧钢/棒材日计划）→ **只产出一个 vue**，运行参数经路由 query 传入；
- 已完整迁移的 admin 页（user/role/resc/kv/department/jobs/gen）即此规则的先行样例，其中 `admin/role/index.vue` 同时是「查询 + 行内编辑 + 增删 + 保存」的模板。

### 0.4 路由接线（每迁完一个菜单）

1. 种子行 `cResPath` 改语义段、`cResSubPath` 改 vue 组件路径（相对 `src/pages`，如 `/SYD/YD2001/index.vue`）；
2. `src/mock/admin/store.ts` 的 `RESCS_KEY` 版本号 +1（强制 localStorage 重播种）——**一批页面集中改、只 +1 一次**；
3. 静态校验 + 浏览器实测（见 SKILL.md §7、§8）。

## 1. 四档字阶（唯一合法字号）

钉死在 `src/styles/globals.css` 的 `@theme`，全部 rem，随根字号缩放：

| 档位 | 类名 | 16px 基准下 | 用途 |
|---|---|---|---|
| 辅助/控件 | `text-xs` | 12px | 工具栏按钮、表单标签、表格数字、弹窗正文、状态栏 |
| 正文 | `text-body` | 13px | 正文性段落（如更新提示）、ag-grid 单元格 |
| 标题 | `text-sm` | 14px | 页头标题、面板标题 |
| 主标题 | `text-base` | 16px | 登录页等大标题 |

- 裸文本兜底已收进字阶：`body` 基准 = 正文档 13px，"不写字号"落正文而非浏览器默认 16px；辅助档仍需显式 `text-xs`——那是角色声明，不是补丁。
- 控件/导航 chrome 一律辅助档（侧栏 Tree、页签栏、按钮、输入框、ag-grid 表头 12px，由 `primeTheme.ts` / `agGrid.ts` / `HmxTabBar.vue` 钉死）；数据/阅读正文用正文档。两档之差是合法分工，不是漂移。
- 字号真源只有字阶 rem，不允许孤儿数字 knob。

## 2. 红线（audit:ui 会拦）

- **禁 arbitrary 字号**：不写 `text-[13px]`，就近归入四档；
- **禁越档字号**：`text-lg` / `text-xl` / `text-2xl`… 不用于排版（仅作图标尺寸驱动的 `size-[1em]` 类写法，同一行加 `audit-allow` 豁免）；
- **禁 PrimeVue `size="small"`**：主题 HmxCompact 默认档即紧凑（12px/28px），实例再指定 small 属双重压缩；例外同样 `audit-allow`；
- **禁孤立 px**：组件内字号一律用字阶类，不写 `font-size: NNpx`；主题/ag-grid 层尺寸走 rem；
- **字段 label 唯一写法**：`text-xs text-muted-foreground`。裸 `<label>` 不声明字号/颜色是违规（会掉进 body 兜底 13px + 近黑，和控件族 12px 灰字同屏必然"显大显黑"）。弹窗表单标签不加 `font-medium`、不加 `/80` 透明度变体（段落区分靠分组标题 `text-sm`）；
- 工具栏按钮图标统一 `h-3 w-3`（12px）；树节点/菜单图标不强制。

## 3. 用户缩放档位

系统设置「字体大小」三档：标准 ×1 / 大字体 ×1.15 / 更大字体 ×1.3。机制：`settingsStore.fontScale` → `--hmx-scale` → `html { font-size: calc(var(--hmx-scale,1) * 100%) }`，全站 rem 等比缩放。**这就是布局不抄像素坐标的原因**：抄 px 会吃掉缩放。

## 4. 审计

```bash
npm run audit:ui      # scripts/audit-ui.mjs，零依赖，扫 src/pages|layouts|components
```

违规打印 `文件:行 [规则] 片段` 并非零退出。仓库里已有既存命中（历史页），**新页面必须 0 命中**，不要顺手改别人的页。

## 5. 控件 → Web 组件映射

| WinForms / DevExpress | 本项目 |
|---|---|
| XtraForm / UserControl 壳 | Vue 页面（页签、面包屑由壳层负责，页面只管内容区） |
| GridView（列 Caption/宽度/样式） | AG Grid Enterprise colDefs（沿用 hmxAgGridPlugin 全站约定） |
| BarManager / 工具栏按钮 | 页面顶部 Button 组（名称、顺序、位置照原样） |
| XtraTabControl | PrimeVue `Tabs` + `TabList`/`Tab` + `TabPanels`/`TabPanel`（**PrimeVue 5 无 `TabView`**）；用法 `src/pages/Widgets/InterfaceCallLog/index.vue` |
| TextEdit / SpinEdit / DateEdit / CheckEdit / LookUpEdit | InputText / InputNumber / DatePicker / Checkbox / Select |
| ImageComboBoxEdit（下拉候选写死在 Designer） | Select + 选项表（候选值来自提取摘要的 `下拉[文本=枚举值]`） |
| Panel / GroupControl / SplitContainer | Tailwind flex/grid + Card + PrimeVue Splitter |
| 窗体内嵌弹窗（GridFilter、选择器） | 对应 Dialog 组件 |

Designer 里没有的控件**一律不许发明**（历史上凭空加过"查找"快速过滤行，属违规）。

## 6. 布局固定写法

- **工具栏**：所有操作按钮集中成一行 `flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2`，按钮 `variant="outlined"` + `h-3 w-3` 图标 + `whitespace-nowrap`；
- **查询条件区**：
  - 1–2 个条件：与按钮同行 `flex items-center gap-1`，**不用 label**，靠 `placeholder` 提示字段含义；
  - ≥3 个条件：`grid grid-cols-6 items-center gap-x-3 gap-y-1.5`，最多 3 行；超过 3 行改用 Tabs 分组；每个条件配 `<label class="w-16 shrink-0 text-xs text-muted-foreground">`；日期范围占 `col-span-2`；
- **日期区间**：`<DatePicker selectionMode="range" :manualInput="false" date-format="yy-mm-dd" show-time hour-format="24" show-icon />`（属性名是 `selectionMode`，不是 `selection-range`）；绑定 `Date[] | null`，拆分函数转成后端的 `dBegTime` / `dEndTime`；
- **数字范围**：厚度/宽度/长度等区间用 `RangeInput`（`src/components/common/RangeInput.vue`），不手写两个 `InputNumber + ~`；透传 `show-buttons` / `min-fraction-digits` / `max-fraction-digits` / `mode` / `min` / `max` 等；
- **主子表**：PrimeVue `Splitter` + `SplitterPanel`（`layout="horizontal"` 左右 / `"vertical"` 上下），**子表工具栏必须与主表列头同高**（均 `h-8`），子表数据从主表列头之下开始：

  ```
  [顶部工具栏 h-9：查询条件 + 主表操作按钮]
  ┌─主表标题 h-8──────┐ ┌─子表标题 h-8──[添加][删除][保存]─┐
  │ 主表列头           │ │ 子表列头                        │
  │ 主表数据           │ │ 子表数据                        │
  └───────────────────┘ └─────────────────────────────────┘
  ```

  标题文字 `<span class="text-xs font-medium text-muted-foreground">`；分栏比例 = `SplitterPosition` ÷ 容器高度 → `:size` 百分比；**勿手写 mousemove 分割条**；
- **列宽**：`autoSizeOnFirstData`（`@/lib/agGrid`，内部延一帧 `autoSizeAllColumns()`）挂 `@first-data-rendered`；查询回填后再 `requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns())`；多栏布局每个表格独立注册。`flex: 1` 的列会忽略 autoSize；窄固定列（转移列 `>>`）要给足 `minWidth`（列头右侧 ⋮ 菜单占宽，30/34 会把 `>>` 截成 `>`，给 52）。

## 7. AG Grid 约定

- 根 class 必挂 `hmx-ag-grid`（全局直角 `borderRadius: "0px"`，否则圆角漂移）；
- `:default-col-def="hmxDefaultColDef"`、`:theme="makeHmxGridTheme()"`、`:locale-text="AG_GRID_LOCALE_CN"`、`:pagination="false"`；
- **选择列**用 v36 对象写法，`colDefs` 里**不写**任何 `checkboxSelection` / `headerCheckboxSelection`（会双 checkbox）：

  ```ts
  // 多选（列头全选 + 行点击选中）
  :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
  // 单选
  :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
  ```

  需要单元格划选时叠加 `:cell-selection="true"`（Enterprise），与 rowSelection 并存不冲突；
- 原窗体的 `Selected` 列常是**转移标记**勾选列，与 AG Grid 行选择 checkbox 不是一回事；不要为行选择手写 checkbox 列，转移标记若确有交互语义则按 `colId: xfer-in/xfer-out` + `cellRenderer` 做。

## 8. colDefs 提取规则

1. **来源优先级**：Designer 的 `colXXX.Caption`（有则直接当 `headerName`）→ 该**绑定实体**的 `[LDisplay("中文")]`（等效原系统运行时读的 `DisplayNameAttribute`/`DescriptionAttribute`）→ 内嵌 `UC*.Designer.cs` 里的列定义（先找 `new UCXxx()` 引用再进 UC 文件）；
2. **列集与原窗体一一对应**：Designer 声明的列全部带入（含 `Id`、`Creator`、`CreateTime`、`LastModifier`、`LastModifyTime`、`NStatus` 等系统字段），不做字段类型层面的增删；未排 `VisibleIndex` 或 `Visible=false` 的以 `hide: true` 迁入（右键列面板仍可唤出）；按 `VisibleIndex` 排序，同 `FieldName` 去重保留第一个；
3. **中文列头内联**，禁止共享映射文件（不要 `fieldLabelMap.ts`）：

   ```ts
   const colDefs = ref<ColDef[]>([
     { field: "COrderNo", headerName: "订单号", width: 150 },
     { field: "CSgCode", headerName: "钢种", width: 100 },
   ]);
   ```

4. **化学元素列头保持英文**：Si、Mn、Cr、Ni、Mo、V、Nb、Ti、Al、P、S、Cu 等不翻译；
5. **空 colDefs 是合法的**：纯按钮面板（无 GridView）、数据录入表单（FrmQL4000 类）、列在 code-behind 动态创建（FrmYll01Record 类）——写 `[]` 并在来源注释「待接入」记一笔，不要去别处抄列凑数。

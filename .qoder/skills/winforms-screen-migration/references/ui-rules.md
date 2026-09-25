# 页面设计纪律（字号 / 密度 / 布局结构 / 控件映射）

迁移产出的每一页都必须过这一关；`npm run audit:ui` 机检 R1–R4，**人工核的是布局结构**（见 §3.5）。本文件与 `scripts/audit-ui.mjs` 一致，冲突时以审计脚本为准。

## 0. 窗体来源与产出路径

### 0.1 定位（由菜单资源表驱动）

侧栏每个 type=2 菜单在资源种子 `src/mock/admin/data/rescs.ts` 中指向原窗体：

- `cResPath` = 源程序集名（如 `DDH.Winforms.SYD.dll`）→ 决定源项目与目标目录；迁移完成后改写为语义段（如 `yd2001`），它同时是**路由层级的真源**：`menuRescTree` 按祖先链拼出 `pageId`，`router/fromMenu` 按它建记录 → 最终 URL `/<pageId>`；
- `cResSubPath` = 窗体全名（如 `DDH.Winforms.SYD.Forms.FrmYD2001`）→ 最后一段类名即窗体文件；
- 源文件 = `<项目>/**/<类名>.cs` + `<类名>.Designer.cs`，**布局以 Designer 控件树为准**（`Controls.Add` 归属与顺序、`Dock`、`SplitContainer`/`SplitterPosition`、Caption、列定义）；**`Location`/`Size` 像素不抄**（见 §3.5）；
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
3. **不写路由表、不改 `menuRescTree`**：菜单与路由同源于后端资源，`menuRescTree` 出树 → `router/fromMenu` 转 `RouteRecordRaw` → `router/index` 挂进壳层 → `router/menu` 投影出侧栏。组件路径未命中 `import.meta.glob` 时回落 `PlaceholderPage`（建设中，不整站报错）；
4. 静态校验（见 SKILL.md §7）。浏览器画面验收由用户自行打开检查，迁移流程不跑无头截图。

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
- **每个 `<Dialog>` 必须主动标记初始焦点**：footer/header/content 内给一个元素加 `autofocus`——表单弹窗标**首个可用输入框**（别标会被 `:disabled` 禁用的字段，标记被禁用元素 = 焦点丢失），确认类标**右下主按钮**（Enter 触发主操作而非关闭）。坑点：PrimeVue `Dialog.focus()` 只认 `[autofocus]`（footer→header→content 查找，`Dialog.vue` 官方实现），一个标记都找不到就兜底聚焦右上角**关闭按钮**——回车/空格极易误触关闭。平台**不**做全局兜底补丁（曾覆写上游私有 `Dialog.methods.focus`：非公开 API，升级即静默失效，且页面看到的 Dialog 与实际行为不一致，已移除）——标记是页面显式契约，R5 机检（`<Dialog>` 块内无 `autofocus` 即命中）。

## 3. 用户缩放档位

系统设置「字体大小」三档：标准 ×1 / 大字体 ×1.15 / 更大字体 ×1.3。机制：`settingsStore.fontScale` → `--hmx-scale` → `html { font-size: calc(var(--hmx-scale,1) * 100%) }`，全站 rem 等比缩放。

### 3.5 布局结构优先（最重要）；不抄 Location/Size

| 必须正确 | 明确不做 |
|---|---|
| **元素齐全**：Designer 里有的按钮/输入/表/页签/隐藏列都进 vue | 抄 `Location.X/Y`、`Size.Width/Height` 写 `absolute`/`left`/`top`/`width: 120px` 定位 |
| **包含关系**：谁在哪个 Panel/Group/页签/SplitterPanel 里（对应 DOM 父子） | 为了「和原截图像素一样」去调坐标 |
| **顺序与方位**：`Controls.Add` 顺序、`Dock` Top/Bottom/Left/Right → 上下左右、flex 主轴 | 用坐标差推断左右关系（应用 Dock/树/摘要） |
| **分割**：`SplitContainer` 横竖、`SplitterPosition` → `Splitter layout` + 大致 `:size` 百分比 | 手写 mousemove 分割条；抠分割条像素位置 |

自检口令：**元素丢没丢？父子对不对？上下左右反没反？Splitter 轴向与比例对不对？** 四问都过即可；`Location` 数值本身不进交付标准。这也是布局不抄像素的原因之一：抄 px 会吃掉用户三档缩放。

## 4. 审计

```bash
npm run audit:ui      # scripts/audit-ui.mjs，零依赖，扫 src/pages|layouts|components
```

违规打印 `文件:行 [规则] 片段` 并非零退出。仓库里已有既存命中（历史页），**新页面必须 0 命中**，不要顺手改别人的页。

## 5. 控件 → Web 组件映射

| WinForms / DevExpress | 本项目 |
|---|---|
| XtraForm / UserControl 壳 | Vue 页面（页签、面包屑由壳层负责，页面只管内容区） |
| GridView（列 Caption/宽度/样式） | AG Grid Enterprise colDefs（沿用 @/lib/agGrid 全站约定：hmxDefaultColDef 等） |
| BarManager / 工具栏按钮 | 页面顶部 Button 组（名称、顺序、位置照原样） |
| XtraTabControl（独立内容页签） | PrimeVue `Tabs` + `TabList`/`Tab` + `TabPanels`/`TabPanel`（**PrimeVue 5 无 `TabView`**）；用法 `src/pages/Widgets/InterfaceCallLog/index.vue` |
| XtraTabControl（录入模式切换，页签下各为一组左右双表） | PrimeVue `SelectButton`（`v-model` 切模式，**不用 Tabs**）；工具栏与双表布局见 §6「模式切换工具栏 + 左右双表」，样例 `src/pages/LIMS/QL4000/index.vue` |
| TextEdit / SpinEdit / DateEdit / CheckEdit / LookUpEdit | InputText / **InputNumber（定宽必须 容器+`fluid`，见 §6）** / DatePicker / Checkbox / Select |
| ImageComboBoxEdit（下拉候选写死在 Designer） | Select + 选项表（候选值来自提取摘要的 `下拉[文本=枚举值]`） |
| Panel / GroupControl / SplitContainer | Tailwind flex/grid + Card + PrimeVue Splitter |
| 窗体内嵌弹窗（GridFilter、选择器） | 对应 Dialog 组件 |
| **MemoExEdit / 多行批量录入**（批量计划号、批量订单号、合同号等「批量xx号」） | **`src/pages/Widgets/BatchIdInput/index.vue`**（只读触发框 + 弹出 Dialog 逗号/换行粘贴，`v-model` 为逗号串）；`label`/`unit` 传入字段名（如 `label="批量订单号"`、`label="合同号"`），**禁止在页面内再手写同构 Dialog**；解析可用 `Widgets/BatchIdInput/parse` 的 `parseBatchIds`。样例：`src/pages/SHR/HR2000/index.vue` |

Designer 里没有的控件**一律不许发明**（历史上凭空加过"查找"快速过滤行，属违规）。

**建议（批量xx号）**：查询区遇到「批量计划号 / 批量订单号 / 批量合同号 / 合同类多编号」等原 `MemoExEdit`（或等价多行粘贴）控件时，一律使用 **`Widgets/BatchIdInput`**，通过 `label`（及可选 `unit`）改名复用，不要复制粘贴各页 Dialog 逻辑。

## 6. 布局固定写法

- **工具栏高度（硬规则）**：**凡一行里放了操作按钮（原 stackPanel/BarManager），高度统一 `h-9`**——顶部查询条、子表按钮条、与表标题共用的表头条，一律 `h-9`，禁止 `h-8`/`h-10`/`py-*` 另起高度。固定 class：

  ```
  flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2
  ```

  按钮 `variant="outlined"` + `h-3 w-3` 图标 + `whitespace-nowrap`。
- **按钮 + 表标题共用一行**（原 stackPanel2 与 ViewCaption 同屏时）：同一 `h-9` 行内 **按钮靠左、表格标题靠右**（`ml-auto`），不再拆成「按钮条 + 标题条」两行：

  ```
  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
    <Button …>审核报出</Button><Button …>驳回</Button><Button …>撤销报出</Button>
    <span class="ml-auto text-xs font-medium text-muted-foreground">试验项目</span>
  </div>
  ```

  纯标题、**不含任何按钮**的分区头（如「委托单信息」「试样信息」）才用 `h-8`。
- **查询条件区**：
  - 1–2 个条件：与按钮同行 `flex items-center gap-1`，**不用 label**，靠 `placeholder` 提示字段含义；
  - ≥3 个条件：`grid grid-cols-6 items-center gap-x-3 gap-y-1.5`，最多 3 行；超过 3 行改用 Tabs 分组；**只有日期范围占 `col-span-2`**——数字区间（`RangeInput`，厚/宽/长这类复合数字控件）**占 1 列、不跨列**，它信息密度高，一列够用；
  - **label 宽度（硬规则）——按下表顺序判定，命中即停，不许跳级**（对齐是第一诉求，宽度档位、文案、个例放行都是它的让步手段）：

    | 顺位 | 判据 | 动作 |
    |---|---|---|
    | **1** | **同一页内所有 label 必须同一个 `w-*`**（对齐优先） | 整页统一成一个值；**禁止按文字长短逐个凑**——`w-12`/`w-14`/`w-16`/`w-24` 混用会让输入框起点落在 54/62/70/102px 四处，两行同列也错开（TI1010 踩过） |
    | **2** | 默认 `w-16`（64px，放得下 ≤5 字） | 就用 `w-16`，到此为止 |
    | **3** | `w-16` 会折行（≥6 字） | **整页**放宽到 `w-18`（72px，正好 6 个 12px 中文）；仍折行进下一条 |
    | **4** | `w-18` 还是放不下（≥7 字） | **改文案**（「装炉时间范围」→「装炉时间」、「销售合同号」→「销售合同」），不再加宽 |
    | **5** | 前四条都走不通（原文案一字不可改） | **单页让步放行**：该页自定更宽的 `w-*`，必须在来源注释写明「放宽到 w-XX，因 XXX」 |

    - 统一是**页内**要求：同页一个值即可，**跨页不必一致**（全站 `w-16` 568 处是默认惯性，不是跨页契约）；
    - `label` 必须带 `shrink-0`——否则长文字会把 label 压窄，起点又漂回去；
    - 固定 class：`<label class="w-XX shrink-0 text-xs text-muted-foreground">`；
    - `audit:ui` 只查 R4（label 缺 `text-xs`），**不查宽度一致性**——这一条靠人工核对。
- **日期区间**：`<DatePicker selectionMode="range" :manualInput="false" date-format="yy-mm-dd" show-time hour-format="24" show-icon />`（属性名是 `selectionMode`，不是 `selection-range`）；绑定 `Date[] | null`，拆分函数转成后端的 `dBegTime` / `dEndTime`；
- **数字范围**：厚度/宽度/长度等区间用 `RangeInput`（`src/components/common/RangeInput.vue`），不手写两个 `InputNumber + ~`；透传 `show-buttons` / `min-fraction-digits` / `max-fraction-digits` / `mode` / `min` / `max` 等；
- **工具栏里的定宽数字框（硬规则）**：`InputNumber` **不加 `fluid` 时内部 input 吃浏览器 intrinsic 宽（约 170px），不认外层 `w-*`**，会向右溢出、被同一行后续按钮叠画（HR5200/HR5300「支数」踩过）。固定写法——**外层定宽容器 + `fluid`**，工具栏里再关 spinner：

  ```html
  <div class="w-28 shrink-0">
    <InputNumber v-model="n" :min="0" :show-buttons="false" fluid />
  </div>
  ```

  - `fluid` → `.p-inputnumber-fluid { width:100% }` + input `width:1%`/`flex:1` 撑满容器（PrimeVue 官方填充），宽度以容器为准；
  - **禁止**只写 `<InputNumber class="w-28 shrink-0" />`（class 打在 `.p-inputnumber` 根上，管不住 input 的 intrinsic 宽）；
  - 工具栏场景 `:show-buttons="false"`（stacked spinner 绝对定位叠在框上，观感也是「按钮压 input」）；需要步进按钮时用 `button-layout="horizontal"` 并给容器留出按钮宽，仍必须 `fluid` + 定宽容器；
  - 弹窗表单里占满列宽的数字框：同样 `fluid`（可不套容器，随父列宽走）。
- **主子表**：PrimeVue `Splitter` + `SplitterPanel`（`layout="horizontal"` 左右 / `"vertical"` 上下），**轴向与原 `SplitContainer.Orientation` 一致**；子表若带按钮，表头条 = **`h-9` 按钮靠左 + 标题靠右**（见上「按钮 + 表标题共用一行」），子表数据从该表头之下开始；无按钮的纯标题条用 `h-8`：

  ```
  [顶部工具栏 h-9：查询条件 + 主表操作按钮]
  ┌─主表标题 h-8（无按钮）──────────────┐
  │ 主表列头                             │
  └─────────────────────────────────────┘
  ┌[添加][删除][保存] ………… 子表标题] h-9 ┐  ← 有按钮：按钮左、标题右，同一 h-9
  │ 子表列头                             │
  │ 子表数据                             │
  └─────────────────────────────────────┘
  ```

  标题文字 `<span class="text-xs font-medium text-muted-foreground">`；分栏比例 = `SplitterPosition` ÷ 容器高度 → `:size` 百分比；**勿手写 mousemove 分割条**；
- **模式切换工具栏 + 左右双表**（原 `XtraTabControl` 只切「批量/单行」等录入模式、页签下各为同一对左右分栏表时，**不要用 Tabs**，验收样例 `src/pages/LIMS/QL4000/index.vue`）：

  ```
  [顶部工具栏 h-9：查询条件 + 主表操作按钮 ……… 主表标题 右侧]
  ┌ 上下 Splitter：主表（ViewCaption 可并入顶部工具栏右侧，主表可无独立标题条）
  │
  │  [h-9：SelectButton 模式A｜模式B ……………… 页面名 右侧]   ← 两表共用工具栏
  │  ┌ 左右 Splitter ────────────┬──────────────────┐
  │  │ h-9：[子表按钮…] 表标题右     │ h-9：[按钮] 表标题右   │
  │  │ 左表列头+数据                │ 右表列头+数据          │
  │  └──────────────────────────┴──────────────────┘
  ```

  - `SelectButton v-model` 绑模式字符串数组（如 `["批量录入","单行录入"]`），内容区 `v-if/v-else` 切两套左右 Splitter，**不引 Tabs 组件**；
  - 该 `h-9` 行即下方两表的共用工具栏：SelectButton 靠左，右上角 `ml-auto` 页面/区域名（如「检验结果录入」）；
  - 左右面板表头条仍守 §6 硬规则：有按钮 → `h-9` 按钮左 + 标题右；两面板对称同构。
- **列宽**：`autoSizeOnFirstData`（`@/lib/agGrid`，内部延一帧 `autoSizeAllColumns()`）挂 `@first-data-rendered`；查询回填后再 `requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns())`；多栏布局每个表格独立注册。`flex: 1` 的列会忽略 autoSize；窄固定列（转移列 `>>`）要给足 `minWidth`（列头右侧 ⋮ 菜单占宽，30/34 会把 `>>` 截成 `>`，给 52）。

## 7. AG Grid 约定

- 根 class 必挂 `hmx-ag-grid`（全局直角 `borderRadius: "0px"`，否则圆角漂移）；`:theme="makeHmxGridTheme()"` 必传（依赖设置 store 字体响应式，平台无法静态全局化）；
- **默认值不用页面写**：`:locale-text="AG_GRID_LOCALE_CN"`（中文文案）、`:default-col-def="hmxDefaultColDef"`（排序/筛选/列菜单约定）、列虚拟化关闭（`autoSizeAllColumns` 才能量到屏幕外列）三项已由 `@/lib/agGrid` 的 `provideGlobalGridOptions` 全局注入，页面级显式传入仍可覆盖（存量绑定冗余但无害，不必清理）；`:pagination="false"` 也是 AG Grid 自身默认，同样不必写；
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

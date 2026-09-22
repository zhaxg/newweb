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

## 字号与密度纪律

全站采用**两层密度**架构：字阶（开发者写死的语义档）× 缩放档位（用户可调的整体密度）。

### 1. 四档字阶（唯一合法字号）

钉死在 `src/styles/globals.css` 的 `@theme` 中，全部 rem，随根字号缩放：

| 档位 | 类名 | 16px 基准下 | 用途 |
|---|---|---|---|
| 辅助/控件 | `text-xs` | 12px | 工具栏按钮、表单标签、表格数字、弹窗正文、状态栏 |
| 正文 | `text-body` | 13px | 正文性段落（如更新提示） |
| 标题 | `text-sm` | 14px | 页头标题、面板标题 |
| 主标题 | `text-base` | 16px | 登录页等大标题 |

裸文本兜底默认值已收进字阶：`body` 基准 = 正文档 13px（`globals.css` @layer base），"不写字号"落正文而非浏览器默认 16px；辅助档（字段标签、状态栏等）仍需显式 `text-xs`——那是角色声明，不是补丁。

档位落位原则：**控件/导航 chrome 一律辅助档**（侧栏 Tree、页签栏、按钮、输入框、ag-grid 表头 = 12px，由 `primeTheme.ts` 语义档与 `agGrid.ts`/`HmxTabBar.vue` 钉死的 rem 保证）；**数据/阅读正文用正文档**（ag-grid 单元格 = 13px）。两档之差是合法分工，不是漂移；字号真源只有字阶 rem，不允许孤儿数字 knob。

### 2. 红线

- **禁 arbitrary 字号**：不写 `text-[13px]` 这类方括号任意值，就近归入上表四档
- **禁越档字号**：`text-lg` / `text-xl` / `text-2xl`… 不用于排版（若仅作图标尺寸驱动——`size-[1em]` 类写法——在同一行加 `audit-allow` 注释豁免）
- **禁 PrimeVue `size="small"`**：主题 HmxCompact 预设的默认档即紧凑（12px/28px），实例再指定 small 属双重压缩；确需例外同样 `audit-allow`
- **禁孤立 px**：组件内字号一律用字阶类，不写 `font-size: NNpx`；主题/ag-grid 层尺寸走 rem（`primeTheme.ts`、`agGrid.ts`、`styles/agGrid.css`）
- **字段 label 唯一写法**：`text-xs text-muted-foreground`。裸 `<label>` 不声明字号/颜色是违规——它会掉进 body 兜底（13px + 近黑前景色），和控件族 12px 灰字同屏必然"显大显黑"。弹窗表单标签也不加 `font-medium`、不加 `/80` 透明度变体（段落区分靠分组标题 `text-sm`，不靠标签加粗）；由 `audit:ui` R4 拦截漏声明
- 工具栏按钮图标统一 `h-3 w-3`（12px，与控件字号同级）；树节点/菜单图标不强制

### 3. 用户缩放档位

系统设置弹窗「字体大小」三档：**标准 ×1 / 大字体 ×1.15 / 更大字体 ×1.3**，面向年长用户。机制：`settingsStore` 的 `fontScale` → CSS 变量 `--hmx-scale` → `html { font-size: calc(var(--hmx-scale, 1) * 100%) }`，全站 rem 等比缩放（PrimeVue 主题、ag-grid、页签栏字号均已 rem 化以吃到这个缩放）。100% 基准尊重浏览器自身字体设置。

### 4. 审计兜底

```bash
npm run audit:ui     # node scripts/audit-ui.mjs，零依赖
```

扫描 `src/pages` / `src/layouts` / `src/components`，规则 R1（arbitrary 字号）/ R2（size="small"）/ R3（越档字号）/ R4（裸 `<label>` 未声明 `text-xs`），违规非零退出并打印 `文件:行 [规则] 片段`；可挂 CI / pre-commit。豁免：违规行同加 `audit-allow` 注释。

规则真源注释见 `src/styles/globals.css` 顶部「HMX 字阶」块。

## WinForms 画面迁移规则

源码仓：`../ddh_gzmes`（C# WinForms 原系统）。目标：把原窗体的**画面**移植为 Vue 页面；只迁画面，不迁业务逻辑（服务调用、计算、校验、打印实现等后续按新契约单独接入）。

### 1. 来源定位（由菜单资源表驱动）

侧栏每个 type=2 菜单在资源种子（`src/mock/admin/data/rescs.ts`）中指向原窗体：

- `cResPath` = 源程序集名（如 `DDH.Winforms.SYD.dll`）→ 决定源项目与目标目录
- `cResSubPath` = 窗体全名（如 `DDH.Winforms.SYD.Forms.FrmYD2001`）→ 最后一段类名即窗体文件
- 源文件 = `<项目>/**/<类名>.cs` + `<类名>.Designer.cs`，**布局一律以 Designer.cs 为准**（控件树、Caption、列定义、初始尺寸）

#### 1.1 追溯原始 WinForms 来源

如果 `rescs.ts` 中的路由已被修改（cResPath/cResSubPath 已改为 Vue 路径），需要回溯原始窗体来源时，使用导出的原始数据文件：

```
temp/HMX_RES.json
```

该文件包含后端 `HM_X_RES` 表的原始导出，字段为大写下划线命名（`C_RES_SUB_PATH`、`C_PID`、`C_CODE`、`C_TITLE` 等）。追溯步骤：

1. 用菜单的 `ID`（或 `C_TITLE`）在 `HMX_RES.json` 中查找对应记录
2. 读取 `C_RES_SUB_PATH` 字段，得到原始 WinForms 全限定类名（如 `Hmx.WinForms.Widgets.TableConfig.FrmTableConfig`）
3. 据此在 `../ddh_gzmes` 中定位 Designer.cs 文件

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

#### 3.1 Vue 页面来源注释（必须）

每个迁移后的 Vue 页面**必须**在 `<script setup>` 开头写明来源注释，格式如下：

```typescript
/** 对应 FrmHR2000（轧钢日计划管理）：DDH.Winforms.SHR.Forms.FrmHR2000
 *  画面迁移，逻辑不迁移到 */
```

注释包含三部分：
1. **WinForms 类名**：`Frm<CODE>`
2. **中文标题**：原窗体标题
3. **完全类限定名**：命名空间 + 类名（如 `DDH.Winforms.SHR.Forms.FrmHR2000`），用于后续修改时快速定位源文件

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

### 8. 批量提效（试迁 Tpa1000/Tax1000/Tax1100 后的经验）

单迁 3 个菜单实测耗时约 40 分钟，瓶颈依次是：读 Designer.cs（信息密度低，单画面 500~900 行）、参考既有页面确认约定、产出量大、返工修正。批量迁移按以下方式执行：

1. **先脚本化提取画面骨架**：用 Node 脚本从 Designer.cs 批量解析 `SimpleButton.Text`（按钮及顺序）、`LayoutControlItem.Text`（字段标题与位置）、`GridColumn.Visible/VisibleIndex/FieldName/Caption`（列序）、`SplitContainer/TabControl` 层级，输出每个窗体一页结构化摘要；只按需回读原文件核对个别细节，避免整文件通读。
2. **约定只确认一次**：首迁产出即为模板样例（`src/pages/Widgets/Tpa1000`、`Tax1100`），同批后续页面直接套模板，不再重复读 jobs/SysDepartmentsPage 等参考页。
3. **批量接线**：一批页面全部写完后，种子行 `cResPath/cResSubPath` 集中改、`RESCS_KEY` 只 +1 一次、`typecheck` 只跑一次收尾。
4. **二级弹窗先问后迁**：主窗体 `ShowDialog()` 调用的内部弹窗（如 FrmTax1001/1002）默认只在父页面留占位，经确认后再连带迁移，避免多读多写。
5. **固定写法防返工**：
   - 分栏小工具栏直接用 Tailwind div，不抽临时组件；
   - **日期区间**：使用 PrimeVue `DatePicker` 的 range 模式，属性名 `selectionMode="range"`（勿写 `selection-range`），配合 `showTime hourFormat="24"` 支持日期+时间范围。绑定 `Date[] | null`，通过拆分函数转为后端独立的 `dBegTime` / `dEndTime` 参数：
     ```vue
     <DatePicker v-model="dates" selectionMode="range" :manualInput="false"
       date-format="yy-mm-dd" show-time hour-format="24" show-icon />
     ```
   - **查询条件区 grid 布局**（允许最多 3 行）：
     - **1-2 个条件**：查询条件与操作按钮合并为一行 `flex items-center gap-1`，**不使用 label**，直接用 `InputText` 的 `placeholder` 属性提示字段含义（如 `placeholder="关键字"`）；条件在左、按钮紧随其后；
     - **≥3 个条件**：用 `grid grid-cols-6 items-center gap-x-3 gap-y-1.5`，最多 3 行；超过 3 行时用 TabView 分组切换（如"基本信息"/"高级条件"）。日期/时间范围控件允许在 grid 内使用，占用 `col-span-2`。每个条件配 `<label class="w-16 shrink-0 text-xs text-muted-foreground">`；
   - **数字范围控件**：厚度/宽度/长度等数值区间查询条件使用 `RangeInput` 组件（`src/components/common/RangeInput.vue`），不手写两个 `InputNumber + ~`：
     ```vue
     <RangeInput v-model:min="input.NThickMin" v-model:max="input.NThickMax"
       :min-fraction-digits="1" :max-fraction-digits="2" show-buttons />
     ```
     交互与 DatePicker range 模式一致：单个只读输入框显示 `2 ~ 最大` / `最小 ~ 5` / `2 ~ 10`，点击弹出 Popover 双 InputNumber 编辑。支持透传 InputNumber 常用参数：`showButtons`、`mode`、`minFractionDigits`、`maxFractionDigits`、`min`、`max`、`step`、`locale`、`currency`、`prefix`、`suffix`、`useGrouping`、`readonly`、`invalid` 等。
   - **按钮布局**：≥3 个条件时，所有操作按钮（查询/添加/删除/保存等）集中在一行工具栏，不混入查询条件区；1-2 个条件时与条件同行；
   - **主子表布局**（主从表、Master-Detail）：
     - **左右主子表**：用 `Splitter` 水平分栏，左=主表、右=子表。**子表工具栏（添加/删除/保存）必须与主表列头同高**（均用 `h-8`），子表数据从主表列头高度之下开始，两侧列头水平对齐：
       ```
       [顶部工具栏 h-9：查询条件 + 主表操作按钮]
       ┌─主表标题 h-8──────┐ ┌─子表标题 h-8──[添加][删除][保存]─┐
       │ 主表列头           │ │ 子表列头                        │
       │ 主表数据           │ │ 子表数据                        │
       └───────────────────┘ └─────────────────────────────────┘
       ```
     - **上下主子表**：用 `Splitter` 垂直分栏（`layout="vertical"`），上=主表、下=子表。**子表工具栏与主表列头同高**（均 `h-8`），子表数据从主表列头之下开始：
       ```
       [顶部工具栏 h-9]
       ┌─主表标题 h-8──────────────────────────────┐
       │ 主表列头                                  │
       │ 主表数据                                  │
       ├───────────────────────────────────────────┤
       │ 子表标题 h-8──[添加][删除][保存]           │
       │ 子表列头                                  │
       │ 子表数据                                  │
       └───────────────────────────────────────────┘
       ```
     - 标题文字：`<span class="text-xs font-medium text-muted-foreground">`，位于各栏顶部 `h-8` 行内；
     - 子表操作按钮用 `text` 样式 + `h-3 w-3` 图标，与工具栏按钮一致；
   - **AG Grid 直角**：全局 `borderRadius: "0px"` + `hmx-ag-grid` 类已设 `border-radius: 0`，新页面务必挂 `class="hmx-ag-grid"`；
   - **分栏用 PrimeVue Splitter**：左右/多栏布局用 `Splitter` + `SplitterPanel`（`layout="horizontal"` 或 `layout="vertical"`），支持原生拖动，勿手写 mousemove 分割条。

### 9. AG Grid 列定义（colDefs）提取规则

#### 9.1 列定义来源（按优先级）

1. **Designer.cs 中的 `colXXX.FieldName` + `colXXX.Caption`**：如果 Designer.cs 里同时有 FieldName 和 Caption 赋值，直接使用 Caption 作为 `headerName`，FieldName 作为 `field`。
2. **实体类 `[LDisplay("中文")]` 属性**：如果 Designer.cs 没有 Caption，去 `rmes.service` 下对应的实体类（Entity/Dto）查找 `[LDisplay("xxx")]` 注解。原系统的 `DXGridColumnCaption.AutoSetGridColumnCaption()` 在运行时从实体属性的 `DisplayNameAttribute` 或 `DescriptionAttribute` 读取中文列头，`[LDisplay]` 是项目自定义的等效属性。
3. **UserControl 内嵌列定义**：部分窗体（如 FrmYl01、FrmJg01）的 GridView 列定义不在主窗体 Designer.cs 中，而在内嵌的 User Control（`UC*.Designer.cs`）里。提取时需先在主窗体 Designer.cs 中查找 `new UCXxx()` 引用，再到对应的 UC Designer.cs 中提取 FieldName/Caption。

#### 9.2 列定义提取脚本

用 Node 脚本从 Designer.cs 提取：
```javascript
// FieldName: colXXX.FieldName = "YYY"
// Caption:  colXXX.Caption = "YYY"（有则用，无则跳过）
// 可见性:  colXXX.VisibleIndex = N（有则按序排列）
// 隐藏列:  colXXX.Visible = false → colDefs 加 hide: true（列照样迁入）
// 宽度:    colXXX.Width = N
```

过滤规则：

- **列集与原窗体一模一样**：Designer.cs 的列全部带入（含 `Id`、`Creator`、`CreateTime`、`LastModifier`、`LastModifyTime`、`NStatus` 等系统字段，不做任何"字段类型层面"的增删）；`Visible = true` 按序显示，`Visible = false` 加 `hide: true` 同样迁入但初始隐藏（右键列面板仍可唤出）
- 按 `VisibleIndex` 排序，去重（同一 FieldName 只保留第一个）

#### 9.3 空 colDefs 处理

以下情况的窗体 colDefs 为空数组 `[]`（不需要列定义）：
- **纯按钮面板**：窗体只有工具栏按钮，没有 GridView（如 FrmTqmtd10 = 执行标准管理）
- **数据录入表单**：窗体是表单输入而非列表展示（如 FrmQL4000 = 检验结果录入）
- **列定义在代码中**：列在 code-behind 中动态创建，Designer.cs 和 UC 均无定义（如 FrmYll01Record）

这类页面保留空 `colDefs`，后续需要手动补充列定义。

#### 9.4 字段名→中文列头内联规则

**禁止使用共享映射文件**（如 `fieldLabelMap.ts`）。所有中文列头必须**直接内联**在每个 Vue 页面的 `colDefs` 中：
```typescript
// ✅ 正确：中文列头直接写在 colDefs 里
const colDefs = ref<ColDef[]>([
  { field: 'COrderNo', headerName: '订单号', width: 150 },
  { field: 'CSgCode', headerName: '钢种', width: 100 },
]);

// ❌ 错误：通过 import 引用共享映射
import { FIELD_LABEL_MAP } from '@/lib/fieldLabelMap';
// ...
headerName: FIELD_LABEL_MAP[field]
```

这样做的好处：每个页面自包含，不依赖外部映射文件，便于维护和调试。

#### 9.5 化学元素符号保持英文

钢种成分表中的列头（Si、Mn、Cr、Ni、Mo、V、Nb、Ti、Al、P、S、Cu 等）保持英文符号，不翻译为中文。

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

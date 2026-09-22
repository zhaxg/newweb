# 提取器能力边界（extract-screen.mjs）

它是**正则文本抓取**，不是 C#/WinForms 解析器。定位是「把 500~900 行 Designer + 几百行事件代码压成一页待核对清单」，**不是**布局还原器。

## 1. 列的可见性只有三种写法

全语料实测（398 个 Designer / 25191 个 `GridColumn`）里，**没有任何一处写 `Visible = false`**：

| 写法 | 数量 | 含义 | 脚本处理 |
|---|---|---|---|
| `Visible=true` + `VisibleIndex=n` | 14890 | 确定显示，n 是列序 | 进可见列 |
| 两者都不写 | 8824 | 从没排进表头（审计列、内部 id） | 进 `hide` |
| `Visible=true`、不写 `VisibleIndex` | 1477 | **歧义**：勾了可见但没排位 | 单列「待确认」，必须人工判 |

## 2. 已验证可靠（QM2100/FrmYl01 全画面核对通过：UCYl01 15 列→10 可见 5 隐藏、UCTqmyl02 10 列→2 可见 8 隐藏、UCIndexValueEditView 56 列→25 可见 28 隐藏，与 Designer 一一对应）

- 每个 `GridView` 的**列集**、`VisibleIndex` 列序、`Width`、`DisplayFormat`、绑定实体；`Columns.AddRange` 与单数 `Columns.Add` 两种写法都接得住（语料里 28 个窗体用单数，不接住整表会退化成声明序）；
- 按钮集合 + 容器归属 + `Visible`，以及 `ItemLinks.AddRange` 的条带顺序；
- `SplitContainerControl` 的方向与 `SplitterPosition`、`XtraTabControl` 的页签标题与内容控件；
- **输入区三件套**：`DataBindings.Add(new Binding(prop, source, field))` → `bind=EditValue→字段@绑定源`；`Properties.Items.AddRange` → `下拉[文本=枚举值 | …]`；`Properties.Mask.EditMask/MaskType` → `mask=… maskType=Numeric`。掩码/下拉还会顺 `列.ColumnEdit → 仓库项` 找一层（本语料里列自身从不写 Mask/Items，全挂在编辑控件上，这条只是兜底）；
- **条件区分组**：`LayoutControlItem` 不用 `Controls.Add` 装控件，靠 `.Control = xxx` 指过去，脚本按这层关系把输入控件归到 `▸ 标签` 下；
- **后端调用台账**（文件末尾、`--quiet` 时不出）：读同名 `Frm*.cs`（含 `--uc` 展开的每个 UC），列 `Svc<I*>.Proxy.Method` → 已推导的 `<svc>Api.<method>` + URL + 该 Api 在 `src/api/mes4ddh/*.swagger.ts` 里的生成状态（`已生成` / `需补(缺该方法)` / `需补(整个 Api 对象)`）、`GetTrackingList<T>()` → `TrackableList` 映射、`new Frm*/ShowDialog` → 二级弹窗清单。命名空间是去 `rmes.service` 里按文件名找到 `I<X>AppService.cs` 后读 `namespace` 行得到的，不是猜的。

## 3. 还原不了的（必须回读源码或看原程序截图）

| 盲区 | 后果 | 兜底 |
|---|---|---|
| 不解析 `Location`/`Size`/`Anchor` | 拿不到像素坐标。**这是有意的**：迁移只要布局结构对，坐标靠 `Splitter :size` 百分比 + flex 自适应重排，抄像素反而错（全站 rem + 用户三档缩放） | 分栏比例用 `SplitterPosition` ÷ 容器尺寸；其余按 `references/ui-rules.md` |
| `Dock` 只在容器归属里间接体现 | 纯 `Dock=Fill`/`Top` 的堆叠顺序不保证 | 对照原程序截图 |
| 属性正则只吃单行 `x.Prop = value;` 与三类已知多行写法 | 其它多行/子属性（`AppearanceOptions.*`、`FormatInfo`）被丢 | 需要格式串时直接搜字段名 |
| 实体解析依赖同文件的 `DataSource = typeof(X)` | 绑定源在别的 `.cs` 里时打印 `?`，列头退回全局字典（会串味） | 手工按实体核 `[LDisplay]` |
| 分组表头（BandedGridView 的 band）、列脚合计、运行时灌入的下拉选项 | 不输出（选项写在 `.cs` 里的 `Items.Add`，Designer 抓取不到） | 回读同名 `.cs`，或按枚举定义补 |
| 台账只认 `Svc<I*>.Proxy.X()` 与 `GetTrackingList<T>()` 两种写法 | 别的取服务方式（DI、帮助类包装、基类方法）不会被列出 | 需要时 `grep -n "Svc<\|Proxy\." Frm<NAME>.cs` 复核；页面查询回填/保存验过才算全 |

## 4. 提取后必跑自检

**丢数据的方式是静默的**——脚本不会报错，只会给出一份看着完整的清单。每次提取后跑一条自检，看有没有列被吞掉：

```bash
D=< Designer 路径 >; printf "声明=%s 摘要可见+hide+待确认=%s\n" \
  "$(grep -cE 'GridColumn \w+;' $D)" \
  "$(node .qoder/skills/winforms-screen-migration/scripts/extract-screen.mjs $D --quiet | grep -oE '可见 [0-9]+ 列 / 待确认 [0-9]+ 列 / 其余 [0-9]+ 列' | awk -F'[ /]+' '{s+=$2+$5+$8} END{print s}')"
```

两个数不等就是有列没进摘要（多表共用声明、或解析没接住的写法）。已验：`UCIndexValueEditView` 56=56、`UCYl01` 15=15、`FrmHR1000` 42=42。

注意：**主窗体 `声明=0` 不一定是错**——列定义常整批住在内嵌 `UC*.Designer.cs` 里（FrmYl01、FrmJg01），这时改对 UC 文件跑自检，或用 `--uc` 看递归后的各表小计。

一句话：**列集/列序/按钮/分栏/调用台账可以照抄摘要；几何与分组必须自己回读**，且第 8 步的截图核对是唯一能否掉摘要结论的证据。

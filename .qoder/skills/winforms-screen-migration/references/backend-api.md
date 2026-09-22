# 后端接入：C# 服务调用 → web API，变更跟踪与保存

一次完整迁移的"逻辑"部分就是本文件。目标：把 `Frm<NAME>.cs` 事件里每个后端调用与每处增删改，逐条等价搬到 Vue 页面。**不存在"只迁画面、处理器留空"这一说**——真接不了的才留 `toast("…待接入", 2000, "warn")`，且必须写进页面来源注释的「待接入」。

## 1. 服务调用命名映射

C# 原写法：

```csharp
var list = await Svc<IHR1000AppService>.Proxy.QueryList(textEdit1.Text);
```

三段拼出 URL，规则机械可推：

| 段 | 取法 | 例 |
|---|---|---|
| 命名空间 | `I*AppService` 声明处的 `namespace`，**首字母小写**（其余原样） | `DDH.Service.SHR.Services` → `dDH.Service.SHR.Services` |
| 服务名 | 接口名去 `I` 前缀、去 `AppService` 后缀，**首字母小写** | `IHR1000AppService` → `HR1000` → `hR1000` |
| 方法名 | **首字母小写** | `QueryList` → `queryList` |

→ `/dDH.Service.SHR.Services/hR1000/queryList`，前端接口对象 `hR1000Api`、方法 `queryList`。

命名空间**不要猜**，去源码里读声明行：

```bash
grep -rn "namespace" temp/ddh_rmes/rmes.service/DDH.Service/*/Services/IHR1000AppService.cs
```

接口散落在多个工程根时（`rmes.service/DDH.Service/`、`DDH.Service.<模块>.*/`、`rmes.core/`），按类名全查：

```bash
grep -rln "interface IHR1000AppService" temp/ddh_rmes
```

## 2. 先查已生成的，再考虑补

这批 URL 已由 swagger 生成在 `src/api/mes4ddh/<域>.swagger.ts`（shr 33 / sqm 23 / smp 15 / syd 9 / lims 8 / ddh 4 个 Api 对象，覆盖 92 个服务段；C# 侧共 261 个 `I*AppService`，其余尚未生成）。实测 92 个已生成服务段里 88 个符合第 1 节规则（`TI1000`→`tI1000`、`DM1000`→`dM1000`、`QL3000`→`qL3000`），所以**先 grep、命中就用**：

```bash
grep -n "hR1000Api" src/api/mes4ddh/shr.swagger.ts
```

- 命中 → `import { hR1000Api, type Thr1000 } from "@/api/mes4ddh/shr.swagger";` 直接用；**不要**再手写 URL、不要另立 `request.ts`；
- 整个 Api 对象不存在 → 按第 1 节规则把方法补进**对应域的 swagger 文件**（同一域单文件维护：枚举 + 类型 + 请求），照已生成方法的形状写；
- 命不中且规则也推不出（历史遗留命名，如 `quYang` / `storageRecord`）→ 以已生成的为准，回读 C# 侧真实 `[ServiceName]`/类名，别自造。

入参形状照抄已生成的写法，不要自己发明：`method` 恒为 `post`；**标量参数走 `params`，Dto/对象走 `data`**。

```ts
// C#: Proxy.QueryList(string key)
queryList(key?: string) {
  return requestClient.request<Thr1000[]>("/dDH.Service.SHR.Services/hR1000/queryList", { method: "post", params: { key } });
}
// C#: Proxy.SaveChange(SaveChangesInputDto dto)
saveChange(data?: Thr1000SaveChangesData) {
  return requestClient.request<any>("/dDH.Service.SHR.Services/hR1000/saveChange", { method: "post", data });
}
```

调用侧：

```ts
const rows = (await hR1000Api.queryList(keyword.value.trim() || undefined)) ?? [];
```

catch 里不重复弹错——`requestClient` 拦截层已 toast（历史页里的 `catch { /* 拦截层已 toast */ }` 就是这个含义）。

## 3. 变更跟踪：`GetTrackingList` → `TrackableList`

C# 保存：

```csharp
var list = thr1000BindingSource.GetTrackingList<Thr1000>().ToSaveChangesData();
await Svc<IHR1000AppService>.Proxy.SaveChange(list);
```

web 侧由 `TrackableList<T>`（`src/api/common/trackableList.ts`）接管 BindingSource 的跟踪职责：

| C# WinForms | web |
|---|---|
| `bindingSource.DataSource = list` | `trackList.value = new TrackableList<Thr1000>(rows)` |
| 网格新增行 | `trackList.value.push(draft)` + `applyTransaction({ add: [row] })` |
| 网格删除行 | `trackList.value.remove(r => r.id === id)` + `applyTransaction({ remove: [...] })` |
| `GetTrackingList<T>()` | `trackList.value` 本身（`extends Array<T>`，可直接当 row-data） |
| `.ToSaveChangesData()` | `trackList.value.SaveChangesData` → `{ addedItems, changedItems, deletedItems }`（按 `__trackId` 与快照 diff） |
| `Proxy.SaveChange(list)` | `crudAppService.SaveList(trackList.value, "Thr1000")` |

`crudAppService.SaveList`（`src/api/common/crudAppService.ts`）已把 `SaveChangesData` 用 hprose `Formatter.serialize` → base64 → `crudApi.saveChangesV2({ dataTypeName, batchDataBytesBase64String })`，再把后端回写的 id/审计字段 `assign` 回原行并 `reset()`。页面只负责填表与调用。单条录入（无网格跟踪）用 `crudAppService.SaveSingleData(obj, "实体名")`。

**全套模板 = `src/pages/admin/role/index.vue`**（shallowRef + 查询回填 + 行内编辑 + 增删 + 保存 + 删除确认 Dialog），照抄结构，别改写法：

```ts
import { crudAppService } from "@/api/common/crudAppService";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";

const trackList = shallowRef<TrackableList<Thr1000>>(new TrackableList<Thr1000>());

async function query() {
  const rows = (await hR1000Api.queryList(keyword.value.trim() || undefined)) ?? [];
  trackList.value = new TrackableList<Thr1000>(rows);   // 查询：整体重建快照
}
function onAdd() {
  trackList.value.push({ id: NextStrId(), /* 默认值照 C# 新增行 */ } as Thr1000);
  const stored = trackList.value[trackList.value.length - 1] as Thr1000;  // 取回被跟踪的代理项
  gridApi.value?.applyTransaction({ add: [stored] });
}
function confirmDelete() {
  trackList.value.remove((r) => r.id === target.id);
  gridApi.value?.applyTransaction({ remove: [target] });
}
function onSave() {
  crudAppService.SaveList(trackList.value, "Thr1000")
    .then(() => { gridApi.value?.refreshCells({ force: true }); toast("保存成功！", 2000, "success"); });
}
```

三条硬性约定（踩过的坑）：

1. `trackList` 用 **`shallowRef`**、`:row-data="trackList"` 直接绑；改数据只走 `push` / `remove` / 下标赋值 / 单元格编辑，**不要整体换数组引用**（换了跟踪就断，`SaveChangesData` 会算成全删全加）。只有"查询重新拉数据"才整体 `new TrackableList(rows)`；
2. 新增行 `push` 之后必须**取回数组里的跟踪项**再交给网格；直接把 `draft` 塞进 `applyTransaction`，网格里那行不是被跟踪的对象，保存时丢失；
3. 行内编辑列写 `editable: true`，`@cell-value-changed` 里 `refreshCells`（刷新状态列这类派生值），保存后再 `refreshCells({ force: true })`。

多表画面：一个 `GridView` 一个 `TrackableList`，与 C# 的 bindingSource 一一对应；主表选中变化再拉子表数据（对应 `CurrentChanged` / `bindingSource.Filter`），各表分别 `SaveList`。

## 4. 事件里其余逻辑

提取摘要给的是"有哪些调用"，具体计算要回读 `Frm<NAME>.cs`：

- `MessageBox.Show` / `ShowYesNo` → `toast(...)` 或受控 `Dialog` 确认（删除前确认沿用原提示文案）；
- `MsgBox`、`XtraMessageBox` 同理；原代码里的中文提示**逐字照抄**，不要润色；
- 必填/格式校验：Designer 的 `mask=`/`DataBindings` 给出字段与类型，按 C# 校验分支补前端检查；
- 窗体 `ShowDialog()` 的二级弹窗：默认只留占位（README/skill 的批量提效条），经用户确认再连带迁移；
- 打印、导出、L2 接口等后端未提供能力：留占位 + 记入「待接入」。

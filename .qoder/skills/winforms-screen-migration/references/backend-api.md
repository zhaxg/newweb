# 后端接入：C# 服务调用 → web API，变更跟踪与保存

一次完整迁移的"逻辑"部分就是本文件。目标：把 `Frm<NAME>.cs` 事件里每个后端调用与每处增删改，逐条等价搬到 Vue 页面。**不存在"只迁画面、处理器留空"这一说**——真接不了的才留 `toast("…待接入", 2000, "warn")`，且必须写进页面来源注释的「待接入」。

**总原则**：不同窗体、甚至同一窗体的不同按钮，调用的后端接口都可能不同；以同名 `.cs` 事件里的 `Svc<I*>.Proxy.Method` 为准，再在 `src/api/mes4ddh/<域>.swagger.ts` 里按规则找到已生成方法。查询 / 新增 / 修改 / 保存 / 删除是**多条独立接口**，没有「所有写操作都走某一个通用 URL」的模板。

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

**同页多接口**：一次「查询 + 行内编辑 + 保存」可能对应 2~3 个不同 `Proxy` 方法（例如 `queryList` + `saveChange` + `deleteXxx`）。以提取器台账 / `.cs` 逐按钮核对，**先 grep swagger 里有没有**，有则直接 import；没有再按 §1 补进域文件。

## 3. 变更跟踪与保存：听 C# 的，不套死一个 URL

### 3.1 何时用 `TrackableList`

C# 网格走 BindingSource 跟踪时：

```csharp
var list = thr1000BindingSource.GetTrackingList<Thr1000>().ToSaveChangesData();
await Svc<IHR1000AppService>.Proxy.SaveChange(list);   // 或其它 Proxy 方法，以事件代码为准
```

| C# WinForms | web |
|---|---|
| `bindingSource.DataSource = list` | `trackList.value = new TrackableList<Thr1000>(rows)` |
| 网格新增行 | `trackList.value.push(draft)` + `applyTransaction({ add: [row] })` |
| 网格删除行 | `trackList.value.remove(r => r.id === id)` + `applyTransaction({ remove: [...] })` |
| `GetTrackingList<T>()` | `trackList.value` 本身（`extends Array<T>`，可直接当 row-data） |
| `.ToSaveChangesData()` | `trackList.value.SaveChangesData` → `{ addedItems, changedItems, deletedItems }`（按 `__trackId` 与快照 diff） |
| 保存方法 | **原样映射**：`Proxy.<Method>` → swagger 里同名 `<svc>Api.<method>` |

没有 tracking、事件里直接 `Proxy.Add/Update/Delete/DoSomething(dto)` 的，**不要**强行包一层 `TrackableList` / `SaveList`，按 §2 调那个方法即可。

### 3.2 保存方法怎么选（示例 ≠ 全集）

| C# 事件里的写法 | web 调用 |
|---|---|
| `GetTrackingList` + `ToSaveChangesData` + `Proxy.SaveChange(...)`，且提取器/台账标成通用 tracking 通路 | `crudAppService.SaveList(trackList.value, "<实体名>")`（内部 → `crud/saveChangesV2`）——**仅此通路** |
| 同上，但 `Proxy` 指到业务方法（如 `hR1000.saveChange`、`e1000.save`） | 按台账调 `hR1000Api.saveChange(...)` / `e1000Api.save(...)`，入参形状抄 swagger |
| `Proxy.AddXxx` / `UpdateXxx` / `DeleteXxx` / `QueryXxx` 等任意业务方法 | `<svc>Api.<method>(...)`，URL 与 swagger 一致 |
| 无网格、单条 DTO 提交且台账明确标了通用单条通路 | `crudAppService.SaveSingleData(obj, "<实体名>")` |

`crudAppService.SaveList`（`src/api/common/crudAppService.ts`）在**适用时**才用：它把 `SaveChangesData` 经 hprose → base64 → `crudApi.saveChangesV2({ dataTypeName, batchDataBytesBase64String })`，再把回写字段 `assign` 回原行。**`crud/saveChangesV2` 只是示例通路之一，不是所有保存的归宿。**

**网格全套结构模板 = `src/pages/admin/role/index.vue`**（shallowRef + 查询回填 + 行内编辑 + 增删 + 确认 Dialog）；保存一行改成台账对应的那个方法：

```ts
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";

const trackList = shallowRef<TrackableList<Thr1000>>(new TrackableList<Thr1000>());

async function query() {
  const rows = (await hR1000Api.queryList(keyword.value.trim() || undefined)) ?? [];
  trackList.value = new TrackableList<Thr1000>(rows);   // 查询：整体重建快照
}
function onAdd() {
  trackList.value.push({ id: NextStrId(), /* 默认值照 C# 新增行 */ } as Thr1000);
  const stored = trackList.value[trackList.value.length - 1] as Thr1000;
  gridApi.value?.applyTransaction({ add: [stored] });
}
function confirmDelete() {
  trackList.value.remove((r) => r.id === target.id);
  gridApi.value?.applyTransaction({ remove: [target] });
}
async function onSave() {
  // ↓ 只有台账是通用 tracking 通路时才用 SaveList；否则换成 hR1000Api.saveChange(trackList.value.SaveChangesData) 等
  await crudAppService.SaveList(trackList.value, "Thr1000");
  gridApi.value?.refreshCells({ force: true });
  toast("保存成功！", 2000, "success");
}
```

三条硬性约定（踩过的坑）：

1. `trackList` 用 **`shallowRef`**、`:row-data="trackList"` 直接绑；改数据只走 `push` / `remove` / 下标赋值 / 单元格编辑，**不要整体换数组引用**（换了跟踪就断，`SaveChangesData` 会算成全删全加）。只有"查询重新拉数据"才整体 `new TrackableList(rows)`；
2. 新增行 `push` 之后必须**取回数组里的跟踪项**再交给网格；直接把 `draft` 塞进 `applyTransaction`，网格里那行不是被跟踪的对象，保存时丢失；
3. 行内编辑列写 `editable: true`、`@cell-value-changed` 里 `refreshCells`；保存后再 `refreshCells({ force: true })`。

多表画面：一个 `GridView` 一个 `TrackableList`，与 C# 的 bindingSource 一一对应；主表选中变化再拉子表数据（对应 `CurrentChanged` / `bindingSource.Filter`）；**各表保存方法仍各自听对应 `Proxy` 调用**。

## 4. 事件里其余逻辑

提取摘要给的是"有哪些调用"，具体计算要回读 `Frm<NAME>.cs`：

- `MessageBox.Show` / `ShowYesNo` → `toast(...)` 或受控 `Dialog` 确认（删除前确认沿用原提示文案）；
- `MsgBox`、`XtraMessageBox` 同理；原代码里的中文提示**逐字照抄**，不要润色；
- 必填/格式校验：Designer 的 `mask=`/`DataBindings` 给出字段与类型，按 C# 校验分支补前端检查；
- 窗体 `ShowDialog()` 的二级弹窗：默认只留占位（README/skill 的批量提效条），经用户确认再连带迁移；
- 打印、导出、L2 接口等后端未提供能力：留占位 + 记入「待接入」。

## 5. Mock 后端：只登记占位，禁止实现业务

`VITE_USE_MOCK` 默认开时，未注册 URL 会 toast `mock 未注册的端点: ...`。为免用户点开就 404，**只在路由表加占位**，不做真实逻辑。**不要**为此跑浏览器/截图验证（见 SKILL 硬规则 8）。

### 5.1 硬约束

| 做 | 不做 |
|---|---|
| 键 = swagger 路径（去请求层 `/api` 前缀），`post /dDH.Service.../xxx/yyy` | 手拼另一套 URL |
| 查询类：`ok(config, demoRows)`，**1~5 条**随机演示行 | 读 C# `I*AppService` 实现去还原过滤/分页 |
| 新增/修改/保存/删除/发送等：`ok(config, null)` 或空串，表示成功 | localStorage 持久化、按 `dataTypeName` 分表、diff 落库 |
| 与 swagger 返回类型形状大致兼容（数组 / 对象 / string） | 照 `src/mock/lims.ts` / `admin/users.ts` 写完整域 mock |
| 一批页面可汇总后一次登记 | 在 `index.vue` 里塞页内 `mockRows` 绕开接口 |

已存在的 **admin / 登录菜单 / lims 完整 mock 不动**；迁移只补缺的业务占位。

### 5.2 落点

- 新域或已有的 MES 业务占位：在 `src/mock/` 下按域建/扩文件（如 `src/mock/shr.ts`），导出 `RouteMap`；
- 在 `src/mock/mockAdapter.ts` 的 `routes` 里 `...shrRoutes` 合并；
- 演示行生成可复用小函数，字段按 swagger 类型给合理假值（id、单号、日期、状态），**不要**为了编数据去翻后端实体校验。

### 5.3 模板（直接抄形状）

```ts
import { ok, type RouteMap } from "./admin/core";

/** 占位：≤5 条随机演示行；写操作只回成功 —— 禁止实现业务 */
function demoRows<T>(n: number, make: (i: number) => T): T[] {
  const count = Math.min(5, Math.max(1, n));
  return Array.from({ length: count }, (_, i) => make(i));
}

const BASE = "/dDH.Service.SHR.Services/hR1000";

export const shrRoutes: RouteMap = {
  // 查询 → 3 条演示数据
  [`post ${BASE}/queryList`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `DEMO-${i + 1}`,
        // 其余字段按该 Api 的返回类型给少量合理值即可
        createTime: "2026-01-01 00:00",
      })),
    ),

  // 新增 / 修改 / 保存 / 删除 → 只说成功，不落库
  [`post ${BASE}/saveChange`]: (config) => ok(config, null),
  [`post ${BASE}/deleteXxx`]: (config) => ok(config, null),
};
```

有参查询**不必**实现过滤：固定回几条即可；若 swagger 返回类型是 `string`（如部分单号生成），`ok(config, "DEMO001")`。

### 5.4 何时可以不写 mock

- 用户明确走真后端（`VITE_USE_MOCK=false`）验收；或
- 仅静态校验（`vue-tsc` + `audit:ui`）收尾、用户暂不点开页面。

默认仍建议占位，避免用户打开时看到 `mock 未注册的端点`。**占位写完即结束**，不发起无头浏览器点选。

import { ref } from "vue";

import { equipmentApi, lineApi, sparePartApi } from "@/api/equipment";

/**
 * 外键 → 名称的前端翻译表。
 *
 * 为什么页面要有这张表：列表端点回的是**外键本身**（`StockTxn.spId`、`LifeRecord.mountedEqId`），
 * 这是真实后端的常态（库存流水表不会冗余备件名）。但客户看流水页时读的是「高线精轧轧辊 出库 2 支」，
 * 不是「SP-0001 出库 2 支」——所以翻译要在展示层做一次。
 *
 * 为什么不做成 mock 侧的字段冗余：那会让 mock 变成「按页面长相定制的假数据」，
 * 而这套 mock 的契约是给真实后端参照的（`src/api/equipment/types.ts` 文件头）。
 *
 * 为什么是**模块级缓存 + 单飞**：备件 24 条、设备几十条、产线 6 条，整个设备域十几个页面都要读这几张表；
 * 每页各拉一次就是 ten+ 次重复请求。`GET /eam/sparePart/list`、`/eam/equipment/list`、`/eam/line/list`
 * 就是为这件事存在的端点（`listAll`，不分页）。
 *
 * ⚠️ 名称到位后页面要**重查一次列表**（`ListPage` 的 `reload`）：AG Grid 的 `valueFormatter`
 * 只在单元格渲染时跑，缓存表是后到的，不重查就会有一屏 id。
 */

const partNames = ref<Record<string, string>>({});
const eqNames = ref<Record<string, string>>({});
const lineNames = ref<Record<string, string>>({});

let loading: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!loading) {
    loading = Promise.all([sparePartApi.list(), equipmentApi.list(), lineApi.list()])
      .then(([parts, equips, lines]) => {
        for (const p of parts) partNames.value[p.id] = p.name;
        for (const e of equips) eqNames.value[e.id] = `${e.name}（${e.model}）`;
        for (const l of lines) lineNames.value[l.id] = l.name;
      })
      .catch(() => {
        // 拉不到就保持空表：列会退回显示 id，比整页报错强；下次再进页面会重新拉
        loading = null;
      });
  }
  return loading;
}

export function useNameMaps() {
  const ready = ref(false);
  void ensureLoaded().then(() => {
    ready.value = true;
  });
  return {
    ready,
    /** 备件名（找不到回 id，不空着——空单元格看着像数据丢了） */
    partName: (id: unknown) => partNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /** 设备名带型号（表格里一列要能同时认出「哪台」和「什么型号」） */
    eqName: (id: unknown) => eqNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /** 产线名（`Equipment.lineId` 也是外键，台账页要显示「1780热连轧」而不是 LN-BR01） */
    lineName: (id: unknown) => lineNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /**
     * 原始映射表，给**详情弹窗的 `map`** 用：`DetailSection.fields[].map` 要的是
     * 「编码 → 文案」一张表，不是函数。这里返回的是同一份缓存引用（不复制），
     * 所以页面把 spec 写成 computed 时，名称到货会自动带着详情一起刷新。
     */
    partMap: partNames,
    eqMap: eqNames,
    lineMap: lineNames,
  };
}

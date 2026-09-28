import { ref } from "vue";

import { materialApi, orgApi, personApi, siloApi, unitApi } from "@/api/mes4tq";

/**
 * 外键 → 名称的前端翻译表（铁区MES 域自带一份）。
 *
 * 为什么页面要有这张表：列表端点回的是**外键本身**（`ProductionInput.unitId`、
 * `BinChangeRecord.matrlId`），这是真实后端的常态（投料实绩表不会冗余机组名和品名）。
 * 但客户看投料实绩时读的是「1#高炉 烧结矿 850t」，不是「GL01-01 M-0101 850」——
 * 所以翻译要在展示层做一次。
 *
 * 为什么不做成 mock 侧的字段冗余：那会让 mock 变成「按页面长相定制的假数据」，
 * 而这套 mock 的契约是给真实后端参照的（`src/api/mes4tq/types.ts` 文件头）。
 *
 * 为什么是**模块级缓存 + 单飞**：机组二十来条、物料几十条、料仓上百条，
 * 本域五十多个列表页几乎每个都要读其中两三张；每页各拉一次就是重复请求。
 * `GET /tqmes/unit/list` 这类不分页取全量的端点就是为这件事存在的。
 *
 * **不翻译的两类值**：
 * - 计量点/采集点 `CP-GL01-001` 这类 id 直接显示即可——行里本来就有 `pointName` 列。
 * - 批次号、铁次号、单号是**业务主键**，客户就是拿它跟纸质单据对的，翻成中文反而对不上。
 *
 * ⚠️ 名称到位后页面要**重查一次列表**（`ListPage` 的 `reload`）：AG Grid 的 `valueFormatter`
 * 只在单元格渲染时跑，缓存表是后到的，不重查就会有一屏 id。
 */
const unitNames = ref<Record<string, string>>({});
const materialNames = ref<Record<string, string>>({});
const siloNames = ref<Record<string, string>>({});
const workshopNames = ref<Record<string, string>>({});
const personNames = ref<Record<string, string>>({});

let loading: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!loading) {
    loading = Promise.all([unitApi.list(), materialApi.list(), siloApi.list(), orgApi.list(), personApi.list()])
      .then(([units, materials, silos, orgs, people]) => {
        for (const u of units) unitNames.value[u.id] = u.name;
        /* 物料表里 `name` 是品名、`code` 是料号；两个键都进表，因为不同页面拿到的是不同的那个 */
        for (const m of materials) {
          materialNames.value[m.id] = m.name;
          if (m.code) materialNames.value[m.code] = m.name;
        }
        for (const s of silos) siloNames.value[s.binCode] = s.binName || s.binCode;
        /* 车间与工厂同表（`ProductionUnit` 的祖先链），一个 map 就够——id 全局不重 */
        for (const o of orgs) workshopNames.value[o.id] = o.name;
        for (const p of people) personNames.value[p.id] = p.name;
      })
      .catch(() => {
        // 拉不到就保持空表：列会退回显示 id/编码，比整页报错强；下次再进页面会重新拉
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
    /** 机组名（`GL01-01` → 「1#高炉」；找不到回 id，不空着——空单元格看着像数据丢了） */
    unitName: (id: unknown) => unitNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /** 物料品名（`M-0101` → 「混匀矿」；找不到回编码本身，物料字典缺行时表仍可读） */
    materialName: (id: unknown) => materialNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /** 料仓名（`GL01-01-C03` → 「3#矿仓」） */
    siloName: (id: unknown) => siloNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /** 车间名（`CJ03` → 「炼铁车间」） */
    workshopName: (id: unknown) => workshopNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /** 人名（`U-05` → 「孙工」）——取样人/判定人/操作人三处共用同一批人 */
    personName: (id: unknown) => personNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /**
     * 原始映射表，给**详情弹窗的 `map`** 用：`DetailSection.fields[].map` 要的是
     * 「编码 → 文案」一张表，不是函数。这里返回的是同一份缓存引用（不复制），
     * 所以页面把 spec 写成 computed 时，名称到货会自动带着详情一起刷新。
     */
    unitMap: unitNames,
    materialMap: materialNames,
    siloMap: siloNames,
    workshopMap: workshopNames,
    personMap: personNames,
  };
}

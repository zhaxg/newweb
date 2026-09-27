import { ref } from "vue";

import { channelApi, mediumApi, unitApi } from "@/api/energy";

/**
 * 外键 → 名称的前端翻译表（能源域自带一份）。
 *
 * 为什么页面要有这张表：列表端点回的是**外键本身**（`Quota.unitId`、`MeterPoint.mediaCode`），
 * 这是真实后端的常态（定额表不会冗余单元名）。但客户看定额页时读的是「7#高炉 高炉煤气 购入」，
 * 不是「EU-0301 BFG 购入」——所以翻译要在展示层做一次。
 *
 * 为什么不做成 mock 侧的字段冗余：那会让 mock 变成「按页面长相定制的假数据」，
 * 而这套 mock 的契约是给真实后端参照的（`src/api/energy/types.ts` 文件头）。
 *
 * 为什么是**模块级缓存 + 单飞**：用能单元几十条、介质十四行，能源域十几个页面都要读这两张表；
 * 每页各拉一次就是重复请求。`GET /ems/unit/list`、`/ems/medium/list` 就是为这件事存在的端点
 * （不分页取全量）。
 *
 * **不翻译的一类值**：计量点 `MP-00001` 这类 id 直接显示即可——行里本来就有 `name` 列，
 * id 列只是主键，再拉一张几百行的测点表进缓存是给浏览器添堵。
 *
 * ⚠️ 名称到位后页面要**重查一次列表**（`ListPage` 的 `reload`）：AG Grid 的 `valueFormatter`
 * 只在单元格渲染时跑，缓存表是后到的，不重查就会有一屏 id。
 */

const unitNames = ref<Record<string, string>>({});
const mediumNames = ref<Record<string, string>>({});
const channelNames = ref<Record<string, string>>({});

let loading: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!loading) {
    loading = Promise.all([unitApi.list(), mediumApi.list(), channelApi.list()])
      .then(([units, media, channels]) => {
        for (const u of units) unitNames.value[u.id] = u.name;
        for (const m of media) mediumNames.value[m.code] = m.name;
        /* 通道 → 站所名：EC0001 的「采集通道」列和 EC0002 的影响面文案都读它。
           十几条通道，缓存成本可以忽略，而 EC0001 显示 `CH-003` 是客户一定看不懂的一列。 */
        for (const c of channels) channelNames.value[c.id] = c.stationName;
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
    /** 用能单元名（找不到回 id，不空着——空单元格看着像数据丢了） */
    unitName: (id: unknown) => unitNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /** 介质名（`BFG` → 高炉煤气；找不到回编码本身，介质字典缺行时表仍可读） */
    mediumName: (code: unknown) => mediumNames.value[String(code ?? "")] ?? String(code ?? "—"),
    /** 采集通道 → 无人值守站所名（`CH-003` → 「高炉鼓风站」） */
    channelName: (id: unknown) => channelNames.value[String(id ?? "")] ?? String(id ?? "—"),
    /**
     * 原始映射表，给**详情弹窗的 `map`** 用：`DetailSection.fields[].map` 要的是
     * 「编码 → 文案」一张表，不是函数。这里返回的是同一份缓存引用（不复制），
     * 所以页面把 spec 写成 computed 时，名称到货会自动带着详情一起刷新。
     */
    unitMap: unitNames,
    mediumMap: mediumNames,
    channelMap: channelNames,
  };
}

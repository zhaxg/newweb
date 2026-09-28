<script setup lang="ts">
/** 对应 AM0001 采集点位配置（模块三 状态监测 · 附录 B5 版式 L1）
 *  接口：pointApi.page（POST /eam/point/listPage）/ save（/point/save，有位号即改）
 *        / remove（/point/remove）+ exportRows("point")
 *  演示要点：**原始值全部由现场采集服务写进 InfluxDB，这一页只登记「按哪个位号取值」**，
 *        所以新增表单就是采集服务真正要看的三栏：指标编码、指标名称、二级采集位号 tagId。
 *        三级 tagId = 二级位号 + "." + 指标编码，它才是库里那条序列的名字；
 *        位号 TagID 是这套标签之上的业务主键（报警、阈值、曲线全挂它），留空自动分配、编辑不改。
 *        「监测指标」下拉已经拿掉了：客户现场的量纲远不止那七个词，曾经硬编码成五个候选，
 *        新增一个「闸瓦间隙位移」根本配不出来。现在**指标名称就是那个点的名字**，
 *        报表分组/阈值默认倍率/雷达维度要的类别由 mock 从名称与编码的关键词认出来，
 *        认不出来就退回人填的量纲与类型，绝不拿「振动」的惯例去套一个压力点。
 *        采集协议与通讯地址同理退场（数已在库里，寻址就是 tagId 本身），协议固定显示 InfluxDB；
 *        归属设备是下拉而不是输入框（写错编码的点在监测页是孤儿）；
 *        「当前原始值」与「通讯状态」由取值端每拍写回，本页只读展示、不当输入项。
 *  已知偏差：二级位号只填部件短码（如 `MOTOR`）时 mock 会自动补全成 `<设备编码>.MOTOR`，
 *        真实系统要求填全路径。
 *  待接入：无。 */
import { computed, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { exportRows, pointApi } from "@/api/equipment";
import type { PointCommState, PointDataType } from "@/api/equipment/types";
import { dashFmt, numFmt, tagRenderer, unitFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const DATA_TYPES: readonly PointDataType[] = ["Float", "Int", "Bool"];
const COMM_STATES: readonly PointCommState[] = ["在线", "离线", "超时"];

const { eqName, eqMap, ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/** 名称表后到时重查一次：设备列是 valueFormatter 翻译的，不重查就是一屏 EQ-012 */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

const spec = computed<ListPageSpec>(() => {
  const eqValueMap = Object.fromEntries(Object.entries(eqMap.value).map(([id, name]) => [name, id]));
  return {
    code: "AM0001",
    queryLabelWidth: "w-24",
    query: [
      { key: "keyword", label: "位号 TagID", kind: "input", placeholder: "如 PT-SJFJ01-01" },
      {
        key: "eqId",
        label: "归属设备",
        kind: "select",
        options: Object.values(eqMap.value),
        valueMap: eqValueMap,
        placeholder: "全部设备",
      },
      { key: "commState", label: "通讯状态", kind: "select", options: [...COMM_STATES], placeholder: "全部状态" },
    ],
    /* 列序就是取值服务读这一行的顺序：先定位（位号→设备→二级位号→指标编码→名称），再读法（频率/类型/单位），最后现状（值/通讯） */
    columns: [
      { field: "id", headerName: "位号 TagID", width: 128 },
      { field: "eqId", headerName: "归属设备", minWidth: 170, valueFormatter: (p) => eqName(p.value) },
      { field: "tag2Id", headerName: "二级采集位号", minWidth: 180, flex: 1, valueFormatter: dashFmt },
      { field: "metricCode", headerName: "指标编码", width: 116, valueFormatter: dashFmt },
      { field: "name", headerName: "指标名称", minWidth: 160, valueFormatter: dashFmt },
      { field: "sampleMs", headerName: "采集频率", width: 96, valueFormatter: unitFmt(" ms") },
      { field: "dataType", headerName: "原始数据类型", width: 96, valueFormatter: dashFmt },
      { field: "unit", headerName: "原始单位", width: 84, valueFormatter: dashFmt },
      { field: "value", headerName: "当前原始值", width: 104, valueFormatter: numFmt(1) },
      { field: "commState", headerName: "通讯状态", width: 92, sortable: false, cellRenderer: tagRenderer() },
    ],
    actions: [
      { label: "详情", kind: "detail" },
      { label: "编辑", kind: "edit" },
      { label: "删除", kind: "delete" },
    ],
    toolbar: {
      add: true,
      acts: [{ label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("point", f) }],
    },
    detail: {
      sections: [
        {
          title: "点位标识",
          fields: [
            { label: "位号 TagID", from: "id" },
            { label: "归属设备", from: "eqId", map: eqMap.value },
            { label: "二级采集位号", from: "tag2Id", suffix: "（设备 + 部件/测量部位）" },
            { label: "部件/部位", from: "partName" },
            { label: "指标编码", from: "metricCode" },
            { label: "指标名称", from: "name" },
            { label: "三级 tagId", from: "tag3Id", suffix: "（二级位号 + 指标编码，库里唯一点位）" },
          ],
        },
        {
          title: "取值与解码",
          fields: [
            { label: "数据来源", from: "protocol", suffix: "（原始值由现场采集服务写入，本页不配协议与通讯地址）" },
            { label: "采集频率", from: "sampleMs", suffix: " ms（轮询或订阅节拍）" },
            { label: "原始数据类型", from: "dataType", suffix: "（按它解码，配错就是数量级灾难）" },
            { label: "原始单位", from: "unit" },
            { label: "当前原始值", from: "value", suffix: " （实时值，落在时序库/Redis）" },
            { label: "通讯状态", from: "commState", suffix: "（在线 / 离线 / 超时）" },
            { label: "指标类别", from: "metric", suffix: "（从指标名称派生，报表分组用）" },
            { label: "measurement", from: "measurement" },
            { label: "field", from: "fieldKey" },
            { label: "保留策略", from: "retention", suffix: "（高频短留、低频长留）" },
            { label: "采集网关", from: "gwId" },
          ],
        },
      ],
    },
    edit: {
      title: "采集点位",
      fields: [
        {
          key: "eqId",
          label: "归属设备",
          kind: "select",
          options: Object.values(eqMap.value),
          valueMap: eqValueMap,
          placeholder: "选择设备",
          full: true,
        },
        {
          key: "tagId",
          label: "位号 TagID",
          kind: "input",
          placeholder: "留空自动分配（PT-设备短码-序号），编辑时不改位号",
        },
        {
          key: "tag2Id",
          label: "二级采集位号",
          kind: "input",
          placeholder: "如 EQ-SJ-FJ-01.BRG，只填部件短码 MOTOR 会自动补设备编码",
        },
        { key: "metricCode", label: "指标编码", kind: "input", placeholder: "如 DE_TEMP、BRK_GAP" },
        { key: "name", label: "指标名称", kind: "input", placeholder: "如 驱动端轴承温度" },
        {
          key: "dataType",
          label: "原始数据类型",
          kind: "select",
          options: [...DATA_TYPES],
          placeholder: "Float / Int / Bool",
        },
        { key: "sampleMs", label: "采集频率", kind: "number", unit: "ms", placeholder: "留空按类别取默认周期" },
        { key: "unit", label: "原始单位", kind: "input", placeholder: "mm/s、℃、r/min" },
        { key: "value", label: "当前原始值", kind: "number", placeholder: "接入后由取值端写入", initial: 0 },
      ],
    },
    fetch: (q) => pointApi.page(q),
    writeFn: (data) => pointApi.save(data),
    deleteFn: (id) => pointApi.remove(id),
    summary: ({ total, rows }) => {
      const byState: Record<string, number> = {};
      for (const r of rows) byState[r.commState] = (byState[r.commState] ?? 0) + 1;
      const text = COMM_STATES.filter((s) => byState[s])
        .map((s) => `${s} ${byState[s]}`)
        .join(" · ");
      return `共 ${total} 个测点 · 本页 ${text || "无数据"}`;
    },
  };
});
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>

<script setup lang="ts">
/** 对应线上「设备管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/equipmentManage）
 *  已接入：POST /business/equipment/manage/page（分页 + 设备ID/名称/位置/三个检定维度/日期区间）
 *  待接入：新增、模板下载、导入、导出 —— equipment/manage/{add,edit,download,importFile,export} 已占位；
 *          行内「检定/校准记录」线上是打开记录子面板，按插桩提示
 *
 * ── 单页放宽 label：**queryLabelWidth = w-32（128px）** ──
 * ui-rules §6 要求同一页所有 label 同一个 w-*，默认 w-16 只放得下 ≤5 字；本页最长的
 * 「最近一次检定/校准日期」是 10 个汉字 + 1 个半角斜杠（≈124px），w-16/w-18 都会折行，
 * 而改文案又会动原文。按规则第 5 条「单页让步放行」整页放宽到 w-32，理由如上。
 *
 * ── 编码列按线上显示反查（码值来自实测行）──
 *   检定/校准频次 calibrationFrequency: year=每年 / month=每月
 *   检定/校准方式 calibrationApproach: 1=检定 / 2=校准
 *   检定/校准人   calibrationEmployees: third=外检 / self=自检
 * 展示用各自的 `*Str` 字段（线上就是用它），筛选用原始码值。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const FREQ: Record<string, string> = { year: "每年", month: "每月", day: "每天" };
const APPROACH: Record<string, string> = { "1": "检定", "2": "校准" };
const EMPLOYEE: Record<string, string> = { third: "外检", self: "自检", other: "其他" };

const spec: ListPageSpec = {
  code: "equipmentManage",
  queryLabelWidth: "w-32",
  query: [
    { key: "equipmentCode", label: "设备ID", kind: "input", placeholder: "请输入" },
    { key: "equipmentName", label: "设备名称", kind: "input", placeholder: "请输入" },
    { key: "mountingLocation", label: "安装位置", kind: "input", placeholder: "请输入" },
    {
      key: "calibrationFrequency",
      label: "检定/校准频次",
      kind: "select",
      options: Object.values(FREQ),
      valueMap: FREQ,
      placeholder: "请选择",
    },
    {
      key: "calibrationApproach",
      label: "检定/校准方式",
      kind: "select",
      options: Object.values(APPROACH),
      valueMap: APPROACH,
      placeholder: "请选择",
    },
    {
      key: "calibrationEmployees",
      label: "检定/校准人",
      kind: "select",
      options: Object.values(EMPLOYEE),
      valueMap: EMPLOYEE,
      placeholder: "请选择",
    },
    { key: "lastCalibrationDate", label: "最近一次检定/校准日期", kind: "range", placeholder: "开始时间" },
  ],
  columns: [
    { field: "equipmentCode", headerName: "设备ID", minWidth: 160, flex: 1 },
    { field: "equipmentName", headerName: "设备名称", minWidth: 200, flex: 2 },
    { field: "equipmentModel", headerName: "设备型号", width: 110 },
    { field: "mountingLocation", headerName: "安装位置", width: 150 },
    { field: "inspectionFrequencyStr", headerName: "监测频次", width: 100 },
    { field: "accuracyLevelStr", headerName: "准确度等级", width: 110 },
    { field: "calibrationFrequencyStr", headerName: "检定/校准频次", width: 130 },
    { field: "calibrationApproachStr", headerName: "检定/校准方式", width: 130 },
    { field: "calibrationEmployeesStr", headerName: "检定/校准人", width: 120 },
    { field: "lastCalibrationDateStr", headerName: "最近一次检定/校准日期", width: 170 },
    { field: "nextCalibrationDateStr", headerName: "下次检定/校准日期", width: 160 },
  ],
  actions: [
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
    { label: "检定/校准记录", kind: "stub" },
  ],
  toolbar: { add: true, export: true, extraButtons: ["模板下载", "导入"] },
  edit: {
    title: "设备",
    fields: [
      { key: "equipmentName", label: "设备名称", kind: "input" },
      { key: "equipmentModel", label: "设备型号", kind: "input" },
      { key: "mountingLocation", label: "安装位置", kind: "input" },
      { key: "inspectionFrequencyStr", label: "监测频次", kind: "input" },
      { key: "accuracyLevelStr", label: "准确度等级", kind: "input" },
      {
        key: "calibrationFrequency",
        label: "检定/校准频次",
        kind: "select",
        options: Object.values(FREQ),
        valueMap: FREQ,
      },
      {
        key: "calibrationApproach",
        label: "检定/校准方式",
        kind: "select",
        options: Object.values(APPROACH),
        valueMap: APPROACH,
      },
      {
        key: "calibrationEmployees",
        label: "检定/校准人",
        kind: "select",
        options: Object.values(EMPLOYEE),
        valueMap: EMPLOYEE,
      },
      { key: "remark", label: "说明", kind: "textarea" },
    ],
  },
  fetch: carbonQuery("/equipment/manage/page", "post"),
  exportFn: carbonStub("/equipment/manage/export"),
  writeFn: carbonStub("/equipment/manage/add"),
  deleteFn: carbonStub("/equipment/manage/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>

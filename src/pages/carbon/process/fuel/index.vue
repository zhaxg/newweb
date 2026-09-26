<script setup lang="ts">
/** 对应线上「燃料管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/productionFuelManage）
 *  已接入：GET /business/fuelManageEnter/list（分页 + 燃料名称）
 *          下拉候选取自 GET /business/energyType/list（线上同页调用）
 *  待接入：新增 / 详情 / 编辑 / 删除 —— fuelManageEnter 与 /:id 已占位
 *
 * 四个编码列的码表全部来自线上字典（`DictionaryData/All` 实抓）：
 *   fuel_type  ：0=化石燃料 1=生物燃料 2=核燃料          → 「燃料类型」(fuelTypeId)
 *   energy_type：0=非清洁能源 1=清洁能源                 → 「能源类型」(energyTypeId)
 *   fule_form  ：0=固态 1=液体 2=气态                     → 「形态」(fuelFormId)
 * 「种类」线上的显示是「气」这类单字，它与形态同源于 fule_form（实测该行 form=2、种类=气），
 * 故按 0=固 1=液 2=气 压缩一档；0/1 是据 2=气 推的，**没有第二个样本可核**。
 *
 * 「种类/燃料类型/能源类型/形态」四个下拉的候选项是码表值，线上此处只给「燃料名称」一个可输条件，
 * 故筛选只接燃料名称，另外三个下拉按查询区元素保留但不参与过滤。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

/** 字典 fuel_type */
const FUEL_TYPE: Record<string, string> = { "0": "化石燃料", "1": "生物燃料", "2": "核燃料" };
/** 字典 energy_type */
const ENERGY_TYPE: Record<string, string> = { "0": "非清洁能源", "1": "清洁能源" };
/** 字典 fule_form */
const FORM: Record<string, string> = { "0": "固态", "1": "液体", "2": "气态" };
/** 由 fule_form 压成单字（见文件头说明，0/1 属推定） */
const KIND: Record<string, string> = { "0": "固", "1": "液", "2": "气" };

const spec: ListPageSpec = {
  code: "productionFuelManage",
  query: [
    { key: "fuelName", label: "燃料名称", kind: "input", placeholder: "请输入" },
    { key: "fuelKindQuery", label: "种类", kind: "select", options: ["固", "液", "气"], placeholder: "请选择" },
    {
      key: "fuelFormQuery",
      label: "燃料类型",
      kind: "select",
      options: Object.values(FUEL_TYPE),
      placeholder: "请选择",
    },
    {
      key: "energyTypeQuery",
      label: "能源类型",
      kind: "select",
      options: Object.values(ENERGY_TYPE),
      placeholder: "请选择",
    },
  ],
  columns: [
    { field: "fuelName", headerName: "燃料名称", minWidth: 150, flex: 1 },
    { field: "aliasName", headerName: "别名", width: 130 },
    { field: "fuelUnit", headerName: "计量单位", width: 100 },
    { field: "lowerHeatingValue", headerName: "低位发热值", width: 110 },
    { field: "carbonContentValue", headerName: "单位热值含碳量", width: 130 },
    { field: "carbonOxidationValue", headerName: "碳氧化率", width: 100 },
    {
      field: "fuelFormId",
      headerName: "种类",
      width: 70,
      valueFormatter: (p) => KIND[String(p.value)] ?? String(p.value ?? ""),
    },
    {
      field: "fuelTypeId",
      headerName: "燃料类型",
      width: 100,
      valueFormatter: (p) => FUEL_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    {
      field: "energyTypeId",
      headerName: "能源类型",
      width: 110,
      valueFormatter: (p) => ENERGY_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    {
      field: "fuelFormId",
      colId: "form",
      headerName: "形态",
      width: 80,
      valueFormatter: (p) => FORM[String(p.value)] ?? String(p.value ?? ""),
    },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  detail: {
    sections: [
      {
        fields: [
          { label: "燃料名称", from: "fuelName" },
          { label: "别名", from: "aliasName" },
          { label: "计量单位", from: "fuelUnit" },
          { label: "低位发热值", from: "lowerHeatingValue" },
          { label: "低位发热值单位", from: "lowerHeatingUnit" },
          { label: "单位热值含碳量", from: "carbonContentValue" },
          { label: "含碳量单位", from: "carbonContentUnit" },
          { label: "碳氧化率", from: "carbonOxidationValue", suffix: "%" },
          { label: "种类", from: "fuelFormId", map: KIND },
          { label: "燃料类型", from: "fuelTypeId", map: FUEL_TYPE },
          { label: "能源类型", from: "energyTypeId", map: ENERGY_TYPE },
          { label: "形态", from: "fuelFormId", map: FORM },
        ],
      },
    ],
  },
  edit: {
    title: "燃料",
    fields: [
      { key: "fuelName", label: "燃料名称", kind: "input" },
      { key: "aliasName", label: "别名", kind: "input" },
      { key: "fuelUnit", label: "计量单位", kind: "input" },
      { key: "lowerHeatingValue", label: "低位发热值", kind: "number" },
      { key: "carbonContentValue", label: "单位热值含碳量", kind: "number" },
      { key: "carbonOxidationValue", label: "碳氧化率", kind: "number", unit: "%" },
      { key: "fuelFormId", label: "形态", kind: "select", options: Object.values(FORM), valueMap: FORM },
      { key: "fuelTypeId", label: "燃料类型", kind: "select", options: Object.values(FUEL_TYPE), valueMap: FUEL_TYPE },
      {
        key: "energyTypeId",
        label: "能源类型",
        kind: "select",
        options: Object.values(ENERGY_TYPE),
        valueMap: ENERGY_TYPE,
      },
    ],
  },
  fetch: carbonQuery("/fuelManageEnter/list"),
  writeFn: carbonStub("/fuelManageEnter"),
  deleteFn: carbonStub("/fuelManageEnter/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>

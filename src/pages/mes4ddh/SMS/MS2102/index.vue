<script setup lang="ts">
/** 对应 FrmMS2102（虚拟炉号信息查询）：DDH.Winforms.SMS.Forms.FrmMS2102
 *  已接入：frmMS2100ZLVirtualStoveNoApi.getVirtualStoveNoDatas（btnQuery_Click → FrmMS2102ParamDto）
 *  列集：extract 6 可见 + 95 隐藏；产线/机台按 cQueryString 运行时灌注
 *  待接入：无 */
import { onMounted, onBeforeUnmount, reactive, ref, shallowRef, nextTick } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Textarea from "primevue/textarea";
import { IconSearch } from "@tabler/icons-vue";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** extract 字段 PascalCase → 后端 JSON camelCase 桥接 */
function bridge(cols: ColDef[]): ColDef[] {
  return cols.map((c) => {
    if (!c.field) return c;
    const f = c.field;
    const ck = f.charAt(0).toLowerCase() + f.slice(1);
    return {
      ...c,
      valueGetter: (p: ValueGetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        return d ? (d[ck] ?? d[f]) : undefined;
      },
      valueSetter: (p: ValueSetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        if (!d) return false;
        d[ck] = p.newValue;
        d[f] = p.newValue;
        return true;
      },
    };
  });
}

import { frmMS2100ZLVirtualStoveNoApi } from "@/api/mes4ddh/sms.swagger";

const { json: menuJson } = useMenuQuery();
const qs = menuJson as { LineCode?: string; MachineCodes?: string[] };
const lineCode = qs.LineCode ?? "";
const machineCodes = qs.MachineCodes ?? [];

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function day(offset: number) {
  const t = new Date();
  t.setDate(t.getDate() + offset);
  return t;
}
const q = reactive({ beg: day(0), end: day(3), machineCode: machineCodes[0] ?? "" });
const machineOptions = machineCodes.map((c) => ({ label: c, value: c }));

const colDefs = ref<ColDef[]>(
  bridge([
    { field: "CStove", headerName: "虚拟炉号", width: 80 },
    { field: "Creator", headerName: "创建人", width: 67 },
    { field: "DStoveNoCreateTime", headerName: "虚拟炉号添加时间", width: 132 },
    { field: "DTeamDate", headerName: "班次日期", width: 80 },
    { field: "CShift", headerName: "班次", width: 64 },
    { field: "CTeam", headerName: "班组", width: 64 },
    { field: "Id", headerName: "主键", width: 64, hide: true },
    { field: "NStatus", headerName: "处理标记", width: 80, hide: true },
    { field: "CJcFk", headerName: "浇次主键", width: 80, hide: true },
    { field: "CJcNo", headerName: "浇次号", width: 67, hide: true },
    { field: "CPono", headerName: "制造命令号", width: 93, hide: true },
    { field: "CLineCode", headerName: "产线", width: 64, hide: true },
    { field: "CSgStd", headerName: "执行标准", width: 80, hide: true },
    { field: "CSgCode", headerName: "钢种", width: 64, hide: true },
    { field: "CSpec", headerName: "规格", width: 64, hide: true },
    { field: "NThick", headerName: "坯厚", width: 64, hide: true },
    { field: "NWidth", headerName: "坯宽", width: 64, hide: true },
    { field: "NLen", headerName: "坯长", width: 64, hide: true },
    { field: "NQua", headerName: "支数", width: 64, hide: true },
    { field: "NWgt", headerName: "坯重", width: 64, hide: true },
    { field: "NSort", headerName: "顺序号", width: 67, hide: true },
    { field: "NSortJc", headerName: "炉数", width: 64, hide: true },
    { field: "CMatCode", headerName: "物料编码", width: 80, hide: true },
    { field: "CMatName", headerName: "物料名称", width: 80, hide: true },
    { field: "CCcCode", headerName: "连铸代码", width: 80, hide: true },
    { field: "CRhCode", headerName: "真空代码", width: 80, hide: true },
    { field: "CLfCode", headerName: "精炼代码", width: 80, hide: true },
    { field: "CLdCode", headerName: "转炉代码", width: 80, hide: true },
    { field: "COrderNo", headerName: "订单号", width: 67, hide: true },
    { field: "CIsZb", headerName: "是否备坯计划", width: 106, hide: true },
    { field: "DUseTime", headerName: "可用时间", width: 80, hide: true },
    { field: "CRoute", headerName: "工艺路线", width: 80, hide: true },
    { field: "DJhqTime", headerName: "交期", width: 64, hide: true },
    { field: "CCustName", headerName: "客户名称", width: 80, hide: true },
    { field: "CTsyq", headerName: "特殊要求", width: 80, hide: true },
    { field: "NLgCn", headerName: "炼钢产能", width: 80, hide: true },
    { field: "CRemark", headerName: "反馈结果", width: 80, hide: true },
    { field: "CLenMx", headerName: "长度明细", width: 80, hide: true },
    { field: "CSgCodeStd", headerName: "钢种标准", width: 80, hide: true },
    { field: "CStNo", headerName: "制造标准号", width: 93, hide: true },
    { field: "DDownDdTime", headerName: "下发调度时间", width: 106, hide: true },
    { field: "CDownDdUser", headerName: "下发调度人", width: 93, hide: true },
    { field: "DDownLgsc", headerName: "下发生产时间", width: 106, hide: true },
    { field: "CDownLgscUser", headerName: "下发人", width: 67, hide: true },
    { field: "NWgtMeter", headerName: "米单重", width: 67, hide: true },
    { field: "CSpecOrder", headerName: "成品规格", width: 80, hide: true },
    { field: "CLineName", headerName: "产线名称", width: 80, hide: true },
    { field: "CIsSl", headerName: "是否收料", width: 80, hide: true },
    { field: "NGenerateRoutePlan", headerName: "生成工艺路线计划", width: 132, hide: true },
    { field: "CPotType", headerName: "包况", width: 64, hide: true },
    { field: "CPotNo", headerName: "罐号", width: 64, hide: true },
    { field: "CPotNoId", headerName: "包数据ID", width: 74, hide: true },
    { field: "CStoveLocation", headerName: "最新炉次位置", width: 106, hide: true },
    { field: "CStoveLocationStation", headerName: "最新炉次工位", width: 106, hide: true },
    { field: "CStoveState", headerName: "最新炉次状态", width: 106, hide: true },
    { field: "CStovePlanId", headerName: "炉次计划id", width: 87, hide: true },
    { field: "CToCurrentStoveSplitMergeType", headerName: "生成当前炉次的拆合类型", width: 171, hide: true },
    { field: "CToCurrentStoveSplitMergeTypeSign", headerName: "生成当前炉次的拆合类型标识", width: 197, hide: true },
    { field: "CStoveSplitMergeType", headerName: "炉次拆合类型", width: 106, hide: true },
    { field: "CStoveSplitMergeTypeSign", headerName: "炉次拆合类型标识", width: 132, hide: true },
    { field: "CStoveChangeId", headerName: "炉次最终更改标识id", width: 139, hide: true },
    { field: "CStoveChangeMachinename", headerName: "炉次最终更改位置", width: 132, hide: true },
    { field: "CQmAdjust", headerName: "质检改判", width: 80, hide: true },
    { field: "CQmAdjustActualId", headerName: "最终质检改判时炉次工序机台实际id", width: 220, hide: true },
    { field: "CRefurnace", headerName: "炉次回炉", width: 80, hide: true },
    { field: "CRefurnaceState", headerName: "炉次回炉状态", width: 106, hide: true },
    { field: "CRefurnaceActualId", headerName: "炉次回炉时炉次工序机台实际id", width: 204, hide: true },
    { field: "CMoveGs", headerName: "炉次转钢水", width: 93, hide: true },
    { field: "CMoveGsSign", headerName: "炉次转钢水标识", width: 119, hide: true },
    { field: "CMoveGsPlanId", headerName: "炉次转钢水时炉次工序机台计划id", width: 217, hide: true },
    { field: "CEnable", headerName: "启用", width: 64, hide: true },
    { field: "CNotEnableBackup", headerName: "不启用状态备注", width: 119, hide: true },
    { field: "DAccountDate", headerName: "账务日期", width: 80, hide: true },
    { field: "NMixStove", headerName: "混合炉", width: 67, hide: true },
    { field: "CBackup", headerName: "备注", width: 64, hide: true },
    { field: "CDelFlag", headerName: "删除标识", width: 80, hide: true },
    { field: "Timestamp", headerName: "时间戳", width: 67, hide: true },
    { field: "CreateTime", headerName: "创建时间", width: 80, hide: true },
    { field: "LastModifier", headerName: "最后修改人", width: 93, hide: true },
    { field: "LastModifyTime", headerName: "最后修改时间", width: 106, hide: true },
    { field: "CSw01", headerName: "备用字段1", width: 87, hide: true },
    { field: "CSw02", headerName: "备用字段2", width: 87, hide: true },
    { field: "CSw03", headerName: "备用字段3", width: 87, hide: true },
    { field: "CSw04", headerName: "备用字段4", width: 87, hide: true },
    { field: "CSw05", headerName: "备用字段5", width: 87, hide: true },
    { field: "CSw06", headerName: "备用字段6", width: 87, hide: true },
    { field: "CZGLineCode", headerName: "轧钢产线代码", width: 106, hide: true },
    { field: "CPlanTime", headerName: "计划日期", width: 80, hide: true },
    { field: "CJcNoActual", headerName: "生产浇次号", width: 93, hide: true },
    { field: "NSortJcActual", headerName: "生产浇次内顺序号", width: 132, hide: true },
    { field: "NJcActualBeg", headerName: "生产本浇次首炉", width: 119, hide: true },
    { field: "NJcActualEnd", headerName: "生产本浇次尾炉", width: 119, hide: true },
    { field: "NChange", headerName: "炉次是否改钢种", width: 119, hide: true },
    {
      field: "CBeforeChangeId",
      headerName: "炉次生产改钢种前id 改钢种后新增加的数据记录的之前的数据id",
      width: 220,
      hide: true,
    },
    {
      field: "CAfterChangeId",
      headerName: "炉次生产改钢种后id 改钢种后原数据记录的新增加的数据的id",
      width: 220,
      hide: true,
    },
    { field: "CProBof", headerName: "炉次生产转炉", width: 106, hide: true },
    { field: "NVirtualStoveNo", headerName: "虚拟炉号", width: 80, hide: true },
    { field: "CVirtualStoveNoBof", headerName: "虚拟炉号转炉", width: 106, hide: true },
    { field: "NOccupiedStoveNo", headerName: "占用炉号", width: 80, hide: true },
    { field: "COccupiedStoveNoBof", headerName: "占用炉号所属转炉", width: 132, hide: true },
    { field: "Selected", headerName: "选择", width: 64, hide: true },
  ]),
);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    const list =
      (await frmMS2100ZLVirtualStoveNoApi.getVirtualStoveNoDatas({
        lineCode: lineCode || undefined,
        lineDesc: lineCode || undefined,
        machineCode: q.machineCode || undefined,
        machineName: q.machineCode || undefined,
        begTime: q.beg,
        endTime: q.end,
      })) ?? [];
    rows.value = Array.isArray(list) ? list : [];
    await nextTick();
    gridApi.value?.autoSizeAllColumns();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <Select
        v-model="q.machineCode"
        :options="machineOptions"
        option-label="label"
        option-value="value"
        class="w-32 shrink-0"
      />
      <label class="shrink-0 text-xs text-muted-foreground">时间范围</label>
      <DatePicker v-model="q.beg" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">≤日期≤</label>
      <DatePicker v-model="q.end" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :loading="querying"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>

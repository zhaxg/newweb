<script setup lang="ts">
/** 对应 FrmMS2300_Log（操作记录查询，2 菜单共用、cQueryString=裸产线码 LG02/LG01 直传 LineCode）：DDH.Winforms.SMS.Forms.FrmMS2300_Log
 *  已接入：frmMS2300LogApi.query（btnQuery_Click → FrmMS2300LogParamDto{LineCode=qs裸码, Date, Range, StoveNo, Pono}）
 *          区间档位照 .cs Load 五项：当天近1小时内=1 / 近3小时=3 / 近6小时=6 / 近12小时=12 / 当天所有=24，默认第1项
 *  列集：extract 9 可见 + 35 隐藏（hide:true，含 Id/各类 JSON 载荷串/LastModifier…）；CPono=制造命令号、CRemark=反馈结果（按 LDisplay）
 *  无行内编辑/无二级弹窗（.cs 仅查询）
 *  偏差：CType3「操作方式」原 OperationModeEnumFormatter、Creator 原 UserFormatter 显示器未迁（显示原值，同既往批次）；
 *        列头第二个「日期」标签为原 cboRange 旁的 LabelControl（Designer Text 原样如此），对应控件实为时段下拉
 *  字段桥接：后端 JSON camelCase → 回填 toPascal 首字母还原 */
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { frmMS2300LogApi } from "@/api/mes4ddh/sms.swagger";

const { raw: menuQs } = useMenuQuery(); // 原 btnQuery 里 LineCode = QueryString（裸产线码）

const theme = makeHmxGridTheme();
const gridApi = ref<GridApi | null>(null);
const querying = ref(false);

const deDate = ref<Date>(new Date()); // 原 Load：deDate.DateTime = DateTime.Today
const stoveNo = ref("");
const pono = ref("");
// 原 cboRange.Properties.Items.Add(文本, 值, 图片索引)，默认 SelectedIndex=0
const rangeOptions = [
  { label: "当天近1小时内", value: 1 },
  { label: "当天近3小时内", value: 3 },
  { label: "当天近6小时内", value: 6 },
  { label: "当天近12小时内", value: 12 },
  { label: "当天所有", value: 24 },
];
const rangeVal = ref(rangeOptions[0]);

const rows = ref<Record<string, unknown>[]>([]);

const colDefs = ref<ColDef[]>([      { field: "DTime", headerName: "时间", width: 86 },
      { field: "CLineName", headerName: "产线名称", width: 112 },
      { field: "CMachineName", headerName: "机台名称", width: 112 },
      { field: "CStoveNo", headerName: "炉号", width: 86 },
      { field: "CPono", headerName: "制造命令号", width: 125 },
      { field: "CType3", headerName: "操作方式", width: 112 },
      { field: "CRemark", headerName: "反馈结果", width: 112 },
      { field: "Creator", headerName: "创建人", width: 99 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "Id", headerName: "主键", width: 86, hide: true },
      { field: "CType", headerName: "类型", width: 86, hide: true },
      { field: "CProc", headerName: "工序", width: 86, hide: true },
      { field: "CMachineCode", headerName: "机台编码", width: 112, hide: true },
      { field: "CMachinestationCode", headerName: "工位编码", width: 112, hide: true },
      { field: "CMachinestationDesc", headerName: "工位描述", width: 112, hide: true },
      { field: "CType1", headerName: "操作类型1", width: 125, hide: true },
      { field: "CType2", headerName: "操作类型2", width: 125, hide: true },
      { field: "CIpAddr", headerName: "服务器IP地址", width: 151, hide: true },
      { field: "CTms1030Data", headerName: "tms1030表数据", width: 190, hide: true },
      { field: "CTms2000Data", headerName: "tms2000表数据", width: 190, hide: true },
      { field: "CTms2010Data", headerName: "tms2010表数据", width: 190, hide: true },
      { field: "CRunData", headerName: "运转记录表数据", width: 151, hide: true },
      { field: "CExceptionInfo", headerName: "异常信息", width: 112, hide: true },
      { field: "COtherData", headerName: "其它数据记录", width: 138, hide: true },
      { field: "CTimestamp", headerName: "时间戳", width: 99, hide: true },
      { field: "LastModifier", headerName: "最后修改人", width: 125, hide: true },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
      { field: "CSw01", headerName: "备用字段1", width: 125, hide: true },
      { field: "CSw02", headerName: "备用字段2", width: 125, hide: true },
      { field: "CSw03", headerName: "备用字段3", width: 125, hide: true },
      { field: "CSw04", headerName: "备用字段4", width: 125, hide: true },
      { field: "CSw05", headerName: "备用字段5", width: 125, hide: true },
      { field: "CSw06", headerName: "备用字段6", width: 125, hide: true },
      { field: "Selected", headerName: "选择", width: 86, hide: true },
      { field: "CLineCode", headerName: "产线", width: 86, hide: true },
      { field: "CExceptionInfoStr", headerName: "异常信息字符串", width: 151, hide: true },
      { field: "COtherDataStr", headerName: "其它数据记录字符串", width: 177, hide: true },
      { field: "CRunDataStr", headerName: "运转记录表数据字符串", width: 190, hide: true },
      { field: "CSw01Str", headerName: "备用字段1字符串", width: 164, hide: true },
      { field: "CSw02Str", headerName: "备用字段2字符串", width: 164, hide: true },
      { field: "CSw03Str", headerName: "备用字段3字符串", width: 164, hide: true },
      { field: "CTms1030DataStr", headerName: "tms1030表数据字符串", width: 229, hide: true },
      { field: "CTms2000DataStr", headerName: "tms2000表数据字符串", width: 229, hide: true },
      { field: "CTms2010DataStr", headerName: "tms2010表数据字符串", width: 229, hide: true }]);

/** 后端 JSON 为 camelCase（首字母小写），extract 列为 PascalCase——回填时首字母还原 */
function toPascal(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k ? k[0].toUpperCase() + k.slice(1) : k] = v;
  return out;
}

async function onQuery() {
  querying.value = true;
  try {
    const list =
      (await frmMS2300LogApi.query({
        LineCode: menuQs, // 原 FrmMS2300LogParamDto.LineCode = QueryString
        Date: deDate.value,
        Range: rangeVal.value.value,
        StoveNo: stoveNo.value,
        Pono: pono.value,
      })) ?? [];
    rows.value = (list as Record<string, unknown>[]).map(toPascal);
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

onMounted(() => {
  /* 原 Load：日期=今天、时段默认第1项（已在 ref 初值），两处格式化器见来源注释偏差 */
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：日期/时段/炉次号/制造命令号/查询） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="deDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <Select v-model="rangeVal" :options="rangeOptions" option-label="label" option-value="value"
        class="w-40 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">炉次号</label>
      <InputText v-model="stoveNo" class="w-32 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">制造命令号</label>
      <InputText v-model="pono" class="w-40 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        :loading="querying" @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>

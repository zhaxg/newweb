<script setup lang="ts">
/** 对应 FrmHR9300（工艺判定报表）：DDH.Winforms.SHR.Forms.FrmHR9300
 *  已接入：hR9300Api.query9300 + 17 个汇总方法（外层5页签×内层页签联动；数据过滤=钢种不在[Q235B]且性能要求=保性能，同原窗体硬编码）
 *  待接入：行双击原开 FrmHR9201 明细弹窗（占位提示）
 *  偏差：加热炉页签「出炉温度判定班组汇总」原代码已注释（页签保留、不查询）；班组/责任者 KV 列显示原值 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import {
  hR9300Api,
  type DtoQueryThr3000,
  type QueryHR9300Dto,
  type QueryHR9300HzDto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function defaultRange(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  begin.setDate(begin.getDate() - 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [begin, end];
}

const input = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  slabNo: "",
  dates: defaultRange() as Date[] | null,
});

const rows = shallowRef<QueryHR9300Dto[]>([]);
const loading = ref(false);
const mainApi = ref<GridApi | null>(null);
function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}

const mainColDefs: ColDef[] = [
  /*  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 172 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 100 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 100 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 100 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 100 },
  { colId: "rmEntTempTar", field: "rmEntTempTar", headerName: "粗轧开轧温度目标", width: 100 },
  { colId: "rmEntTempAvg", field: "rmEntTempAvg", headerName: "粗轧开轧温度", width: 100 },
  { colId: "rmEntTempPd", field: "rmEntTempPd", headerName: "粗轧开轧温度判定", width: 100 },
  { colId: "fmEntTempTar", field: "fmEntTempTar", headerName: "精轧开轧温度目标", width: 100 },
  { colId: "fmEntTempAvg", field: "fmEntTempAvg", headerName: "精轧开轧温度", width: 100 },
  { colId: "fmEntTempPd", field: "fmEntTempPd", headerName: "精轧开轧温度判定", width: 100 },
  { colId: "fmExitTempTar", field: "fmExitTempTar", headerName: "精轧终轧温度目标", width: 100 },
  { colId: "fmExitTempAvg", field: "fmExitTempAvg", headerName: "精轧终轧温度", width: 100 },
  { colId: "fmExitTempPd", field: "fmExitTempPd", headerName: "精轧终轧温度判定", width: 100 },
  { colId: "entryAveTemp", field: "entryAveTemp", headerName: "开冷平均温度", width: 100 },
  { colId: "entryAveTempPd", field: "entryAveTempPd", headerName: "开冷平均温度判定", width: 100 },
  { colId: "targetFinishTemp", field: "targetFinishTemp", headerName: "返红目标温度", width: 100 },
  { colId: "finishAveTemp", field: "finishAveTemp", headerName: "返红平均温度", width: 100 },
  { colId: "finishAveTempPd", field: "finishAveTempPd", headerName: "返红平均温度判定", width: 100 },
  { colId: "dProductTime", field: "dProductTime", headerName: "生产时间", width: 150 },
  { colId: "author", field: "author", headerName: "责任者", width: 100 },
  { colId: "cFmAuthorA", field: "cFmAuthorA", headerName: "精轧责任者A", width: 112 },
  { colId: "cFmAuthorB", field: "cFmAuthorB", headerName: "精轧责任者B", width: 112 },
  { colId: "cRmAuthorA", field: "cRmAuthorA", headerName: "粗轧责任者A", width: 112 },
  { colId: "cRmAuthorB", field: "cRmAuthorB", headerName: "粗轧责任者B", width: 112 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 150 },
  { colId: "outFurTemp", field: "outFurTemp", headerName: "出炉温度", width: 112 },
  { colId: "outFurTempPlan", field: "outFurTempPlan", headerName: "出炉温度目标", width: 112 },
  { colId: "outFurTempPd", field: "outFurTempPd", headerName: "出炉温度判定", width: 112 },
  { colId: "inFurTimePlan", field: "inFurTimePlan", headerName: "加热时间目标", width: 112 },
  { colId: "inFurTimePd", field: "inFurTimePd", headerName: "加热时间判定", width: 112 },
  { colId: "inFurTime", field: "inFurTime", headerName: "加热时间", width: 112 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 100 },
  { colId: "rmPass", field: "rmPass", headerName: "粗轧总轧制道次数", width: 176 },
  { colId: "fmPass", field: "fmPass", headerName: "精轧总轧制道次数", width: 176 },
  { colId: "cIsQy", field: "cIsQy", headerName: "是否取样板", width: 150 },
  { colId: "fmEntThick", field: "fmEntThick", headerName: "精轧开始厚度（计算）", width: 212 },
  { colId: "targetEntryTemp", field: "targetEntryTemp", headerName: "目标开冷温度", width: 112 },
  { colId: "cAuthorACC", field: "cAuthorACC", headerName: "ACC责任者", width: 112 },
  { colId: "cYxl", field: "cYxl", headerName: "压下率判定", width: 150 },
  { colId: "isAutoUse", field: "isAutoUse", headerName: "是否投用自动", width: 140 },
  { colId: "dwThick", field: "dwThick", headerName: "待温厚度", width: 150, hide: true },*/
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryThr3000 = {
      cLineCode: "ZG01",
      cSgCodes: ["Q235B"],
      dCreateTimeRange: toTimeRange(input.dates),
      cOrderNo: input.cOrderNo.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
      cStove: input.cStove.trim() || null,
      cSgCode: input.cSgCode.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
      slabNo: input.slabNo.trim() || null,
    };
    rows.value = (await hR9300Api.query9300(dto)) ?? [];
    requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
  await hzBind();
}

/* 原 bandedGridView1_DoubleClick → FrmHR9201（未迁移，占位） */
function onRowDblClick() {
  const r = mainApi.value?.getSelectedRows()[0] as QueryHR9300Dto | undefined;
  if (!r) return;
  toast(`工艺判定明细窗体（FrmHR9201）待迁移：板坯 ${r.cPieceNoSlab ?? ""}`, 2500, "warn");
}

/* ---------- 汇总配置：外层 5 页签 × 内层页签 ---------- */
type HzItem = {
  label: string;
  fn?: (d?: QueryHR9300Dto[]) => Promise<QueryHR9300HzDto[]>;
  cols: ColDef[];
  src: number;
};
const hzCols: ColDef[][] = [
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "author", field: "author", headerName: "责任者", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "author", field: "author", headerName: "责任者", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "author", field: "author", headerName: "责任者", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "date", field: "date", headerName: "日期", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },
  { colId: "date", field: "date", headerName: "日期", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },
  { colId: "date", field: "date", headerName: "日期", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "date", field: "date", headerName: "日期", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },
  { colId: "date", field: "date", headerName: "日期", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },
  { colId: "nZcQua2", field: "nZcQua2", headerName: "块数", width: 112 },
  { colId: "nZcRate2", field: "nZcRate2", headerName: "比例", width: 112 },
  { colId: "date", field: "date", headerName: "日期", width: 112, hide: true },
  { colId: "author", field: "author", headerName: "责任者", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "author", field: "author", headerName: "责任者", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "author", field: "author", headerName: "责任者", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },
  { colId: "nZcQua2", field: "nZcQua2", headerName: "块数", width: 112 },
  { colId: "nZcRate2", field: "nZcRate2", headerName: "比例", width: 112 },
  { colId: "date", field: "date", headerName: "日期", width: 112, hide: true },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "author", field: "author", headerName: "责任者", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },
  { colId: "nYzLowQua", field: "nYzLowQua", headerName: "块数", width: 112 },
  { colId: "nYzLowRate", field: "nYzLowRate", headerName: "比例", width: 112 },
  { colId: "nYbHotQua", field: "nYbHotQua", headerName: "块数", width: 112 },
  { colId: "nYbHotRate", field: "nYbHotRate", headerName: "比例", width: 112 },
  { colId: "nYzHotQua", field: "nYzHotQua", headerName: "块数", width: 112 },
  { colId: "nYzHotRate", field: "nYzHotRate", headerName: "比例", width: 112 },
  { colId: "date", field: "date", headerName: "日期", width: 112, hide: true },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },,
  ],*/
  /*[
  { colId: "author", field: "author", headerName: "责任者", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "nZcQua", field: "nZcQua", headerName: "块数", width: 112 },
  { colId: "nZcRate", field: "nZcRate", headerName: "比例", width: 112 },
  { colId: "nYbLowQua", field: "nYbLowQua", headerName: "块数", width: 112 },
  { colId: "nYbLowRate", field: "nYbLowRate", headerName: "比例", width: 112 },,
  ],*/
];
const hzRows = ref<unknown[][]>(hzCols.map(() => []));
const hzApis = ref<(GridApi | null)[]>(hzCols.map(() => null));
function onHzReady(src: number, e: GridReadyEvent) {
  hzApis.value[src] = e.api;
}

const outerTabs: { label: string; items: HzItem[] }[] = [
  {
    label: "粗轧数据汇总",
    items: [
      { label: "粗轧温度判定汇总", fn: hR9300Api.get9300HzRm, cols: hzCols[0] ?? [], src: 0 },
      { label: "粗轧温度判定班组汇总", fn: hR9300Api.get9300HzRmGroupHz, cols: hzCols[3] ?? [], src: 3 },
    ],
  },
  {
    label: "精轧数据汇总",
    items: [
      { label: "精轧开轧温度判定汇总", fn: hR9300Api.get9300HzFmStart, cols: hzCols[1] ?? [], src: 1 },
      { label: "精轧开轧温度判定班组汇总", fn: hR9300Api.get9300HzFmStGroupHz, cols: hzCols[4] ?? [], src: 4 },
      { label: "精轧终轧温度判定汇总", fn: hR9300Api.get9300HzFmEnd, cols: hzCols[2] ?? [], src: 2 },
      { label: "精轧终轧温度判定班组汇总", fn: hR9300Api.get9300HzFmEndGroupHz, cols: hzCols[5] ?? [], src: 5 },
    ],
  },
  {
    label: "加热炉数据汇总",
    items: [
      { label: "在炉时间判定班组汇总", fn: hR9300Api.get9300HzInFurTimeGroupHz, cols: hzCols[6] ?? [], src: 6 },
      // 原 xtraTabPage(出炉温度判定) 的查询分支已注释 — 保留页签不查询
      { label: "出炉温度判定班组汇总", cols: hzCols[7] ?? [], src: 7 },
    ],
  },
  {
    label: "ACC数据汇总",
    items: [
      { label: "返红温度判定班组汇总", fn: hR9300Api.get9300HzFinishTempGroupHz, cols: hzCols[8] ?? [], src: 8 },
      { label: "返红温度责任者汇总", fn: hR9300Api.get9300HzFinishTempAuthorHz, cols: hzCols[12] ?? [], src: 12 },
      { label: "开冷温度判定班组汇总", fn: hR9300Api.get9300HzEntryTempGroupHz, cols: hzCols[13] ?? [], src: 13 },
      { label: "开冷温度判定责任者汇总", fn: hR9300Api.get9300HzEntryTempAuthorHz, cols: hzCols[14] ?? [], src: 14 },
      { label: "ACC综合数据班组汇总", fn: hR9300Api.get9300HzACCTempGroupHz, cols: hzCols[15] ?? [], src: 15 },
      { label: "ACC综合数据责任者汇总", fn: hR9300Api.get9300HzACCTempAuthorHz, cols: hzCols[16] ?? [], src: 16 },
    ],
  },
  {
    label: "综合判定汇总",
    items: [
      { label: "精轧温度综合判定责任人汇总", fn: hR9300Api.get9300HzFmTempAuthorHz, cols: hzCols[9] ?? [], src: 9 },
      { label: "精轧温度综合判定班组汇总", fn: hR9300Api.get9300HzFmTempGroupHz, cols: hzCols[10] ?? [], src: 10 },
      { label: "班组轧制温度综合判定", fn: hR9300Api.get9300HzRollTempHz, cols: hzCols[11] ?? [], src: 11 },
    ],
  },
];
const outer = ref(0);
const inner = ref<number[]>([0, 0, 0, 0, 0]);
const hzLoading = ref(false);

async function hzBind() {
  if (rows.value.length <= 0) {
    for (const arr of hzRows.value) arr.splice(0);
    return;
  }
  // 原过滤：钢种不在硬编码集合且性能要求=保性能
  const dataList = rows.value.filter(
    (x) => !["Q235B"].includes(String(x.cSgCode ?? "")) && x.cSpecialMarkGy === "保性能",
  );
  const item = outerTabs[outer.value]?.items[inner.value[outer.value] ?? 0];
  if (!item) return;
  hzLoading.value = true;
  try {
    if (item.fn) {
      const list = (await item.fn(dataList)) ?? [];
      hzRows.value[item.src] = list;
    } else {
      hzRows.value[item.src] = [];
    }
    requestAnimationFrame(() => hzApis.value[item.src]?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    hzLoading.value = false;
  }
}

function onOuterChange(v: string | number) {
  outer.value = Number(v);
  void hzBind();
}
function onInnerChange(oi: number, v: string | number) {
  inner.value[oi] = Number(v);
  void hzBind();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件 -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">作业时间</label>
        <DatePicker
          v-model="input.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-3 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 上：工艺判定明细 -->
    <div class="flex min-h-0 flex-[5] flex-col">
      <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs font-medium text-muted-foreground">工艺判定明细</span>
      </div>
      <div class="min-h-0 flex-1 overflow-hidden">
        <AgGridVue
          class="hmx-ag-grid h-full w-full"
          :theme="theme"
          :locale-text="AG_GRID_LOCALE_CN"
          :default-col-def="hmxDefaultColDef"
          :column-defs="mainColDefs"
          :row-data="rows"
          :pagination="false"
          :animate-rows="false"
          :loading="loading"
          @grid-ready="onMainReady"
          @row-double-clicked="onRowDblClick"
          @first-data-rendered="autoSizeOnFirstData"
        />
      </div>
    </div>

    <!-- 下：工艺判定汇总（外层5×内层N） -->
    <div class="flex min-h-0 flex-[5] flex-col border-t border-border/60">
      <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs font-medium text-muted-foreground">工艺判定汇总</span>
      </div>
      <Tabs :value="outer" class="flex min-h-0 flex-1 flex-col" @update:value="onOuterChange">
        <TabList class="flex-wrap">
          <Tab v-for="(o, oi) in outerTabs" :key="oi" :value="oi">{{ o.label }}</Tab>
        </TabList>
        <TabPanels class="min-h-0 flex-1">
          <TabPanel v-for="(o, oi) in outerTabs" :key="oi" :value="oi" class="h-full p-0">
            <Tabs :value="inner[oi]" class="flex h-full flex-col" @update:value="(v) => onInnerChange(oi, v)">
              <TabList class="flex-wrap">
                <Tab v-for="(it, ii) in o.items" :key="ii" :value="ii">{{ it.label }}</Tab>
              </TabList>
              <TabPanels class="min-h-0 flex-1">
                <TabPanel v-for="(it, ii) in o.items" :key="ii" :value="ii" class="h-full p-0">
                  <AgGridVue
                    class="hmx-ag-grid h-full w-full"
                    :theme="theme"
                    :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef"
                    :column-defs="it.cols"
                    :row-data="hzRows[it.src]"
                    :pagination="false"
                    :animate-rows="false"
                    :loading="hzLoading"
                    @grid-ready="(e: GridReadyEvent) => onHzReady(it.src, e)"
                    @first-data-rendered="autoSizeOnFirstData"
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 对应 FrmHR4810（实际成材率查询）：DDH.Winforms.SHR.Forms.FrmHR4810
 *  已接入：hR4810Api.get4810Dtos + 5 个汇总方法（班组/切边方式下拉取 kv：A0000:THR_GROUP、010100:CUTFLAG）
 *  偏差：班组/切边方式原 ImageComboBox(kv) → Select(kv)；原汇总表 Group/钢种列 CellMerge 未迁（AG Grid 无单元格合并）；
 *       原 4 个无文本孤儿按钮（simpleButton2-5，未挂容器）未迁；ViewControl.Completed 清空班组/切边方式 → 查询后清空 */
import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
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
import { systemKeyValueApi } from "@/api/admin/request";
import {
  hR4810Api,
  type DtoQueryThr4810,
  type Thr4810CclHzDto,
  type Thr4810Dto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

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
  begin.setDate(begin.getDate() - 7);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [begin, end];
}

/* ---------- kv 下拉（原 ImageComboBox：班组 A0000:THR_GROUP / 切边方式 010100:CUTFLAG） ---------- */
const groupOptions = ref<{ label: string; value: string }[]>([]);
const trimOptions = ref<{ label: string; value: string }[]>([]);

const input = reactive({
  cPieceNoSlab: "",
  cPieceNo: "",
  cShiftGroup: null as string | null,
  cTrimFlag: null as string | null,
  cSgCode: "",
  dates: defaultRange() as Date[] | null,
});

const rows = shallowRef<Thr4810Dto[]>([]);
const loading = ref(false);
const hzLoading = ref(false);
const api = ref<GridApi | null>(null);
const hzApi = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) { api.value = e.api; }
function onHzReady(e: GridReadyEvent) { hzApi.value = e.api; }

const colDefs: ColDef[] = [
  /*  { colId: "date", field: "date", headerName: "日期", width: 150 },
  { colId: "group", field: "group", headerName: "班组", width: 150 },
  { colId: "cPieceSlabNo", field: "cPieceSlabNo", headerName: "板坯号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "cSgCodeSlab", field: "cSgCodeSlab", headerName: "钢坯钢种", width: 150 },
  { colId: "cSgCodeCp", field: "cSgCodeCp", headerName: "成品钢种", width: 150 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 150 },
  { colId: "nThickFur", field: "nThickFur", headerName: "照核厚度", width: 150 },
  { colId: "nWidthFur", field: "nWidthFur", headerName: "照核宽度", width: 150 },
  { colId: "nLenFur", field: "nLenFur", headerName: "照核长度", width: 150 },
  { colId: "nWgtFur", field: "nWgtFur", headerName: "炉前称重", width: 150 },
  { colId: "nThickJq", field: "nThickJq", headerName: "剪切厚度", width: 150 },
  { colId: "nWidthJq", field: "nWidthJq", headerName: "剪切宽度", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "订单厚度", width: 150 },
  { colId: "nWidth", field: "nWidth", headerName: "订单宽度", width: 150 },
  { colId: "nThickSj", field: "nThickSj", headerName: "成品厚度", width: 150 },
  { colId: "nWidthSj", field: "nWidthSj", headerName: "成品宽度", width: 150 },
  { colId: "nLenJq", field: "nLenJq", headerName: "剪切长度", width: 150 },
  { colId: "nWgtCp", field: "nWgtCp", headerName: "成品重量", width: 150 },
  { colId: "nCclLl", field: "nCclLl", headerName: "理论成材率", width: 150 },
  { colId: "nWgtLl", field: "nWgtLl", headerName: "理论重量", width: 150 },
  { colId: "nWgtZjb", field: "nWgtZjb", headerName: "质计部重量", width: 150 },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 150, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 150, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 150, hide: true },
  { colId: "nThickRoll", field: "nThickRoll", headerName: "轧制厚度", width: 150, hide: true },
  { colId: "nWidthRoll", field: "nWidthRoll", headerName: "轧制宽度", width: 150, hide: true },
  { colId: "nLenRoll", field: "nLenRoll", headerName: "轧制长度", width: 150, hide: true },
  { colId: "nWgtRoll", field: "nWgtRoll", headerName: "轧制重量", width: 150, hide: true },
  { colId: "meaThickWs", field: "meaThickWs", headerName: "厚度（工作侧）测厚仪", width: 150, hide: true },
  { colId: "meaThickDs", field: "meaThickDs", headerName: "厚度（传动侧）测厚仪", width: 150, hide: true },
  { colId: "thickHp", field: "thickHp", headerName: "钢板测厚仪中部厚度", width: 150, hide: true },*/
];
const hzCols: ColDef[][] = [
  /*[
  { colId: "group", field: "group", headerName: "班组", width: 112 },
  { colId: "nOrderThick", field: "nOrderThick", headerName: "厚度", width: 112 },
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "钢坯总支数", width: 112 },
  { colId: "nQuaCp", field: "nQuaCp", headerName: "成品总支数", width: 112 },
  { colId: "nQuaSjSlab2", field: "nQuaSjSlab2", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp2", field: "nQuaSjCp2", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj2", field: "nFurWgtSj2", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl2", field: "nWgtLl2", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj2", field: "nWgtCpSj2", headerName: "成品重量", width: 112 },
  { colId: "nRateLl2", field: "nRateLl2", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj2", field: "nRateSj2", headerName: "实际成材率", width: 112 },
  { colId: "nQuaSjSlab4", field: "nQuaSjSlab4", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp4", field: "nQuaSjCp4", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj4", field: "nFurWgtSj4", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl4", field: "nWgtLl4", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj4", field: "nWgtCpSj4", headerName: "成品重量", width: 112 },
  { colId: "nRateLl4", field: "nRateLl4", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj4", field: "nRateSj4", headerName: "实际成材率", width: 112 },
  { colId: "nQuaSjSlab0", field: "nQuaSjSlab0", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp0", field: "nQuaSjCp0", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj0", field: "nFurWgtSj0", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl0", field: "nWgtLl0", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj0", field: "nWgtCpSj0", headerName: "成品重量", width: 112 },
  { colId: "nRateLl0", field: "nRateLl0", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj0", field: "nRateSj0", headerName: "实际成材率", width: 112 },
  { colId: "nFurWgtSj", field: "nFurWgtSj", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl", field: "nWgtLl", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj", field: "nWgtCpSj", headerName: "成品重量", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 112 },
  { colId: "nWgtZjb", field: "nWgtZjb", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb0", field: "nWgtZjb0", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb2", field: "nWgtZjb2", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb4", field: "nWgtZjb4", headerName: "质计部重量", width: 150 },
  { colId: "nRateZjb", field: "nRateZjb", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb0", field: "nRateZjb0", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb2", field: "nRateZjb2", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb4", field: "nRateZjb4", headerName: "质计部成材率", width: 150 },
  { colId: "nQuaSjSlabRate0", field: "nQuaSjSlabRate0", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate2", field: "nQuaSjSlabRate2", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate4", field: "nQuaSjSlabRate4", headerName: "钢坯支数比例", width: 112 },
  { colId: "nRollWgtSj2", field: "nRollWgtSj2", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj4", field: "nRollWgtSj4", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj0", field: "nRollWgtSj0", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj", field: "nRollWgtSj", headerName: "轧制坯重", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "nOrderThick", field: "nOrderThick", headerName: "厚度", width: 112 },
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "钢坯总支数", width: 112 },
  { colId: "nQuaCp", field: "nQuaCp", headerName: "成品总支数", width: 112 },
  { colId: "nQuaSjSlab2", field: "nQuaSjSlab2", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp2", field: "nQuaSjCp2", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj2", field: "nFurWgtSj2", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtCpSj2", field: "nWgtCpSj2", headerName: "成品重量", width: 112 },
  { colId: "nRateLl2", field: "nRateLl2", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj2", field: "nRateSj2", headerName: "实际成材率", width: 112 },
  { colId: "nWgtLl2", field: "nWgtLl2", headerName: "理论重量", width: 112 },
  { colId: "nQuaSjSlab4", field: "nQuaSjSlab4", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp4", field: "nQuaSjCp4", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj4", field: "nFurWgtSj4", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtCpSj4", field: "nWgtCpSj4", headerName: "成品重量", width: 112 },
  { colId: "nRateLl4", field: "nRateLl4", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj4", field: "nRateSj4", headerName: "实际成材率", width: 112 },
  { colId: "nWgtLl4", field: "nWgtLl4", headerName: "理论重量", width: 112 },
  { colId: "nQuaSjSlab0", field: "nQuaSjSlab0", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp0", field: "nQuaSjCp0", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj0", field: "nFurWgtSj0", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtCpSj0", field: "nWgtCpSj0", headerName: "成品重量", width: 112 },
  { colId: "nRateLl0", field: "nRateLl0", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj0", field: "nRateSj0", headerName: "实际成材率", width: 112 },
  { colId: "nWgtLl0", field: "nWgtLl0", headerName: "理论重量", width: 112 },
  { colId: "nFurWgtSj", field: "nFurWgtSj", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtCpSj", field: "nWgtCpSj", headerName: "成品重量", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 112 },
  { colId: "nWgtLl", field: "nWgtLl", headerName: "理论重量", width: 112 },
  { colId: "nWgtZjb", field: "nWgtZjb", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb0", field: "nWgtZjb0", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb2", field: "nWgtZjb2", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb4", field: "nWgtZjb4", headerName: "质计部重量", width: 150 },
  { colId: "nRateZjb", field: "nRateZjb", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb0", field: "nRateZjb0", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb2", field: "nRateZjb2", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb4", field: "nRateZjb4", headerName: "质计部成材率", width: 150 },
  { colId: "nQuaSjSlabRate0", field: "nQuaSjSlabRate0", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate2", field: "nQuaSjSlabRate2", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate4", field: "nQuaSjSlabRate4", headerName: "钢坯支数比例", width: 112 },
  { colId: "nRollWgtSj2", field: "nRollWgtSj2", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj4", field: "nRollWgtSj4", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj0", field: "nRollWgtSj0", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj", field: "nRollWgtSj", headerName: "轧制坯重", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "nOrderThick", field: "nOrderThick", headerName: "厚度", width: 112 },
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "钢坯总支数", width: 112 },
  { colId: "nQuaCp", field: "nQuaCp", headerName: "成品总支数", width: 112 },
  { colId: "nQuaSjSlab2", field: "nQuaSjSlab2", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp2", field: "nQuaSjCp2", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj2", field: "nFurWgtSj2", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtCpSj2", field: "nWgtCpSj2", headerName: "成品重量", width: 112 },
  { colId: "nRateLl2", field: "nRateLl2", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj2", field: "nRateSj2", headerName: "实际成材率", width: 112 },
  { colId: "nWgtLl2", field: "nWgtLl2", headerName: "理论重量", width: 112 },
  { colId: "nQuaSjSlab4", field: "nQuaSjSlab4", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp4", field: "nQuaSjCp4", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj4", field: "nFurWgtSj4", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtCpSj4", field: "nWgtCpSj4", headerName: "成品重量", width: 112 },
  { colId: "nRateLl4", field: "nRateLl4", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj4", field: "nRateSj4", headerName: "实际成材率", width: 112 },
  { colId: "nWgtLl4", field: "nWgtLl4", headerName: "理论重量", width: 112 },
  { colId: "nQuaSjSlab0", field: "nQuaSjSlab0", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp0", field: "nQuaSjCp0", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj0", field: "nFurWgtSj0", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtCpSj0", field: "nWgtCpSj0", headerName: "成品重量", width: 112 },
  { colId: "nRateLl0", field: "nRateLl0", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj0", field: "nRateSj0", headerName: "实际成材率", width: 112 },
  { colId: "nWgtLl0", field: "nWgtLl0", headerName: "理论重量", width: 112 },
  { colId: "nFurWgtSj", field: "nFurWgtSj", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtCpSj", field: "nWgtCpSj", headerName: "成品重量", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 112 },
  { colId: "nWgtLl", field: "nWgtLl", headerName: "理论重量", width: 112 },
  { colId: "nWgtZjb", field: "nWgtZjb", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb0", field: "nWgtZjb0", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb2", field: "nWgtZjb2", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb4", field: "nWgtZjb4", headerName: "质计部重量", width: 150 },
  { colId: "nRateZjb", field: "nRateZjb", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb0", field: "nRateZjb0", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb2", field: "nRateZjb2", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb4", field: "nRateZjb4", headerName: "质计部成材率", width: 150 },
  { colId: "nQuaSjSlabRate0", field: "nQuaSjSlabRate0", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate2", field: "nQuaSjSlabRate2", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate4", field: "nQuaSjSlabRate4", headerName: "钢坯支数比例", width: 112 },
  { colId: "nRollWgtSj2", field: "nRollWgtSj2", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj4", field: "nRollWgtSj4", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj0", field: "nRollWgtSj0", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj", field: "nRollWgtSj", headerName: "轧制坯重", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "group", field: "group", headerName: "班组", width: 112 },
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "钢坯总支数", width: 112 },
  { colId: "nQuaCp", field: "nQuaCp", headerName: "成品总支数", width: 112 },
  { colId: "nQuaSjSlab2", field: "nQuaSjSlab2", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp2", field: "nQuaSjCp2", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj2", field: "nFurWgtSj2", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl2", field: "nWgtLl2", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj2", field: "nWgtCpSj2", headerName: "成品重量", width: 112 },
  { colId: "nRateLl2", field: "nRateLl2", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj2", field: "nRateSj2", headerName: "实际成材率", width: 112 },
  { colId: "nQuaSjSlab4", field: "nQuaSjSlab4", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp4", field: "nQuaSjCp4", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj4", field: "nFurWgtSj4", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl4", field: "nWgtLl4", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj4", field: "nWgtCpSj4", headerName: "成品重量", width: 112 },
  { colId: "nRateLl4", field: "nRateLl4", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj4", field: "nRateSj4", headerName: "实际成材率", width: 112 },
  { colId: "nQuaSjSlab0", field: "nQuaSjSlab0", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp0", field: "nQuaSjCp0", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj0", field: "nFurWgtSj0", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl0", field: "nWgtLl0", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj0", field: "nWgtCpSj0", headerName: "成品重量", width: 112 },
  { colId: "nRateLl0", field: "nRateLl0", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj0", field: "nRateSj0", headerName: "实际成材率", width: 112 },
  { colId: "nFurWgtSj", field: "nFurWgtSj", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl", field: "nWgtLl", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj", field: "nWgtCpSj", headerName: "成品重量", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 112 },
  { colId: "nWgtZjb", field: "nWgtZjb", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb0", field: "nWgtZjb0", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb2", field: "nWgtZjb2", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb4", field: "nWgtZjb4", headerName: "质计部重量", width: 150 },
  { colId: "nRateZjb", field: "nRateZjb", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb0", field: "nRateZjb0", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb2", field: "nRateZjb2", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb4", field: "nRateZjb4", headerName: "质计部成材率", width: 150 },
  { colId: "nQuaSjSlabRate0", field: "nQuaSjSlabRate0", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate2", field: "nQuaSjSlabRate2", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate4", field: "nQuaSjSlabRate4", headerName: "钢坯支数比例", width: 112 },
  { colId: "nRollWgtSj2", field: "nRollWgtSj2", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj4", field: "nRollWgtSj4", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj0", field: "nRollWgtSj0", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj", field: "nRollWgtSj", headerName: "轧制坯重", width: 112, hide: true },,
  ],*/
  /*[
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "钢坯总支数", width: 112 },
  { colId: "nQuaCp", field: "nQuaCp", headerName: "成品总支数", width: 112 },
  { colId: "nQuaSjSlab2", field: "nQuaSjSlab2", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp2", field: "nQuaSjCp2", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj2", field: "nFurWgtSj2", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl2", field: "nWgtLl2", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj2", field: "nWgtCpSj2", headerName: "成品重量", width: 112 },
  { colId: "nRateLl2", field: "nRateLl2", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj2", field: "nRateSj2", headerName: "实际成材率", width: 112 },
  { colId: "nQuaSjSlab4", field: "nQuaSjSlab4", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp4", field: "nQuaSjCp4", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj4", field: "nFurWgtSj4", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl4", field: "nWgtLl4", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj4", field: "nWgtCpSj4", headerName: "成品重量", width: 112 },
  { colId: "nRateLl4", field: "nRateLl4", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj4", field: "nRateSj4", headerName: "实际成材率", width: 112 },
  { colId: "nQuaSjSlab0", field: "nQuaSjSlab0", headerName: "钢坯支数", width: 112 },
  { colId: "nQuaSjCp0", field: "nQuaSjCp0", headerName: "成品支数", width: 112 },
  { colId: "nFurWgtSj0", field: "nFurWgtSj0", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl0", field: "nWgtLl0", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj0", field: "nWgtCpSj0", headerName: "成品重量", width: 112 },
  { colId: "nRateLl0", field: "nRateLl0", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj0", field: "nRateSj0", headerName: "实际成材率", width: 112 },
  { colId: "nFurWgtSj", field: "nFurWgtSj", headerName: "入炉坯重", width: 112 },
  { colId: "nWgtLl", field: "nWgtLl", headerName: "理论重量", width: 112 },
  { colId: "nWgtCpSj", field: "nWgtCpSj", headerName: "成品重量", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 112 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 112 },
  { colId: "nWgtZjb", field: "nWgtZjb", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb0", field: "nWgtZjb0", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb2", field: "nWgtZjb2", headerName: "质计部重量", width: 150 },
  { colId: "nWgtZjb4", field: "nWgtZjb4", headerName: "质计部重量", width: 150 },
  { colId: "nRateZjb", field: "nRateZjb", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb0", field: "nRateZjb0", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb2", field: "nRateZjb2", headerName: "质计部成材率", width: 150 },
  { colId: "nRateZjb4", field: "nRateZjb4", headerName: "质计部成材率", width: 150 },
  { colId: "nQuaSjSlabRate0", field: "nQuaSjSlabRate0", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate2", field: "nQuaSjSlabRate2", headerName: "钢坯支数比例", width: 112 },
  { colId: "nQuaSjSlabRate4", field: "nQuaSjSlabRate4", headerName: "钢坯支数比例", width: 112 },
  { colId: "dDateTime", field: "dDateTime", headerName: "日期", width: 112 },
  { colId: "nRollWgtSj2", field: "nRollWgtSj2", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj4", field: "nRollWgtSj4", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj0", field: "nRollWgtSj0", headerName: "轧制坯重", width: 112, hide: true },
  { colId: "nRollWgtSj", field: "nRollWgtSj", headerName: "轧制坯重", width: 112, hide: true },,
  ],*/
];
const activeTab = ref(0);
const tabMethods = [
  hR4810Api.get4810CclHzDtos,
  hR4810Api.get4810CclSgCodeHzDtos,
  hR4810Api.get4810CclThickHzDtos,
  hR4810Api.get4810CclGroupHzDtos,
  hR4810Api.get4810CclDayHzDtos,
];
const hzRows = shallowRef<Thr4810CclHzDto[]>([]);

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryThr4810 = {
      timeRange: toTimeRange(input.dates),
      cPieceNoSlab: input.cPieceNoSlab.trim() || null,
      cPieceNo: input.cPieceNo.trim() || null,
      cShiftGroup: input.cShiftGroup,
      cTrimFlag: input.cTrimFlag,
      cSgCode: input.cSgCode.trim() || null,
    };
    rows.value = (await hR4810Api.get4810Dtos(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    // 原 ViewControl.Completed → 清空班组/切边方式
    input.cShiftGroup = null;
    input.cTrimFlag = null;
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
  await hzBind();
}

async function hzBind() {
  hzLoading.value = true;
  try {
    // 原过滤：成品重/炉重/理重/矫直板重 均 ≥0（空值排除）
    const hzlist = rows.value.filter(
      (x) =>
        typeof x.nWgtCp === "number" && x.nWgtCp >= 0 &&
        typeof x.nWgtFur === "number" && x.nWgtFur >= 0 &&
        typeof x.nWgtLl === "number" && x.nWgtLl >= 0 &&
        typeof x.nWgtZjb === "number" && x.nWgtZjb >= 0,
    );
    if (hzlist.length <= 0) { hzRows.value = []; return; }
    const fn = tabMethods[activeTab.value] ?? tabMethods[0];
    hzRows.value = (await fn(hzlist)) ?? [];
    requestAnimationFrame(() => hzApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    hzLoading.value = false;
  }
}

function onTabChange(v: string | number) {
  activeTab.value = Number(v);
  void hzBind();
}

onMounted(async () => {
  try {
    const [g, t] = await Promise.all([
      systemKeyValueApi.getSysKvListByGroup("A0000:THR_GROUP") ?? [],
      systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG") ?? [],
    ]);
    groupOptions.value = (g).map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    trimOptions.value = (t).map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.cPieceNoSlab" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班组</label>
        <Select v-model="input.cShiftGroup" :options="groupOptions" option-label="label" option-value="value"
          class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">切边方式</label>
        <Select v-model="input.cTrimFlag" :options="trimOptions" option-label="label" option-value="value"
          class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
        <DatePicker v-model="input.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs font-medium text-muted-foreground">明细信息</span>
      </div>
      <div class="min-h-0 flex-[4] overflow-hidden">
        <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
          :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
          :animate-rows="false" :loading="loading" @grid-ready="onReady"
          @first-data-rendered="autoSizeOnFirstData" />
      </div>
      <div class="flex h-8 shrink-0 items-center gap-2 border-t border-border/60 border-b border-border/60 px-2">
        <span class="text-xs font-medium text-muted-foreground">成材率汇总</span>
      </div>
      <Tabs :value="activeTab" class="flex min-h-0 flex-[6] flex-col" @update:value="onTabChange">
        <TabList>
          <Tab :value="0">每日班组汇总</Tab>
          <Tab :value="1">钢种汇总</Tab>
          <Tab :value="2">厚度汇总</Tab>
          <Tab :value="3">班组汇总</Tab>
          <Tab :value="4">每日汇总</Tab>
        </TabList>
        <TabPanels class="min-h-0 flex-1">
          <TabPanel v-for="i in [0, 1, 2, 3, 4]" :key="i" :value="i" class="h-full p-0">
            <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
              :default-col-def="hmxDefaultColDef" :column-defs="hzCols[activeTab] ?? []" :row-data="hzRows" :pagination="false"
              :animate-rows="false" :loading="hzLoading" @grid-ready="onHzReady"
              @first-data-rendered="autoSizeOnFirstData" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 对应 FrmMS9001（二炼钢3#连铸坯料计划匹配）：DDH.Winforms.SMS.Forms.FrmMS9001
 *  已接入：tms9001Api.getPlans（btnQueryPlan → LoadPlan——计划查询 + 状态内存过滤(Y=IsFullMatch/N=!IsFullMatch)
 *          + 计划明细客户端展开（OrderBy(NOrder).Range(1,Max(计划块数-库存坯数量, 已匹配块数))，NNum 标记位照抄））
 *          + tms9001Api.getStorages（btnQueryStorage/机台变更 → LoadStorage）
 *          + tms9001Api.mathPlanAndZp（匹配/强制匹配 Match(isAllow)：勾选未匹配材料+焦点计划——
 *            拦截「请选择未匹配的材料」「请选择计划后再操作」、超量「已超量{已匹配+勾选}/{计划块数-库存坯数量}，不允许操作」、
 *            确认「确认匹配计划？数量{n}\n{计划 ToString}」照抄；StorageMatchPlanRule 前端规则未迁（Hmx 规则库，交后端校验））
 *          + tms9001Api.cancelMathPlanAndZp（取消匹配：勾选已匹配材料 →「请选择已匹配的材料」/
 *            已投料拦截 → 取消原因 prompt「取消{n}支,请选择取消原因」「请选择取消原因」照抄）
 *          + tms3000Api.delSjByPieceNo（删除坯料：勾选/投料/已匹配拦截 +「确认删除实绩？数量{n}」照抄）
 *          + 按计划查（焦点计划 → 钢种/长度/宽度/厚度区间回填 + 重查库存）、清空条件查询（清六项 + 重查）
 *  查询条件：上=计划（提料钢种/计划宽度/计划长度/计划厚度/计划状态[全部|未完成N|已完成Y]/时间/计划号/轧制厚度/销售订单号/提料订单号）、
 *            下=坯料（产出时间/炉号/铸坯号/钢种/长度/宽度/厚度/机台下拉）
 *  结构：原 splitContainerControl1 Horizontal=false SplitterPosition=305≈上40%（上=计划表，下=坯料表+11 按钮）、
 *        右=原 navigationPane「计划明细」（原默认收起 State=Collapsed，web 常驻右栏——已知偏差）、明细行 NNum==0 删除线+信息蓝照 GridView.FormatRule
 *        gvPlan 行底色：Percent>=1 绿色半透（原 gridFormatRule1）
 *  cQueryString：JSON {LineCode,MachineCode,LineCode_ZG}——原 HandleQueryString 缺参抛「界面必须配置注入参数…」，web 侧缺参字段透传 undefined（同 MS9010）
 *  二级弹窗占位：坯料修改 FrmMS9002（校验+挂单确认照抄后占位）、坯料补录 FrmMS9003（原判空分支不可达，恒开弹窗→占位）
 *  待接入：标记异常坯/取消异常坯（setException/cancelException swagger 未生成 + 异常类型字典弹窗占位，校验与「确认取消？」照抄）；
 *          取消原因字典（原 QuerySysKvItemList(CANCEL_MATCH_REASON)→prompt 复刻，选项字典待补）；
 *          机台下拉原 UCMachine→tpa1000.queryMachine 未生成，改用同域 getFactoryLineAreaMachine_LG
 *  字段桥接：extract PascalCase → 后端 camelCase（列头按绑定实体 LDisplay——extract 对本窗体两个 Service 内 DTO 的列头被全局字典污染，已逐列校正）
 *  列：计划 25 可见+5 隐藏 / 坯料 29 可见+16 隐藏 / 明细 5 可见+1 隐藏 */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import RangeInput from "@/components/common/RangeInput.vue";
import { tms9001Api, tms3000Api, publicFactoryLineAreaMachineApi } from "@/api/mes4ddh/sms.swagger";
import { InventoryStatusEnum } from "@/api/mes4ddh/syd.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs, json: menuJson } = useMenuQuery();
/** 原 FrmMS9001QueryStringDto：{LineCode,MachineCode,LineCode_ZG}（原缺参/坏 JSON 抛异常，web 侧透传 undefined） */
const qsDto = menuJson as { LineCode?: string; MachineCode?: string; LineCode_ZG?: string };

type TimeRange = { min?: string; max?: string };
type DecimalRange = { min?: number | null; max?: number | null };

const theme = makeHmxGridTheme();
const planLoading = ref(false);
const storageLoading = ref(false);
const planApi = ref<GridApi | null>(null);
const storageApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);
type Row = Record<string, unknown>;
const planRows = ref<Row[]>([]);
const storageRows = ref<Row[]>([]);
const detailRows = ref<Row[]>([]);
const focusedPlan = ref<Row | null>(null);
const focusedStorage = ref<Row | null>(null);

function W(h: string) { return h.length * 13 + 60; }
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown): string {
  return v == null ? "" : String(v);
}
/** 勾选（原 Selected；后端 JSON camelCase，行内回写 selected） */
function picked(r: Row): boolean {
  return Boolean(r.selected ?? r.Selected);
}

/* ===== 计划表 gvPlan（绑定 Tms9000PlanItemDto，25 可见 + 5 隐藏；列头=实体 LDisplay） ===== */
const planCols = ref<ColDef[]>([
  { field: "nOrder", headerName: "顺序号", width: W("顺序号") },
  { field: "planNo", headerName: "提料订单号", width: W("提料订单号") },
  { field: "planTime", headerName: "计划号", width: W("计划号") },
  { field: "cSgCodeTl", headerName: "提料钢种", width: W("提料钢种") },
  { field: "sgStd", headerName: "执行标准", width: W("执行标准") },
  { field: "thick", headerName: "提料厚度", width: W("提料厚度") },
  { field: "width", headerName: "提料宽度", width: W("提料宽度") },
  { field: "lengthMin", headerName: "提料长度", width: W("提料长度") },
  { field: "numStr", headerName: "匹配情况", width: W("匹配情况") },
  { field: "percent", headerName: "完成率", width: W("完成率") },
  { field: "nNum", headerName: "已匹配块数", width: W("已匹配块数") },
  { field: "nNeedNum", headerName: "需求块数", width: W("需求块数") },
  { field: "nPlanNum", headerName: "计划块数", width: W("计划块数") },
  { field: "nStorageNum", headerName: "库存坯数量", width: W("库存坯数量") },
  { field: "zZThick", headerName: "轧制厚度", width: W("轧制厚度") },
  { field: "zZWidth", headerName: "轧制宽度", width: W("轧制宽度") },
  { field: "cTrimFlag", headerName: "切边方式", width: W("切边方式") },
  { field: "cSaleOrderNo1", headerName: "订单1", width: W("订单1") },
  { field: "cSaleOrderNo2", headerName: "订单2", width: W("订单2") },
  { field: "cSaleOrderNo3", headerName: "订单3", width: W("订单3") },
  { field: "cSaleOrderNo4", headerName: "订单4", width: W("订单4") },
  { field: "nLenPlan1", headerName: "套切长度1", width: W("套切长度1") },
  { field: "nLenPlan2", headerName: "套切长度2", width: W("套切长度2") },
  { field: "nLenPlan3", headerName: "套切长度3", width: W("套切长度3") },
  { field: "nLenPlan4", headerName: "套切长度4", width: W("套切长度4") },
  /* 隐藏（实体无该字段的按 extract 记录收头） */
  { field: "sgCode", headerName: "钢种", hide: true },
  { field: "nStatus", headerName: "计划状态", hide: true },
  { field: "cSteelType", headerName: "钢种大类", hide: true },
  { field: "cSaleOrderNo", headerName: "CSaleOrderNo", hide: true },
  { field: "nLenPlan", headerName: "轧制长度", hide: true },
  /* gvPlan 行底色：原 gridFormatRule1 Percent>=1 → 绿色半透 */
  { field: "isFullMatch", headerName: "是否完成", hide: true },
] as ColDef[]);
const planRowClassRules = {
  "bg-emerald-100/60": (p: { data?: Row }) => num(p.data?.percent) >= 1,
};

/* ===== 坯料表 gvStorage（绑定 Tms9000StorageItemDto，29 可见 + 16 隐藏；列头=实体 LDisplay） ===== */
const storageCols = ref<ColDef[]>([
  { field: "selected", headerName: "选择", width: 64, minWidth: 64, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false },
  { field: "mathStatus", headerName: "匹配状态", width: W("匹配状态") },
  { field: "cPieceNo", headerName: "铸坯号", width: 54 },
  { field: "dProTime", headerName: "产出时间", width: 74 },
  { field: "cStove", headerName: "炉号", width: 54 },
  { field: "cStrandNo", headerName: "流号", width: 54 },
  { field: "cSgCode", headerName: "钢种", width: 54 },
  { field: "nThick", headerName: "厚度", width: 54 },
  { field: "nWth", headerName: "宽度", width: 54 },
  { field: "nLen", headerName: "长度", width: 54 },
  { field: "cOrderNo", headerName: "订单号", width: 54 },
  { field: "cBilletTypeCode", headerName: "铸坯标识", width: 82 },
  { field: "cPrintCode", headerName: "喷号", width: 48 },
  { field: "nStatus", headerName: "入库状态", width: 60 },
  { field: "cProRemark", headerName: "生产备注", width: 53 },
  { field: "cSurfaceResult", headerName: "表检结果", width: W("表检结果") },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: W("表面缺陷代码") },
  { field: "nQmStatus", headerName: "质量状态", width: W("质量状态") },
  { field: "nLockReason", headerName: "质量封锁原因", width: W("质量封锁原因") },
  { field: "zZThick", headerName: "轧制厚度", width: W("轧制厚度") },
  { field: "zZWidth", headerName: "轧制宽度", width: W("轧制宽度") },
  { field: "cSaleOrderNo1", headerName: "订单1", width: W("订单1") },
  { field: "cSaleOrderNo2", headerName: "订单2", width: W("订单2") },
  { field: "cSaleOrderNo3", headerName: "订单3", width: W("订单3") },
  { field: "cSaleOrderNo4", headerName: "订单4", width: W("订单4") },
  { field: "nLenPlan1", headerName: "套切长度1", width: W("套切长度1") },
  { field: "nLenPlan2", headerName: "套切长度2", width: W("套切长度2") },
  { field: "nLenPlan3", headerName: "套切长度3", width: W("套切长度3") },
  { field: "nLenPlan4", headerName: "套切长度4", width: W("套切长度4") },
  /* 隐藏 16 列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cLineCode", headerName: "产线", hide: true },
  { field: "cMachine", headerName: "机台号", hide: true },
  { field: "cPlanId", headerName: "计划号", hide: true },
  { field: "cSgStd", headerName: "执行标准", hide: true },
  { field: "cSpec", headerName: "规格", hide: true },
  { field: "nNum", headerName: "支数", hide: true },
  { field: "nWgt", headerName: "重量", hide: true },
  { field: "cConfirmStatus", headerName: "确认判定状态", hide: true },
  { field: "cIsHot", headerName: "热送区分", hide: true },
  { field: "cSaleOrderNo", headerName: "CSaleOrderNo", hide: true },
  { field: "nLenPlan", headerName: "轧制长度", hide: true },
] as ColDef[]);

/* ===== 计划明细表 gvPlanDetails（Tms9000PlanItemDto，5 可见 + NNum 隐藏） ===== */
const detailCols = ref<ColDef[]>([
  { field: "cSgCodeTl", headerName: "提料钢种", width: W("提料钢种") },
  { field: "lengthMin", headerName: "提料长度", width: W("提料长度") },
  { field: "thick", headerName: "提料厚度", width: W("提料厚度") },
  { field: "width", headerName: "提料宽度", width: W("提料宽度") },
  { field: "planNo", headerName: "提料订单号", width: W("提料订单号") },
  { field: "nNum", headerName: "已匹配块数", hide: true },
] as ColDef[]);
/* 原 gridFormatRule3：ApplyToRow、colNNum==0 → 删除线 + Information 蓝 */
const detailRowClassRules = {
  "font-bold line-through text-sky-600": (p: { data?: Row }) => num(p.data?.nNum) === 0,
};

/* ===== 查询条件 ===== */
function dayAt(offset: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
}
/* 计划查询（原 dataLayoutControl1；Load 默认时间=前天~今天） */
const pq = reactive({
  sgCode: "",
  widthMin: null as number | null,
  widthMax: null as number | null,
  lenMin: null as number | null,
  lenMax: null as number | null,
  thickMin: null as number | null,
  thickMax: null as number | null,
  status: null as string | null,
  dates: [dayAt(-2), dayAt(0)] as Date[] | null,
  planNo: "",
  zzThickMin: null as number | null,
  zzThickMax: null as number | null,
  saleOrder: "",
  tlOrder: "",
});
/* 坯料查询（原 dataLayoutControl2；Load 默认产出时间=今天~明天） */
const sq = reactive({
  dates: [dayAt(0), dayAt(1)] as Date[] | null,
  stove: "",
  pieceNo: "",
  sgCode: "",
  lenMin: null as number | null,
  lenMax: null as number | null,
  wthMin: null as number | null,
  wthMax: null as number | null,
  thickMin: null as number | null,
  thickMax: null as number | null,
  machine: null as string | null,
});

/* 计划状态（原 cmbStatus 下拉：全部=null|未完成=N|已完成=Y，过滤在 LoadPlan 客户端 WhereIf） */
const statusOptions = [
  { label: "全部", value: null },
  { label: "未完成", value: "N" },
  { label: "已完成", value: "Y" },
];

/* 机台下拉（原 UCMachine：LineCode 过滤 + ShowMachines=[qs.MachineCode] 只显注入机台 + SelectedIndex=0；
   数据源原 tpa1000.queryMachine 未生成 → 同域 getFactoryLineAreaMachine_LG，缺匹配时补注入机台兜底） */
const machineOptions = ref<{ label: string; value: string }[]>([]);

type MachRaw = {
  machineCode?: string; machineName?: string; lineCode?: string;
  cCode?: string; cName?: string;
};
async function loadMachines() {
  try {
    const list = ((await publicFactoryLineAreaMachineApi.getFactoryLineAreaMachine_LG()) ?? []) as MachRaw[];
    let opts = list
      .map((x) => ({ value: x.machineCode ?? x.cCode ?? "", label: x.machineName ?? x.cName ?? x.machineCode ?? x.cCode ?? "", lineCode: x.lineCode }))
      .filter((o) => o.value)
      .filter((o) => !(qsDto.LineCode && o.lineCode != null) || o.lineCode === qsDto.LineCode)
      .sort((a, b) => a.value.localeCompare(b.value));
    if (qsDto.MachineCode) {
      /* ShowMachines 注入过滤：只显注入机台 */
      const hit = opts.filter((o) => o.value === qsDto.MachineCode);
      opts = hit.length ? hit : [{ value: qsDto.MachineCode, label: qsDto.MachineCode, lineCode: undefined }];
    }
    machineOptions.value = opts;
    sq.machine = opts[0]?.value ?? null; /* SelectedIndex=0 */
  } catch { /* 拦截层已 toast */ }
}

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}
function decRange(lo: number | null, hi: number | null): DecimalRange {
  return { min: lo, max: hi };
}

function readyPlan(e: GridReadyEvent) { planApi.value = e.api; }
function readyStorage(e: GridReadyEvent) { storageApi.value = e.api; }
function readyDetail(e: GridReadyEvent) { detailApi.value = e.api; }
function autosize(api: GridApi | null) { requestAnimationFrame(() => api?.autoSizeAllColumns()); }
function onPlanRowClicked(e: { data?: Row }) { if (e.data) focusedPlan.value = e.data; }
function onStorageRowClicked(e: { data?: Row }) { if (e.data) focusedStorage.value = e.data; }

/** 原 IsFullMatch（实体计算属性；后端缺省时按公式兜底） */
function isFullMatch(r: Row): boolean {
  if (typeof r.isFullMatch === "boolean") return r.isFullMatch;
  return num(r.nNum) >= num(r.nPlanNum) - num(r.nStorageNum);
}

/** 原 btnQueryPlan_Click → LoadPlan：getPlans + 状态 WhereIf + 明细客户端展开 */
async function loadPlan() {
  planLoading.value = true;
  try {
    const input = {
      sgCode: pq.sgCode.trim() || undefined,
      timeRange: toTimeRange(pq.dates),
      widthRange: decRange(pq.widthMin, pq.widthMax),
      lenRange: decRange(pq.lenMin, pq.lenMax),
      planThickRange: decRange(pq.thickMin, pq.thickMax),
      zZThickRange: decRange(pq.zzThickMin, pq.zzThickMax),
      planNo: pq.planNo.trim() || undefined,
      tlOrderNo: pq.tlOrder.trim() || undefined,
      saleOrderNo: pq.saleOrder.trim() || undefined,
      lineCode_ZG: qsDto.LineCode_ZG,
      lineCode_LG: qsDto.LineCode,
      machineCode: qsDto.MachineCode,
    };
    let plans = ((await tms9001Api.getPlans(input)) ?? []) as Row[];
    /* 执行情况内存筛选（原 WhereIf(status==Y/N, IsFullMatch)） */
    if (pq.status === "Y") plans = plans.filter((x) => isFullMatch(x));
    else if (pq.status === "N") plans = plans.filter((x) => !isFullMatch(x));
    planRows.value = plans;
    focusedPlan.value = plans[0] ?? null; /* 原 gvPlan.SelectRow(FocusedRowHandle) */
    autosize(planApi.value);

    /* 计划明细（照 .cs：OrderBy(NOrder) → Range(1, Max(计划块数-库存坯数量, 已匹配块数))，NNum 标记 = w > 已匹配块数 ? 1 : 0） */
    const details: Row[] = [...plans]
      .sort((a, b) => num(a.nOrder) - num(b.nOrder))
      .flatMap((l) => {
        const count = Math.max(num(l.nPlanNum) - num(l.nStorageNum), num(l.nNum));
        return Array.from({ length: Math.max(0, count) }, (_, i) => {
          const w = i + 1;
          return {
            cSgCodeTl: l.cSgCodeTl,
            lengthMin: l.lengthMin,
            thick: l.thick,
            width: l.width,
            planNo: l.planNo,
            nNum: w > num(l.nNum) ? 1 : 0,
          };
        });
      });
    detailRows.value = details;
    autosize(detailApi.value);
  } finally {
    planLoading.value = false;
  }
}

/** 原 btnQueryStorage_Click / ucMachine1_EditValueChanged → LoadStorage */
async function loadStorage() {
  storageLoading.value = true;
  try {
    const input = {
      timeRange: toTimeRange(sq.dates),
      stove: sq.stove.trim() || undefined,
      pieceNo: sq.pieceNo.trim() || undefined,
      sgCode: sq.sgCode.trim() || undefined,
      lenRange: decRange(sq.lenMin, sq.lenMax),
      wthRange: decRange(sq.wthMin, sq.wthMax),
      thickRange: decRange(sq.thickMin, sq.thickMax),
      lineCode: qsDto.LineCode,
      machineCode: sq.machine ?? undefined,
    };
    const rows = ((await tms9001Api.getStorages(input)) ?? []) as Row[];
    storageRows.value = rows;
    focusedStorage.value = rows[0] ?? null; /* 原 gvStorage.SelectRow(FocusedRowHandle) */
    autosize(storageApi.value);
  } finally {
    storageLoading.value = false;
  }
}

/** 原 Match(isAllow)——btnMatch / btnMatchAllow 共用；规则库校验未迁（交后端 mathPlanAndZp） */
async function match(isAllow: boolean) {
  const stor = storageRows.value.filter((w) => picked(w) && !str(w.cOrderNo ?? w.COrderNo));
  if (!stor.length) {
    toast("请选择未匹配的材料", 2500, "warn");
    return;
  }
  const plan = focusedPlan.value;
  if (!plan) {
    toast("请选择计划后再操作", 2000, "warn");
    return;
  }
  /* 原 StorageMatchPlanRule.ValidateMathPlan 未迁（Hmx 规则库）——超量检查照抄 */
  const count = stor.length;
  const total = num(plan.nNum) + count;
  const need = num(plan.nPlanNum) - num(plan.nStorageNum);
  if (total > need) {
    toast(`已超量${total}/${need}，不允许操作`, 3000, "warn");
    return;
  }
  /* 原 Tms9000PlanItemDto.ToString 照抄 */
  const desc =
    `单号：${str(plan.planNo)}\n` +
    `钢种：${str(plan.cSgCodeTl)} ${str(plan.sgStd)}\n` +
    `规格：${str(plan.thick)}*${str(plan.width)}*${str(plan.lengthMin)}`;
  if (!window.confirm(`确认匹配计划？数量${count}\n${desc}`)) return;
  const pieceNos = stor.map((w) => str(w.cPieceNo ?? w.CPieceNo));
  await tms9001Api.mathPlanAndZp({ pieceNos, matchPlanId: str(plan.id ?? plan.Id), isAllow });
  await loadStorage();
  await loadPlan();
}

/** 原 btnCancelMatch_Click：勾选已匹配材料 → 投料拦截 → 取消原因 prompt → cancelMathPlanAndZp */
async function onCancelMatch() {
  const stor = storageRows.value.filter((w) => picked(w) && str(w.cOrderNo ?? w.COrderNo));
  if (!stor.length) {
    toast("请选择已匹配的材料", 2500, "warn");
    return;
  }
  const err = [InventoryStatusEnum.ConsumeLocked, InventoryStatusEnum.Consume];
  if (stor.some((w) => err.includes(num(w.nStatus ?? w.NStatus) as InventoryStatusEnum))) {
    toast("已投料生产，不允许操作", 2500, "warn");
    return;
  }
  const reason = window.prompt(`取消${stor.length}支,请选择取消原因`, "");
  if (reason == null) return;
  if (!reason.trim()) {
    toast("请选择取消原因", 2000, "warn");
    return;
  }
  const pieceNos = stor.map((w) => str(w.cPieceNo ?? w.CPieceNo));
  await tms9001Api.cancelMathPlanAndZp({ pieceNos, reason: reason.trim() });
  await loadStorage();
  await loadPlan();
}

/** 原 btnSetPlanCondition_Click（按计划查）：焦点计划 → 条件回填 + LoadStorage */
async function queryByPlan() {
  const plan = focusedPlan.value;
  if (!plan) {
    toast("请选择计划后再操作", 2000, "warn");
    return;
  }
  sq.sgCode = str(plan.cSgCodeTl);
  const len = num(plan.lengthMin);
  const w = num(plan.width);
  const t = num(plan.thick);
  sq.lenMin = len;
  sq.lenMax = len;
  sq.wthMin = w;
  sq.wthMax = w;
  sq.thickMin = t;
  sq.thickMax = t;
  await loadStorage();
}

/** 原 btnClearQuery_Click（清空条件查询）：清六项 + LoadStorage */
async function clearAndLoad() {
  sq.sgCode = "";
  sq.lenMin = null;
  sq.lenMax = null;
  sq.wthMin = null;
  sq.wthMax = null;
  sq.thickMin = null;
  sq.thickMax = null;
  sq.stove = "";
  sq.pieceNo = "";
  await loadStorage();
}

/** 原 btnUpdate_Click（坯料修改）：焦点/库存状态/挂单拦截照抄 → FrmMS9002 二级弹窗占位 */
async function onUpdate() {
  const row = focusedStorage.value;
  if (!row) {
    toast("请选择要修改的的材料", 2000, "warn");
    return;
  }
  const st = num(row.nStatus ?? row.NStatus);
  if (st !== InventoryStatusEnum.NotIn && st !== InventoryStatusEnum.Normal) {
    toast("库存状态错误，不允许修改", 2500, "warn");
    return;
  }
  if (str(row.cOrderNo ?? row.COrderNo)) {
    if (!window.confirm("坯料已挂单，修改定尺后系统自动脱挂订单，确认继续操作？\n修改其他不受影响")) return;
  }
  /* 原 new FrmMS9002(storageItem.Clone(), autpUpdatePrint).ShowDialog() → 二级弹窗占位 */
  toast("坯料修改（FrmMS9002）二级弹窗待接入", 2500, "warn");
}

/** 原 btnAdd_Click（坯料补录）：原 `?? new()` 后判空分支不可达 → 恒开 FrmMS9003 → 占位 */
function onAdd() {
  /* 原 MsgBox「请选择任意要补录的炉次实绩信息」在 `?? new()` 后不可达，忠实保留可达行为=恒开弹窗 */
  void focusedStorage.value;
  toast("坯料补录（FrmMS9003）二级弹窗待接入", 2500, "warn");
}

/** 原 btnDeleteSJ_Click（删除坯料）：勾选/投料/已匹配三重拦截 + 确认照抄 → delSjByPieceNo */
async function onDeleteSJ() {
  const stor = storageRows.value.filter((w) => picked(w));
  if (!stor.length) {
    toast("请勾选要删除的材料", 2000, "warn");
    return;
  }
  const err = [InventoryStatusEnum.ConsumeLocked, InventoryStatusEnum.Consume];
  if (stor.some((w) => err.includes(num(w.nStatus ?? w.NStatus) as InventoryStatusEnum))) {
    toast("已投料生产，不允许操作", 2500, "warn");
    return;
  }
  if (stor.some((w) => str(w.cOrderNo ?? w.COrderNo))) {
    toast("已匹配订单，不允许操作", 2500, "warn");
    return;
  }
  if (!window.confirm(`确认删除实绩？数量${stor.length}`)) return;
  const pieceNos = stor.map((w) => str(w.cPieceNo ?? w.CPieceNo));
  await tms3000Api.delSjByPieceNo(pieceNos);
  await loadStorage();
}

/** 原 btnSetYCP_Click（标记异常坯）：三重拦截照抄；setException/异常类型字典弹窗未生成 → 校验后占位 */
function onSetYCP() {
  const stor = storageRows.value.filter((w) => picked(w));
  if (!stor.length) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  const err = [InventoryStatusEnum.ConsumeLocked, InventoryStatusEnum.Consume];
  if (stor.some((w) => err.includes(num(w.nStatus ?? w.NStatus) as InventoryStatusEnum))) {
    toast("已投料生产，不允许操作", 2500, "warn");
    return;
  }
  if (stor.some((w) => str(w.cOrderNo ?? w.COrderNo))) {
    toast("已匹配订单，不允许操作", 2500, "warn");
    return;
  }
  /* 原 QuerySysKvItemList("A0000:SLAB_EXCEPTION") + CheckedComboBox 弹窗 + Proxy.SetException —— 待接入 */
  toast("标记异常坯：异常类型弹窗与 setException 接口待接入", 2500, "warn");
}

/** 原 btnCancelYCP_Click（取消异常坯）：四重拦截 +「确认取消？」照抄；cancelException 接口未生成 → 占位 */
function onCancelYCP() {
  const stor = storageRows.value.filter((w) => picked(w));
  if (!stor.length) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  if (stor.some((w) => str(w.cBilletTypeCode ?? w.CBilletTypeCode) !== "Y")) {
    toast("请选择异常坯后再操作", 2500, "warn");
    return;
  }
  const err = [InventoryStatusEnum.ConsumeLocked, InventoryStatusEnum.Consume];
  if (stor.some((w) => err.includes(num(w.nStatus ?? w.NStatus) as InventoryStatusEnum))) {
    toast("已投料生产，不允许操作", 2500, "warn");
    return;
  }
  if (stor.some((w) => str(w.cOrderNo ?? w.COrderNo))) {
    toast("已匹配订单，不允许操作", 2500, "warn");
    return;
  }
  if (!window.confirm("确认取消？")) return;
  /* 原 Proxy.CancelException —— swagger 未生成 → 待接入 */
  toast("取消异常坯：cancelException 接口待接入", 2500, "warn");
}

/** 机台变更 → 原 ucMachine1_EditValueChanged → LoadStorage */
function onMachineChange() {
  void loadStorage();
}

onMounted(() => {
  void loadMachines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 主区 | 右侧计划明细（原 splitContainerControl1 + navigationPane Dock=Right） -->
    <Splitter layout="horizontal" class="min-h-0 flex-1">
      <SplitterPanel :size="74" :minSize="50" class="flex flex-col overflow-hidden">
        <!-- 上下分栏（原 splitContainerControl1 Horizontal=false SplitterPosition=305 ≈ 上40%） -->
        <Splitter layout="vertical" class="min-h-0 flex-1">
          <!-- 上：计划查询 + 查询按钮 + 计划表 -->
          <SplitterPanel :size="40" :minSize="20" class="flex flex-col overflow-hidden">
            <!-- 计划查询条件（原 dataLayoutControl1 10 项；时间占第二行首两列） -->
            <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-2 py-1.5">
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">提料钢种</label>
                <InputText v-model="pq.sgCode" class="min-w-0 flex-1" @keydown.enter="loadPlan" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">计划宽度</label>
                <RangeInput v-model:min="pq.widthMin" v-model:max="pq.widthMax" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">计划长度</label>
                <RangeInput v-model:min="pq.lenMin" v-model:max="pq.lenMax" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">计划厚度</label>
                <RangeInput v-model:min="pq.thickMin" v-model:max="pq.thickMax" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">计划状态</label>
                <Select v-model="pq.status" :options="statusOptions" option-label="label" option-value="value"
                  show-clear placeholder="全部" class="min-w-0 flex-1" />
              </div>
              <div class="col-span-2 flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">时间</label>
                <DatePicker v-model="pq.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
                  show-time hour-format="24" show-icon class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-12 shrink-0 text-xs text-muted-foreground">计划号</label>
                <InputText v-model="pq.planNo" class="min-w-0 flex-1" @keydown.enter="loadPlan" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">轧制厚度</label>
                <RangeInput v-model:min="pq.zzThickMin" v-model:max="pq.zzThickMax" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">销售订单号</label>
                <InputText v-model="pq.saleOrder" class="min-w-0 flex-1" @keydown.enter="loadPlan" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">提料订单号</label>
                <InputText v-model="pq.tlOrder" class="min-w-0 flex-1" @keydown.enter="loadPlan" />
              </div>
            </div>
            <!-- 计划工具栏 + 表标题（原 stackPanel4 [查询]；gvPlan.ViewCaption=计划信息） -->
            <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="planLoading" @click="loadPlan">
                <IconSearch class="h-3 w-3" />查询
              </Button>
              <span class="ml-auto text-xs font-medium text-muted-foreground">计划信息</span>
            </div>
            <!-- 计划表（gridControl1 / gvPlan） -->
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="planCols"
                :row-data="planRows"
                :row-class-rules="planRowClassRules"
                :pagination="false"
                :loading="planLoading"
                @grid-ready="readyPlan"
                @row-clicked="onPlanRowClicked"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>

          <!-- 下：坯料查询 + 11 按钮 + 坯料表 -->
          <SplitterPanel :size="60" :minSize="20" class="flex flex-col overflow-hidden">
            <!-- 坯料查询条件（原 dataLayoutControl2 8 项） -->
            <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-2 py-1.5">
              <div class="col-span-2 flex min-w-0 items-center gap-1.5">
                <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
                <DatePicker v-model="sq.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
                  show-time hour-format="24" show-icon class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-12 shrink-0 text-xs text-muted-foreground">炉号</label>
                <InputText v-model="sq.stove" class="min-w-0 flex-1" @keydown.enter="loadStorage" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-12 shrink-0 text-xs text-muted-foreground">铸坯号</label>
                <InputText v-model="sq.pieceNo" class="min-w-0 flex-1" @keydown.enter="loadStorage" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
                <InputText v-model="sq.sgCode" class="min-w-0 flex-1" @keydown.enter="loadStorage" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-12 shrink-0 text-xs text-muted-foreground">长度</label>
                <RangeInput v-model:min="sq.lenMin" v-model:max="sq.lenMax" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-12 shrink-0 text-xs text-muted-foreground">宽度</label>
                <RangeInput v-model:min="sq.wthMin" v-model:max="sq.wthMax" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-12 shrink-0 text-xs text-muted-foreground">厚度</label>
                <RangeInput v-model:min="sq.thickMin" v-model:max="sq.thickMax" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-12 shrink-0 text-xs text-muted-foreground">机台</label>
                <Select v-model="sq.machine" :options="machineOptions" option-label="label" option-value="value"
                  show-clear placeholder="请选择" class="min-w-0 flex-1" @change="onMachineChange" />
              </div>
            </div>
            <!-- 坯料工具栏（原 stackPanel3 11 按钮） + 表标题（gvStorage.ViewCaption=坯料信息） -->
            <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="storageLoading" @click="loadStorage">
                <IconSearch class="h-3 w-3" />查询
              </Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="queryByPlan">按计划查</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="clearAndLoad">清空条件查询</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="match(false)">匹配</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="match(true)">强制匹配</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelMatch">取消匹配</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onUpdate">坯料修改</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">坯料补录</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDeleteSJ">删除坯料</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSetYCP">标记异常坯</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelYCP">取消异常坯</Button>
              <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">坯料信息</span>
            </div>
            <!-- 坯料表（gridControl2 / gvStorage，Selected 勾选列 + 焦点行操作） -->
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="storageCols"
                :row-data="storageRows"
                :pagination="false"
                :loading="storageLoading"
                @grid-ready="readyStorage"
                @row-clicked="onStorageRowClicked"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <!-- 右：计划明细（原 navigationPane1 / navigationPage1 Caption=计划明细，Dock=Right；原默认收起，web 常驻=已知偏差） -->
      <SplitterPanel :size="26" :minSize="15" class="flex flex-col overflow-hidden border-l border-border/60">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">计划明细</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="detailCols"
            :row-data="detailRows"
            :row-class-rules="detailRowClassRules"
            :pagination="false"
            @grid-ready="readyDetail"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

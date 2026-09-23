<script setup lang="ts">
/** 对应 FrmMS3000（炉次实绩，2 菜单共用 cQueryString={FactoryCode,LineCode}：LG02 炼钢总厂 / LG01 一炼钢）：DDH.Winforms.SMS.Forms.FrmMS3000
 *  已接入：frmMS3000Api.queryStoveInfo（btnQuery_GetParamDto，产线必填「禁止操作，产线不得为空！」）
 *          + queryStoveRoutePlanInfo / queryStoveInputInfo / queryStoveOutputInfo（主行焦点变化→原 FocusedRowObjectChanged 依序拉子表，
 *            入参 gsId=主行.Id、stoveNo=CStove、pono=CPono；无主行时三表清空）
 *          + checkGSReback → 确认「确定将炉次号为‘X’的钢水进行回炉？」→ gSReback → 重查
 *          + checkCancelGSReback → 确认「确定取消炉次号为‘X’的钢水的回炉操作？」→ cancelGSReback → 重查
 *          + systemKeyValueApi.querySysKvItemList("A0100:QMYS")（成分页签动态元素列，原 uccfResultForlg1.InitColnum）
 *          + publicQMInfoApi.getGHGSQMInfo（成分页签数据——原 uccfResultForlg1.RefreshData → GetGHGSQMInfo(stoveNo)）
 *  待接入：无（原 UCCF.CustomDrawCell 判定红/蓝色标与 InitColnum 的 LineFormatter 显示转义未迁——格式器按原值显示，同既往批次偏差）
 *  结构：stackPanel1（产线|日期|≤日期≤|炉次号/制造命令号|查询|钢水回炉|取消回炉）→ 主表 gvStoveInfo（Dock Top ≈60%）
 *       → SplitterControl 横向分割 → TabPane 4 页签（工艺路线计划|投料信息|产出信息|成分信息；
 *         原 Designer 未给 tabNavigationPage 设 Text——按内容命名，已知偏差）
 *       一炼钢（qs.LineCode=LG01=LineConst.炼钢一厂）隐藏 5 列：最新炉次工位/虚拟炉号/虚拟炉号转炉/占用炉号/占用炉号所属转炉（原 Load）
 *  多参方法按参数名对象传 data（B0 生成 swagger 统一 data 体、未分 params/data——真机若需 query 传标量由 swagger 侧升级）
 *  字段桥接：后端 JSON camelCase → 回填 toPascal 首字母还原 */
import { nextTick, onMounted, ref, shallowRef, type Ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { systemKeyValueApi } from "@/api/admin/request";
import { frmMS3000Api, publicQMInfoApi } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { raw: menuQs, json: menuJson } = useMenuQuery();
const qsFormat = JSON.stringify({ FactoryCode: null, LineCode: null });
const qs = menuJson as { FactoryCode?: string; LineCode?: string };

const theme = makeHmxGridTheme();
const querying = ref(false);
const childLoading = ref(false);
const saving = ref(false);

const lineCode = ref(String(qs.LineCode ?? ""));
const begDate = ref<Date>(new Date()); // 原 Load：今天
const endDate = ref<Date>(new Date());
const stoveNoOrPono = ref("");

const mainApi = ref<GridApi | null>(null);
const routeApi = ref<GridApi | null>(null);
const inputApi = ref<GridApi | null>(null);
const outputApi = ref<GridApi | null>(null);
const cfApi = ref<GridApi | null>(null);
const activeTab = ref("route");

type Row = Record<string, unknown>;
const mainRows = shallowRef<Row[]>([]);
const routeRows = shallowRef<Row[]>([]);
const inputRows = shallowRef<Row[]>([]);
const outputRows = shallowRef<Row[]>([]);
const cfRows = shallowRef<Row[]>([]);

const mainCols = ref<ColDef[]>([      { field: "CLineName", headerName: "产线名称", width: 112 },
      { field: "CProBof", headerName: "炉次生产转炉", width: 138 },
      { field: "CStove", headerName: "炉号", width: 86 },
      { field: "CPono", headerName: "制造命令号", width: 125 },
      { field: "DAccountDate", headerName: "账务日期", width: 112 },
      { field: "CSgCode", headerName: "钢种", width: 86 },
      { field: "CSgStd", headerName: "执行标准", width: 112 },
      { field: "CSpec", headerName: "规格", width: 86 },
      { field: "NThick", headerName: "坯厚", width: 86 },
      { field: "NWidth", headerName: "坯宽", width: 86 },
      { field: "NLen", headerName: "坯长", width: 86 },
      { field: "CLenMx", headerName: "长度明细", width: 112 },
      { field: "CTsyq", headerName: "特殊要求", width: 112 },
      { field: "DStoveNoCreateTime", headerName: "虚拟炉号添加时间", width: 164 },
      { field: "CPlanTime", headerName: "计划日期", width: 112 },
      { field: "Route_Plan", headerName: "计划工序机台", width: 138 },
      { field: "Route_Actual", headerName: "实际工序机台", width: 138 },
      { field: "NVirtualStoveNo", headerName: "虚拟炉号", width: 112 },
      { field: "CVirtualStoveNoBof", headerName: "虚拟炉号转炉", width: 138 },
      { field: "NOccupiedStoveNo", headerName: "占用炉号", width: 112 },
      { field: "COccupiedStoveNoBof", headerName: "占用炉号所属转炉", width: 164 },
      { field: "CStoveLocation", headerName: "最新炉次位置", width: 138 },
      { field: "CStoveLocationStation", headerName: "最新炉次工位", width: 138 },
      { field: "CStoveState", headerName: "最新炉次状态", width: 138 },
      { field: "CRefurnace", headerName: "炉次回炉", width: 112 },
      { field: "CRefurnaceState", headerName: "炉次回炉状态", width: 138 },
      { field: "CPotNo", headerName: "罐号", width: 86 },
      { field: "CPotType", headerName: "包况", width: 86 },
      { field: "CBackup", headerName: "备注", width: 86 },
      { field: "CEnable", headerName: "启用", width: 86 },
      { field: "CNotEnableBackup", headerName: "不启用状态备注", width: 151 },
      { field: "Creator", headerName: "创建人", width: 99 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 125 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 138 },
      { field: "Id", headerName: "主键", width: 86, hide: true },
      { field: "NStatus", headerName: "处理标记", width: 112, hide: true },
      { field: "CJcFk", headerName: "浇次主键", width: 112, hide: true },
      { field: "CJcNo", headerName: "浇次号", width: 99, hide: true },
      { field: "CLineCode", headerName: "产线", width: 86, hide: true },
      { field: "NQua", headerName: "支数", width: 86, hide: true },
      { field: "NWgt", headerName: "坯重", width: 86, hide: true },
      { field: "NSort", headerName: "顺序号", width: 99, hide: true },
      { field: "NSortJc", headerName: "炉数", width: 86, hide: true },
      { field: "CMatCode", headerName: "物料编码", width: 112, hide: true },
      { field: "CMatName", headerName: "物料名称", width: 112, hide: true },
      { field: "CCcCode", headerName: "连铸代码", width: 112, hide: true },
      { field: "CRhCode", headerName: "真空代码", width: 112, hide: true },
      { field: "CLfCode", headerName: "精炼代码", width: 112, hide: true },
      { field: "CLdCode", headerName: "转炉代码", width: 112, hide: true },
      { field: "COrderNo", headerName: "订单号", width: 99, hide: true },
      { field: "CIsZb", headerName: "是否备坯计划", width: 138, hide: true },
      { field: "DUseTime", headerName: "可用时间", width: 112, hide: true },
      { field: "CRoute", headerName: "工艺路线", width: 112, hide: true },
      { field: "DJhqTime", headerName: "交期", width: 86, hide: true },
      { field: "CCustName", headerName: "客户名称", width: 112, hide: true },
      { field: "NLgCn", headerName: "炼钢产能", width: 112, hide: true },
      { field: "CRemark", headerName: "反馈结果", width: 112, hide: true },
      { field: "CSgCodeStd", headerName: "钢种标准", width: 112, hide: true },
      { field: "CStNo", headerName: "制造标准号", width: 125, hide: true },
      { field: "DDownDdTime", headerName: "下发调度时间", width: 138, hide: true },
      { field: "CDownDdUser", headerName: "下发调度人", width: 125, hide: true },
      { field: "DDownLgsc", headerName: "下发生产时间", width: 138, hide: true },
      { field: "CDownLgscUser", headerName: "下发人", width: 99, hide: true },
      { field: "NWgtMeter", headerName: "米单重", width: 99, hide: true },
      { field: "CSpecOrder", headerName: "成品规格", width: 112, hide: true },
      { field: "CIsSl", headerName: "是否收料", width: 112, hide: true },
      { field: "NGenerateRoutePlan", headerName: "生成工艺路线计划", width: 164, hide: true },
      { field: "CPotNoId", headerName: "包数据ID", width: 125, hide: true },
      { field: "CStovePlanId", headerName: "炉次计划id", width: 138, hide: true },
      { field: "CToCurrentStoveSplitMergeType", headerName: "生成当前炉次的拆合类型", width: 203, hide: true },
      { field: "CToCurrentStoveSplitMergeTypeSign", headerName: "生成当前炉次的拆合类型标识", width: 229, hide: true },
      { field: "CStoveSplitMergeType", headerName: "炉次拆合类型", width: 138, hide: true },
      { field: "CStoveSplitMergeTypeSign", headerName: "炉次拆合类型标识", width: 164, hide: true },
      { field: "CStoveChangeId", headerName: "炉次最终更改标识id", width: 190, hide: true },
      { field: "CStoveChangeMachinename", headerName: "炉次最终更改位置", width: 164, hide: true },
      { field: "CQmAdjust", headerName: "质检改判", width: 112, hide: true },
      { field: "CQmAdjustActualId", headerName: "最终质检改判时炉次工序机台实际id", width: 281, hide: true },
      { field: "CRefurnaceActualId", headerName: "炉次回炉时炉次工序机台实际id", width: 255, hide: true },
      { field: "CMoveGs", headerName: "炉次转钢水", width: 125, hide: true },
      { field: "CMoveGsSign", headerName: "炉次转钢水标识", width: 151, hide: true },
      { field: "CMoveGsPlanId", headerName: "炉次转钢水时炉次工序机台计划id", width: 268, hide: true },
      { field: "NMixStove", headerName: "混合炉", width: 99, hide: true },
      { field: "CDelFlag", headerName: "删除标识", width: 112, hide: true },
      { field: "Timestamp", headerName: "时间戳", width: 99, hide: true },
      { field: "CSw01", headerName: "备用字段1", width: 125, hide: true },
      { field: "CSw02", headerName: "备用字段2", width: 125, hide: true },
      { field: "CSw03", headerName: "备用字段3", width: 125, hide: true },
      { field: "CSw04", headerName: "备用字段4", width: 125, hide: true },
      { field: "CSw05", headerName: "备用字段5", width: 125, hide: true },
      { field: "CSw06", headerName: "备用字段6", width: 125, hide: true },
      { field: "Selected", headerName: "选择", width: 86, hide: true },
      { field: "CZGLineCode", headerName: "轧钢产线代码", width: 138, hide: true },
      { field: "CJcNoActual", headerName: "生产浇次号", width: 125, hide: true },
      { field: "NChange", headerName: "炉次是否改钢种", width: 151, hide: true },
      { field: "NJcActualBeg", headerName: "生产本浇次首炉", width: 151, hide: true },
      { field: "NJcActualEnd", headerName: "生产本浇次尾炉", width: 151, hide: true },
      { field: "NSortJcActual", headerName: "生产浇次内顺序号", width: 164, hide: true },
      { field: "CAfterChangeId", headerName: "炉次生产改钢种后id 改钢种后原数据记录的新增加的数据的id", width: 300, hide: true },
      { field: "CBeforeChangeId", headerName: "炉次生产改钢种前id 改钢种后新增加的数据记录的之前的数据id", width: 300, hide: true },
      { field: "CShift", headerName: "班次", width: 86, hide: true },
      { field: "CTeam", headerName: "班组", width: 86, hide: true },
      { field: "DTeamDate", headerName: "虚拟或占用炉号班次日期", width: 203, hide: true }]);
const routeCols = ref<ColDef[]>([      { field: "CStoveNo", headerName: "炉号", width: 86 },
      { field: "CPono", headerName: "制造命令号", width: 125 },
      { field: "CProcDesc", headerName: "炉次工艺路线计划工序描述", width: 216 },
      { field: "CProcIndex", headerName: "炉次工艺路线序号", width: 164 },
      { field: "CPlanLineDesc", headerName: "计划产线描述", width: 138 },
      { field: "CPlanMachineDesc", headerName: "计划工序机台名称", width: 164 },
      { field: "DPlanBegtime", headerName: "计划工序开始时间", width: 164 },
      { field: "DPlanEndtime", headerName: "计划工序结束时间", width: 164 },
      { field: "CStoveState", headerName: "最新炉次状态", width: 138 },
      { field: "CEnable", headerName: "启用", width: 86 },
      { field: "CRefurnace", headerName: "炉次回炉", width: 112 },
      { field: "CRefurnaceState", headerName: "炉次回炉状态", width: 138 },
      { field: "CPlanBackup", headerName: "计划备注", width: 112 },
      { field: "NActualExist", headerName: "按计划进行实际生产", width: 177 },
      { field: "CActualLineDesc", headerName: "实际产线描述", width: 138 },
      { field: "CActualMachineDesc", headerName: "实际工序机台名称", width: 164 },
      { field: "DActualBegtime", headerName: "实际工序开始时间", width: 164 },
      { field: "DActualBegtimePro", headerName: "实际工序生产开始时间", width: 190 },
      { field: "DActualEndtimePro", headerName: "实际工序生产结束时间", width: 190 },
      { field: "DActualEndtime", headerName: "实际工序结束时间", width: 164 },
      { field: "DActualBegtimeOperationMode", headerName: "实际工序开始操作方式", width: 190 },
      { field: "DActualBegtimeProOperationMode", headerName: "实际工序生产开始操作方式", width: 216 },
      { field: "DActualEndtimeProOperationMode", headerName: "实际工序生产结束操作方式", width: 216 },
      { field: "DActualEndtimeOperationMode", headerName: "实际工序结束操作方式", width: 190 },
      { field: "DAccountDate", headerName: "账务日期", width: 112 },
      { field: "DTeamDate", headerName: "虚拟或占用炉号班次日期", width: 203 },
      { field: "CShift", headerName: "班次", width: 86 },
      { field: "CTeam", headerName: "班组", width: 86 },
      { field: "NWgt", headerName: "坯重", width: 86 },
      { field: "CPotNo", headerName: "罐号", width: 86 },
      { field: "CActualBackup", headerName: "实际备注", width: 112 },
      { field: "Creator", headerName: "创建人", width: 99 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 125 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 138 },
      { field: "Id", headerName: "主键", width: 86, hide: true },
      { field: "CGsId", headerName: "钢水id", width: 112, hide: true },
      { field: "CProc", headerName: "工序", width: 86, hide: true },
      { field: "CPlanLineCode", headerName: "计划产线", width: 112, hide: true },
      { field: "CPlanMachineCode", headerName: "计划工序机台", width: 138, hide: true },
      { field: "CPlanMachineStationCode", headerName: "计划机台工位编码", width: 164, hide: true },
      { field: "CPlanMachineStationDesc", headerName: "计划机台工位描述", width: 164, hide: true },
      { field: "CSign", headerName: "机台工位同时生产标识", width: 190, hide: true },
      { field: "CPlanState", headerName: "计划状态", width: 112, hide: true },
      { field: "CPlanType", headerName: "计划生成类型", width: 138, hide: true },
      { field: "CMoveGs", headerName: "炉次转钢水", width: 125, hide: true },
      { field: "CMoveGsSign", headerName: "炉次转钢水标识", width: 151, hide: true },
      { field: "CStoveSplitMergeType", headerName: "炉次拆合类型", width: 138, hide: true },
      { field: "CStoveSplitMergeTypeSign", headerName: "炉次拆合类型标识", width: 164, hide: true },
      { field: "CActualLineCode", headerName: "实际产线", width: 112, hide: true },
      { field: "CActualMachineCode", headerName: "实际工序机台", width: 138, hide: true },
      { field: "CActualMachineStationCode", headerName: "实际机台工位编码", width: 164, hide: true },
      { field: "CActualMachineStationDesc", headerName: "实际机台工位描述", width: 164, hide: true },
      { field: "NWgtMz", headerName: "钢水毛重", width: 112, hide: true },
      { field: "NWgtPz", headerName: "钢水皮重", width: 112, hide: true },
      { field: "NWgtKz", headerName: "钢水扣重", width: 112, hide: true },
      { field: "CPotType", headerName: "包况", width: 86, hide: true },
      { field: "CPotNoId", headerName: "包数据ID", width: 125, hide: true },
      { field: "CDelFlag", headerName: "删除标识", width: 112, hide: true },
      { field: "Timestamp", headerName: "时间戳", width: 99, hide: true },
      { field: "CSw01", headerName: "备用字段1", width: 125, hide: true },
      { field: "CSw02", headerName: "备用字段2", width: 125, hide: true },
      { field: "CSw03", headerName: "备用字段3", width: 125, hide: true },
      { field: "CSw04", headerName: "备用字段4", width: 125, hide: true },
      { field: "CSw05", headerName: "备用字段5", width: 125, hide: true },
      { field: "CSw06", headerName: "备用字段6", width: 125, hide: true },
      { field: "Selected", headerName: "选择", width: 86, hide: true }]);
const inputCols = ref<ColDef[]>([      { field: "CLineName", headerName: "产线名称", width: 112 },
      { field: "CProcName", headerName: "工序名称", width: 112 },
      { field: "CMachineName", headerName: "机台名称", width: 112 },
      { field: "CStoveNo", headerName: "炉号", width: 86 },
      { field: "CPono", headerName: "制造命令号", width: 125 },
      { field: "CSiloCode", headerName: "料仓编码", width: 112 },
      { field: "CSiloName", headerName: "料仓描述", width: 112 },
      { field: "CMtrlCode", headerName: "物料编码", width: 112 },
      { field: "CMtrlName", headerName: "物料描述", width: 112 },
      { field: "CUnit", headerName: "单片钢坯", width: 112 },
      { field: "CIronNo", headerName: "铁次号", width: 99 },
      { field: "CPotNo", headerName: "罐号", width: 86 },
      { field: "NMainQm", headerName: "作为炉次铁水成分", width: 164 },
      { field: "CRefurnaceStoveNo", headerName: "回炉钢水炉次号", width: 151 },
      { field: "CRefurnacePono", headerName: "回炉钢水制造命令号", width: 177 },
      { field: "NWgt", headerName: "坯重", width: 86 },
      { field: "CDataAddType", headerName: "数据添加方式", width: 138 },
      { field: "CAllowTotal", headerName: "是否统计投料量", width: 151 },
      { field: "CBackup", headerName: "备注", width: 86 },
      { field: "Creator", headerName: "创建人", width: 99 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 125 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 138 },
      { field: "Id", headerName: "主键", width: 86, hide: true },
      { field: "CGsId", headerName: "钢水id", width: 112, hide: true },
      { field: "CRouteId", headerName: "炉次工艺路线及机台计划id", width: 229, hide: true },
      { field: "CFactoryCode", headerName: "工厂", width: 86, hide: true },
      { field: "CFactoryName", headerName: "工厂名称", width: 112, hide: true },
      { field: "CLineCode", headerName: "产线", width: 86, hide: true },
      { field: "CProc", headerName: "工序", width: 86, hide: true },
      { field: "CMachineCode", headerName: "机台编码", width: 112, hide: true },
      { field: "CMachineStationCode", headerName: "机台工位编码", width: 138, hide: true },
      { field: "CMachineStationDesc", headerName: "机台工位描述", width: 138, hide: true },
      { field: "CProcNumForQm", headerName: "工序次数", width: 112, hide: true },
      { field: "CTimeMtrlUnique", headerName: "时刻物料唯一", width: 138, hide: true },
      { field: "CQuick", headerName: "快捷换料", width: 112, hide: true },
      { field: "CTsId", headerName: "铁水数据id", width: 138, hide: true },
      { field: "CRefurnaceGsId", headerName: "回炉钢水id", width: 138, hide: true },
      { field: "CMtrlType", headerName: "物料种类", width: 112, hide: true },
      { field: "CStock", headerName: "关联库存", width: 112, hide: true },
      { field: "CType", headerName: "类型", width: 86, hide: true },
      { field: "CTypeNums", headerName: "时刻物料非唯一投料量", width: 190, hide: true },
      { field: "CAdjustType", headerName: "投料调整类型", width: 138, hide: true },
      { field: "CAdjustTypeNums", headerName: "投料调整量", width: 125, hide: true },
      { field: "NCollectWgt", headerName: "采集重量", width: 112, hide: true },
      { field: "CTimestamp", headerName: "时间戳", width: 99, hide: true },
      { field: "CSw01", headerName: "备用字段1", width: 125, hide: true },
      { field: "CSw02", headerName: "备用字段2", width: 125, hide: true },
      { field: "CSw03", headerName: "备用字段3", width: 125, hide: true },
      { field: "CSw04", headerName: "备用字段4", width: 125, hide: true },
      { field: "CSw05", headerName: "备用字段5", width: 125, hide: true },
      { field: "CSw06", headerName: "备用字段6", width: 125, hide: true },
      { field: "Selected", headerName: "选择", width: 86, hide: true }]);
const outputCols = ref<ColDef[]>([      { field: "CLineCode", headerName: "产线", width: 86 },
      { field: "CMachine", headerName: "炉台号", width: 99 },
      { field: "CStrandNo", headerName: "流号", width: 86 },
      { field: "CStove", headerName: "炉号", width: 86 },
      { field: "CPieceNo", headerName: "头侧件次号", width: 125 },
      { field: "CPono", headerName: "制造命令号", width: 125 },
      { field: "CSampleLotNo", headerName: "试批号", width: 99 },
      { field: "CPlanId", headerName: "计划ID", width: 112 },
      { field: "CConNo", headerName: "合同号", width: 99 },
      { field: "COrderNo", headerName: "订单号", width: 99 },
      { field: "CMatCode", headerName: "物料编码", width: 112 },
      { field: "CSgCode", headerName: "钢种", width: 86 },
      { field: "CSgStd", headerName: "执行标准", width: 112 },
      { field: "NThick", headerName: "坯厚", width: 86 },
      { field: "NWth", headerName: "宽度", width: 86 },
      { field: "NLen", headerName: "坯长", width: 86 },
      { field: "CSpec", headerName: "规格", width: 86 },
      { field: "NNum", headerName: "提货件数", width: 112 },
      { field: "NCalWgt", headerName: "理重", width: 86 },
      { field: "NWgt", headerName: "坯重", width: 86 },
      { field: "CStoreCode", headerName: "库区号", width: 99 },
      { field: "CStackNo", headerName: "垛位号", width: 99 },
      { field: "CStackNum", headerName: "层号", width: 95 },
      { field: "NStatus", headerName: "处理标记", width: 112 },
      { field: "CShiftNo", headerName: "结果录入班次", width: 138 },
      { field: "CGroupNo", headerName: "结果录入班组", width: 138 },
      { field: "DProTime", headerName: "产出时间", width: 112 },
      { field: "CConfirmStatus", headerName: "确认判定状态", width: 138 },
      { field: "CIsHot", headerName: "是否热送", width: 112 },
      { field: "CMsc", headerName: "冶金规范码", width: 125 },
      { field: "CMscLine", headerName: "冶金规范产线", width: 138 },
      { field: "CStNo", headerName: "制造标准号", width: 125 },
      { field: "CSteelType", headerName: "钢种大类", width: 112 },
      { field: "CProRemark", headerName: "生产备注", width: 112 },
      { field: "CPieceNoQd", headerName: "钢坯切断件次号", width: 151 },
      { field: "CBilletTypeCode", headerName: "铸坯标识", width: 112 },
      { field: "CShiftNoSj", headerName: "炉次实绩班次", width: 138 },
      { field: "CGroupNoSj", headerName: "炉次实绩班组", width: 138 },
      { field: "CSurfaceResult", headerName: "表检结果", width: 112 },
      { field: "DSurfaceTime", headerName: "表面判定时间", width: 138 },
      { field: "CSurfaceUser", headerName: "表面判定人", width: 125 },
      { field: "CSurfaceRemark", headerName: "缺陷描述", width: 112 },
      { field: "CSurfaceAdvice", headerName: "表检处置意见", width: 138 },
      { field: "DConfirmTime", headerName: "成分确认时间", width: 138 },
      { field: "CConfirmUser", headerName: "成分确认人", width: 125 },
      { field: "CPcResult", headerName: "理化结果", width: 112 },
      { field: "DPcTime", headerName: "理化判定时间", width: 138 },
      { field: "CPcUser", headerName: "理化判定人", width: 125 },
      { field: "CPcRemark", headerName: "理化判定备注", width: 138 },
      { field: "CQmHandleDesc", headerName: "处置注释", width: 112 },
      { field: "NQmStatus", headerName: "质量状态", width: 112 },
      { field: "CDestination", headerName: "去向", width: 86 },
      { field: "CRouteCode", headerName: "精炼路径", width: 112 },
      { field: "CPrintCode", headerName: "喷号", width: 86 },
      { field: "NCastDivCode", headerName: "模连铸标识", width: 125 },
      { field: "Creator", headerName: "创建人", width: 99 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 125 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 138 },
      { field: "Id", headerName: "主键", width: 86, hide: true },
      { field: "CFactoryId", headerName: "工厂编码", width: 112, hide: true },
      { field: "Selected", headerName: "选择", width: 86, hide: true }]);
const cfCols = ref<ColDef[]>([      { field: "CStove", headerName: "炉号", width: 86 },
      { field: "CGw", headerName: "工位", width: 86 },
      { field: "CSampleNo", headerName: "试样号", width: 99 },
      { field: "CAutoJudgeResult", headerName: "自动判定结果", width: 138 },
      { field: "CFinalFlag", headerName: "是否最终样", width: 125 },
      { field: "DLastTime", headerName: "判定时间", width: 112 },
      { field: "CJudgeRemark", headerName: "判定备注", width: 112 },
      { field: "CSgSign", headerName: "钢种", width: 86, hide: true },
      { field: "CLineCode", headerName: "产线", width: 86, hide: true },
      { field: "CSgStd", headerName: "执行标准", width: 112, hide: true },
      { field: "CSpec", headerName: "规格", width: 86, hide: true },
      { field: "NCount", headerName: "支数", width: 86, hide: true },
      { field: "NWeight", headerName: "重量", width: 86, hide: true },
      { field: "DTestTime", headerName: "结果录入时间", width: 138, hide: true }]);

// 一炼钢（LG01）隐藏 5 列——原 Load：LineConst.炼钢一厂 == qs.LineCode → col*.Visible=false
if (lineCode.value === "LG01") {
  for (const f of ["CStoveLocationStation", "NVirtualStoveNo", "CVirtualStoveNoBof", "NOccupiedStoveNo", "COccupiedStoveNoBof"]) {
    const c = mainCols.value.find((x) => x.field === f);
    if (c) c.hide = true;
  }
}

/** 后端 JSON 为 camelCase（首字母小写），extract 列为 PascalCase——回填时首字母还原 */
function toPascal(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[k ? k[0].toUpperCase() + k.slice(1) : k] = v;
  return out;
}
function toPascalRows(list: unknown): Row[] {
  return (Array.isArray(list) ? (list as Row[]) : []).map(toPascal);
}

function getParamDto() {
  if (!lineCode.value) {
    toast("禁止操作，产线不得为空！", 2000, "warn");
    return null;
  }
  return {
    LineCode: lineCode.value,
    LineName: lineCode.value, // 原 ucLine1.Text（产线描述）；菜单仅注入编码，暂同编码显示
    BegTime: begDate.value,
    EndTime: endDate.value,
    StoveNoOrPono: stoveNoOrPono.value,
  };
}

function autosize(api: Ref<GridApi | null>) {
  requestAnimationFrame(() => api.value?.autoSizeAllColumns());
}

async function onQuery() {
  const p = getParamDto();
  if (!p) return;
  querying.value = true;
  try {
    const list = (await frmMS3000Api.queryStoveInfo(p)) ?? [];
    mainRows.value = toPascalRows(list);
    await nextTick();
    mainApi.value?.deselectAll();
    if (mainRows.value.length) {
      mainApi.value?.getDisplayedRowAtIndex(0)?.setSelected(true); // 触发 selection-changed → loadChildren（原焦点行联动）
    } else {
      await loadChildren(null);
    }
    autosize(mainApi);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onMainSelection() {
  const row = mainApi.value?.getSelectedRows()[0] as Row | undefined;
  void loadChildren(row ?? null);
}

// 原 gridView1_FocusedRowObjectChanged：依序拉路线/投料/产出/成分
async function loadChildren(row: Row | null) {
  childLoading.value = true;
  try {
    if (!row) {
      routeRows.value = [];
      inputRows.value = [];
      outputRows.value = [];
      cfRows.value = [];
      return;
    }
    const gsId = String(row.Id ?? "");
    const stoveNo = String(row.CStove ?? "");
    const pono = String(row.CPono ?? "");
    routeRows.value = toPascalRows(await frmMS3000Api.queryStoveRoutePlanInfo({ gsId, stoveNo, pono }));
    inputRows.value = toPascalRows(await frmMS3000Api.queryStoveInputInfo({ gsId, stoveNo, pono }));
    outputRows.value = toPascalRows(await frmMS3000Api.queryStoveOutputInfo({ gsId, stoveNo, pono }));
    autosize(routeApi);
    autosize(inputApi);
    autosize(outputApi);
    await loadCf(stoveNo);
  } catch {
    /* 拦截层已 toast */
  } finally {
    childLoading.value = false;
  }
}

// 原 GetStoveQMInfo → uccfResultForlg1.RefreshData(CStove) → IPublicQMInfoAppService.GetGHGSQMInfo(stoveNo, timeRange=null)
async function loadCf(stoveNo: string) {
  if (!stoveNo) {
    cfRows.value = [];
    autosize(cfApi);
    return;
  }
  try {
    const list = await publicQMInfoApi.getGHGSQMInfo(stoveNo);
    cfRows.value = toPascalRows(list);
  } catch {
    cfRows.value = []; // 拦截层已 toast
  }
  autosize(cfApi);
}

// 原 uccfResultForlg1.InitColnum：QuerySysKvItemList(KeyValueConst.QMYS="A0100:QMYS") 动态追加成分列（Unbound ← TestResults）
async function initCfCols() {
  try {
    const kv = (await systemKeyValueApi.querySysKvItemList("A0100:QMYS")) ?? [];
    for (const item of kv) {
      const f = item.cCode;
      if (!f || cfCols.value.some((c) => c.field === f)) continue;
      cfCols.value.push({
        field: f,
        headerName: item.cName ?? f,
        width: Math.min(200, (item.cName ?? f).length * 13 + 60),
        valueGetter: (p) => {
          const row = (p.data ?? {}) as Row;
          const tr = (row.TestResults ?? row.testResults) as { CElmCode?: string; cElmCode?: string; NValue?: unknown; nValue?: unknown }[] | undefined;
          const hit = tr?.find((t) => (t.CElmCode ?? t.cElmCode) === f);
          return hit ? (hit.NValue ?? hit.nValue) : null;
        },
      });
    }
    autosize(cfApi);
  } catch {
    /* 拦截层已 toast */
  }
}

function currentMain(): Row | null {
  return (mainApi.value?.getSelectedRows()[0] as Row | undefined) ?? null;
}

// 原 btnGSReback_Click：焦点行 → CheckGSReback → ShowYesNo 文案 → GSReback → 重查
async function onGSReback() {
  const row = currentMain();
  if (!row) return;
  const p = getParamDto();
  if (!p) return;
  try {
    await frmMS3000Api.checkGSReback({ paramDto: p, gsId: row.Id });
  } catch {
    return; // 拦截层已 toast，校验不过即中止
  }
  if (!window.confirm(`确定将炉次号为‘${row.CStove}’的钢水进行回炉？`)) return;
  saving.value = true;
  try {
    await frmMS3000Api.gSReback({ paramDto: p, gsId: row.Id });
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

// 原 btnGSRebackCancel_Click：焦点行 → CheckCancelGSReback → ShowYesNo 文案 → CancelGSReback → 重查
async function onGSRebackCancel() {
  const row = currentMain();
  if (!row) return;
  const p = getParamDto();
  if (!p) return;
  try {
    await frmMS3000Api.checkCancelGSReback({ paramDto: p, gsId: row.Id });
  } catch {
    return;
  }
  if (!window.confirm(`确定取消炉次号为‘${row.CStove}’的钢水的回炉操作？`)) return;
  saving.value = true;
  try {
    await frmMS3000Api.cancelGSReback({ paramDto: p, gsId: row.Id });
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

function onMainReady(e: GridReadyEvent) { mainApi.value = e.api; }
function onRouteReady(e: GridReadyEvent) { routeApi.value = e.api; }
function onInputReady(e: GridReadyEvent) { inputApi.value = e.api; }
function onOutputReady(e: GridReadyEvent) { outputApi.value = e.api; }
function onCfReady(e: GridReadyEvent) { cfApi.value = e.api; }

onMounted(() => {
  if (!menuQs) {
    toast(
      `界面必须配置注入参数，MES程序版本可能已严重落后，请退出并重新打开MES程序！\r\n若问题仍未得到解决，请联系管理员！\r\n界面注入参数格式为：'${qsFormat}'`,
      5000,
      "error",
    );
  } else if (menuQs.startsWith("{") && !Object.keys(menuJson).length) {
    toast(`界面参数错误应为:${qsFormat}，\r\nMES程序版本可能已严重落后，请退出并重新打开MES程序！`, 5000, "error");
  }
  void initCfCols();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：产线/日期/≤日期≤/炉次号·制造命令号/查询/钢水回炉/取消回炉） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="begDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">≤日期≤</label>
      <DatePicker v-model="endDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">炉次号/制造命令号</label>
      <InputText v-model="stoveNoOrPono" class="w-44 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onGSReback">钢水回炉</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onGSRebackCancel">取消回炉</Button>
    </div>

    <!-- 上下分栏（原 gcStoveInfo Dock=Top ≈400px + splitterControl1 Dock=Top + tabPane1 Fill，SplitterPosition 比例≈60/40） -->
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="60" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 主表：炉次信息（原 gvStoveInfo 单选焦点行驱动子表） -->
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="mainCols" :row-data="mainRows" :pagination="false"
            :loading="querying"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }" @grid-ready="onMainReady"
            @selection-changed="onMainSelection" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="40" :minSize="15" class="flex flex-col overflow-hidden">
        <!-- 页签（原 tabPane1：tabNavigationPage1-4——Designer 未设页签 Text，按内容命名见来源注释） -->
        <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab value="route">工艺路线计划</Tab>
              <Tab value="input">投料信息</Tab>
              <Tab value="output">产出信息</Tab>
              <Tab value="cf">成分信息</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel value="route" class="h-full">
              <div class="h-full w-full">
                <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef" :column-defs="routeCols" :row-data="routeRows" :pagination="false"
                  :loading="childLoading" @grid-ready="onRouteReady" @first-data-rendered="autoSizeOnFirstData" />
              </div>
            </TabPanel>
            <TabPanel value="input" class="h-full">
              <div class="h-full w-full">
                <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef" :column-defs="inputCols" :row-data="inputRows" :pagination="false"
                  :loading="childLoading" @grid-ready="onInputReady" @first-data-rendered="autoSizeOnFirstData" />
              </div>
            </TabPanel>
            <TabPanel value="output" class="h-full">
              <div class="h-full w-full">
                <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef" :column-defs="outputCols" :row-data="outputRows" :pagination="false"
                  :loading="childLoading" @grid-ready="onOutputReady" @first-data-rendered="autoSizeOnFirstData" />
              </div>
            </TabPanel>
            <TabPanel value="cf" class="h-full">
              <div class="h-full w-full">
                <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef" :column-defs="cfCols" :row-data="cfRows" :pagination="false"
                  @grid-ready="onCfReady" @first-data-rendered="autoSizeOnFirstData" />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

import { getBody, getParams, ok, type RouteMap } from "../admin/core";
import { seedDetails, seedJobs, seedLines, seedSamples, stamp } from "./data/lims";

/** 占位：≤5 条随机演示行（质量判定等查询端点共用） */
function demoRows<T>(n: number, make: (i: number) => T): T[] {
  const count = Math.min(5, Math.max(1, n));
  return Array.from({ length: count }, (_, i) => make(i));
}

/**
 * LIMS 域 mock（QL3000 检验委托发送等）：
 * 键 = requestClient 的路径（去 /api 前缀），与 swagger URL 一致。
 * 数据落 localStorage，便于验保存往返。
 */

const JOBS_KEY = "hmx.lims.testjobs.v1";
const SAMPLES_KEY = "hmx.lims.samplerequires.v1";
const DETAILS_KEY = "hmx.lims.tql3200.v1";
const LINES_KEY = "hmx.lims.lines.v1";

function loadJson<T>(key: string, seed: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* 回退种子 */
  }
  const seeded = seed();
  localStorage.setItem(key, JSON.stringify(seeded));
  return seeded;
}
function saveJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

type AnyObj = Record<string, any>;
const LIMS = "/dDH.Service.LIMS.Services";

function loadJobs(): AnyObj[] {
  return loadJson(JOBS_KEY, seedJobs);
}
function loadSamples(): AnyObj[] {
  return loadJson(SAMPLES_KEY, seedSamples);
}
function loadDetails(): AnyObj[] {
  return loadJson(DETAILS_KEY, seedDetails);
}

function inTimeRange(iso: string | null | undefined, range?: { min?: string | null; max?: string | null }) {
  if (!range?.min && !range?.max) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (range.min && t < new Date(range.min).getTime()) return false;
  if (range.max && t > new Date(range.max).getTime()) return false;
  return true;
}

export const limsRoutes: RouteMap = {
  /* 产线下拉（原 ITpa1000AppService.QueryLines） */
  ["post /hmx.Service.Widgets.Services/tPa1000/queryLines"]: (config) => ok(config, loadJson(LINES_KEY, seedLines)),

  /* QL3000 查询委托 */
  [`post ${LIMS}/qL3000/queryTestJob`]: (config) => {
    const input = getBody<AnyObj>(config) ?? {};
    const all = loadJobs();
    const rows = all.filter((j) => {
      if (input.cTestNo && !String(j.cTestNo ?? "").endsWith(String(input.cTestNo))) return false;
      if (input.cStove && !String(j.cStove ?? "").includes(String(input.cStove))) return false;
      if (input.cBatch && !String(j.cBatch ?? "").includes(String(input.cBatch))) return false;
      if (input.cSgSign && !String(j.cSgSign ?? "").includes(String(input.cSgSign))) return false;
      if (input.cSgStd && !String(j.cSgStd ?? "").includes(String(input.cSgStd))) return false;
      if (input.cOrderNo && !String(j.cOrderNo ?? "").includes(String(input.cOrderNo))) return false;
      if (input.cLineCode && !String(j.cLineCode ?? "").includes(String(input.cLineCode))) return false;
      if (input.cStatus != null && input.cStatus !== "" && Number(j.cStatus) !== Number(input.cStatus)) return false;
      if (input.cRecheckFlag != null && input.cRecheckFlag !== "" && Number(j.cRecheckFlag) !== Number(input.cRecheckFlag)) return false;
      if (!inTimeRange(j.createTime, input.createTime)) return false;
      return true;
    });
    return ok(config, rows);
  },

  /* 主表选中 → 取样要求 */
  [`post ${LIMS}/testJob/querySampleRequires`]: (config) => {
    const p = getParams(config);
    const id = p.tql3100Id as string | undefined;
    const rows = loadSamples().filter((s) => !id || s.fId === id);
    return ok(config, rows);
  },

  /* 主表选中 → 试验子项明细 */
  [`post ${LIMS}/testJob/query3200s`]: (config) => {
    const p = getParams(config);
    const testNo = p.testNo as string | undefined;
    const rows = loadDetails().filter((d) => !testNo || d.cTestNo === testNo);
    return ok(config, rows);
  },

  /* 保存取样要求：有提交行的委托（fId）整体替换 */
  [`post ${LIMS}/testJob/saveSampleRequires`]: (config) => {
    const list = (getBody<AnyObj[]>(config) ?? []) as AnyObj[];
    const fids = new Set(list.map((x) => x.fId).filter(Boolean));
    const kept = loadSamples().filter((s) => !fids.has(s.fId));
    saveJson(SAMPLES_KEY, [...kept, ...list.map((x) => ({ ...x }))]);
    return ok(config, null);
  },

  /* 保存并发送 */
  [`post ${LIMS}/testJob/sendTestJob`]: (config) => {
    const p = getParams(config);
    const list = (getBody<AnyObj[]>(config) ?? []) as AnyObj[];
    const jobs = loadJobs();
    const job = jobs.find((j) => j.id === p.id);
    if (job) {
      job.cStatus = 10;
      job.dSendTime = stamp();
      job.cSendUser = "admin";
    }
    saveJson(JOBS_KEY, jobs);
    if (list.length) {
      const fids = new Set(list.map((x) => x.fId).filter(Boolean));
      const kept = loadSamples().filter((s) => !fids.has(s.fId));
      saveJson(SAMPLES_KEY, [...kept, ...list.map((x) => ({ ...x }))]);
    }
    return ok(config, null);
  },

  /* 保存发送（加急） */
  [`post ${LIMS}/testJob/sendTestJobJiaJi`]: (config) => {
    const p = getParams(config);
    const list = (getBody<AnyObj[]>(config) ?? []) as AnyObj[];
    const jobs = loadJobs();
    const job = jobs.find((j) => j.id === p.id);
    if (job) {
      job.cStatus = 10;
      job.cJiaJi = 1;
      job.dSendTime = stamp();
      job.cSendUser = "admin";
    }
    saveJson(JOBS_KEY, jobs);
    if (list.length) {
      const fids = new Set(list.map((x) => x.fId).filter(Boolean));
      const kept = loadSamples().filter((s) => !fids.has(s.fId));
      saveJson(SAMPLES_KEY, [...kept, ...list.map((x) => ({ ...x }))]);
    }
    return ok(config, null);
  },

  /* 撤销发送 */
  [`post ${LIMS}/testJob/cancelSendTestJob`]: (config) => {
    const p = getParams(config);
    const jobs = loadJobs();
    const job = jobs.find((j) => j.id === p.id);
    if (job) {
      job.cStatus = 0;
      job.dSendTime = "";
      job.cSendUser = "";
    }
    saveJson(JOBS_KEY, jobs);
    return ok(config, null);
  },

  /* QL3100 查询委托（默认 statuses 过滤） */
  [`post ${LIMS}/qL3100/queryTestJob`]: (config) => {
    const input = getBody<AnyObj>(config) ?? {};
    const statuses = Array.isArray(input.statuses) && input.statuses.length ? input.statuses.map(Number) : null;
    const rows = loadJobs().filter((j) => {
      if (input.cTestNo && !String(j.cTestNo ?? "").endsWith(String(input.cTestNo))) return false;
      if (input.cStove && !String(j.cStove ?? "").includes(String(input.cStove))) return false;
      if (input.cBatch && !String(j.cBatch ?? "").includes(String(input.cBatch))) return false;
      if (input.cSgSign && !String(j.cSgSign ?? "").includes(String(input.cSgSign))) return false;
      if (input.cSgStd && !String(j.cSgStd ?? "").includes(String(input.cSgStd))) return false;
      if (input.cOrderNo && !String(j.cOrderNo ?? "").includes(String(input.cOrderNo))) return false;
      if (input.cLineCode && !String(j.cLineCode ?? "").includes(String(input.cLineCode))) return false;
      if (input.cRecheckFlag != null && input.cRecheckFlag !== "" && Number(j.cRecheckFlag) !== Number(input.cRecheckFlag)) return false;
      if (statuses && !statuses.includes(Number(j.cStatus))) return false;
      if (!inTimeRange(j.createTime, input.createTime)) return false;
      return true;
    });
    return ok(config, rows);
  },

  /* 登记（Receive） */
  [`post ${LIMS}/testJob/receive`]: (config) => {
    const ids = (getBody<AnyObj[]>(config) ?? []) as unknown as string[];
    const jobs = loadJobs();
    for (const j of jobs) {
      if (ids.includes(j.id) && (Number(j.cStatus) === 10 || Number(j.cStatus) === 25)) {
        j.cStatus = 20;
        j.dReceiveTime = stamp();
        j.dReceiveUser = "admin";
      }
    }
    saveJson(JOBS_KEY, jobs);
    return ok(config, null);
  },

  /* 取消登记（BatchCancelReceive） */
  [`post ${LIMS}/testJob/batchCancelReceive`]: (config) => {
    const ids = (getBody<AnyObj[]>(config) ?? []) as unknown as string[];
    const jobs = loadJobs();
    for (const j of jobs) {
      if (ids.includes(j.id) && Number(j.cStatus) === 20) {
        j.cStatus = 10;
        j.dReceiveTime = "";
        j.dReceiveUser = "";
      }
    }
    saveJson(JOBS_KEY, jobs);
    return ok(config, null);
  },

  /* 拒收（BatchReject） */
  [`post ${LIMS}/testJob/batchReject`]: (config) => {
    const p = getParams(config);
    const ids = (getBody<AnyObj[]>(config) ?? []) as unknown as string[];
    const jobs = loadJobs();
    for (const j of jobs) {
      if (ids.includes(j.id) && Number(j.cStatus) === 10) {
        j.cStatus = 25;
        j.cJudgeRemark = String(p.reason ?? "");
      }
    }
    saveJson(JOBS_KEY, jobs);
    return ok(config, null);
  },

  /* 删除取样要求 */
  [`post ${LIMS}/testJob/deleteSampleRequires`]: (config) => {
    const p = getParams(config);
    saveJson(SAMPLES_KEY, loadSamples().filter((s) => s.id !== p.id));
    return ok(config, null);
  },

  /* 标为未打印 */
  [`post ${LIMS}/testJob/reversePrint`]: (config) => {
    void config;
    return ok(config, null);
  },

  /* 新建委托（FrmQL3001 迁移后用） */
  [`post ${LIMS}/testJob/addTestJob`]: (config) => {
    const input = getBody<AnyObj>(config) ?? {};
    const jobs = loadJobs();
    const seq = String(jobs.length + 1).padStart(4, "0");
    const id = `TJ${seq}`;
    const testNo = `W${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${seq}`;
    jobs.push({
      selected: false,
      id,
      cTestNo: testNo,
      cStatus: 0,
      createTime: stamp(),
      nTestTimes: 1,
      cRecheckFlag: 0,
      cJiaJi: 0,
      ...input,
    });
    saveJson(JOBS_KEY, jobs);
    return ok(config, null);
  },

  /* ===== QL4000 检验结果录入：只登记占位（查询 ≤5 条演示行 / 写操作只回成功），不实现业务 ===== */

  /* 查询委托（ITestJobAppService.QueryTestJob） */
  [`post ${LIMS}/testJob/queryTestJob`]: (config) => {
    const input = getBody<AnyObj>(config) ?? {};
    // QL3200 会带 statuses；此时按种子委托过滤（QL4000 占位行保留给无 statuses 的调用）
    if (Array.isArray(input.statuses) && input.statuses.length) {
      const statuses = input.statuses.map(Number);
      const rows = loadJobs().filter((j) => {
        if (!statuses.includes(Number(j.cStatus))) return false;
        if (input.cTestNo && !String(j.cTestNo ?? "").endsWith(String(input.cTestNo))) return false;
        if (input.cStove && !String(j.cStove ?? "").includes(String(input.cStove))) return false;
        if (input.cBatch && !String(j.cBatch ?? "").includes(String(input.cBatch))) return false;
        if (input.cSgSign && !String(j.cSgSign ?? "").includes(String(input.cSgSign))) return false;
        if (input.cSgStd && !String(j.cSgStd ?? "").includes(String(input.cSgStd))) return false;
        if (input.cOrderNo && !String(j.cOrderNo ?? "").includes(String(input.cOrderNo))) return false;
        if (input.cLineCode && !String(j.cLineCode ?? "").includes(String(input.cLineCode))) return false;
        if (input.cRecheckFlag != null && input.cRecheckFlag !== "" && Number(j.cRecheckFlag) !== Number(input.cRecheckFlag)) return false;
        if (input.checkStatus != null && !inTimeRange(j.dReceiveTime, input.dReceiveTime === undefined ? input.createTime : undefined)) {
          /* fallthrough */
        }
        if (!inTimeRange(j.dReceiveTime, input.dReceiveTime)) return false;
        if (!inTimeRange(j.createTime, input.createTime)) return false;
        return true;
      });
      return ok(config, rows);
    }
    void input;
    return ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        selected: false,
        id: `QL4K-TJ${i + 1}`,
        cTestNo: `W2026092300${i + 1}`,
        cStove: `S100${i + 1}`,
        cBatch: `B26090${i + 1}`,
        cInternalNo: `IN00${i + 1}`,
        cSgSign: "Q235B",
        cSgStd: "GB/T 700",
        cStNo: "GB",
        cSpec: "10×100",
        nThick: 10,
        nWth: 100,
        nLen: 2000,
        cLineCode: "L1",
        cStatus: 20,
        cRecheckFlag: 0,
        nTestTimes: 1,
        cJiaJi: i === 1 ? 1 : 0,
        cCzpFlag: 0,
        cDeliveryStateDesc: "已交货",
        cCustStd: "结构件",
        cCustStdCode: "JZ",
        cDelivyStatusCode: "Y",
        cOrderNo: `PO26090${i + 1}`,
        orderCustCName: "演示客户",
        wgt: 1500,
        count: 12,
        cMatShape: "板材",
        currentItemCompleteFlag: 0,
        cAutoJudgeResult: 0,
        cJudgeResult: 0,
        createTime: stamp(),
        dReceiveTime: stamp(),
      })),
    );
  },

  /* 查询试样（ITestJobAppService.QueryTestSample，含 TestItems 明细） */
  [`post ${LIMS}/testJob/queryTestSample`]: (config) => {
    void config;
    const mk = (i: number) => {
      const tensile = i <= 2;
      return {
        selected: false,
        id: `QL4K-SMP${i}`,
        fId: "QL4K-TJ1",
        cTestNo: "W20260923001",
        cStove: `S100${i}`,
        cBatch: "B260901",
        cSgSign: "Q235B",
        cSgStd: "GB/T 700",
        cSampleNo: `S00${i}`,
        cTestItemType: tensile ? "P1" : "P3",
        cTestItemTypeDesc: tensile ? "拉伸" : "冲击",
        cTestItem: tensile ? "P1A" : "P3A",
        cTestItemName: tensile ? "拉伸试验" : "冲击试验",
        cSamplePosDesc: "头部",
        cSampleLenDesc: "标准试样",
        cTestDirectDesc: "横向",
        cJudgeResult: 0,
        cDisable: 0,
        labRemark: "",
        nTestTimes: 1,
        testItems: [
          {
            id: `QL4K-TI${i}1`,
            cTestSubItem: tensile ? "P101" : "P301",
            cTestSubItemName: tensile ? "下屈服强度" : "冲击功1",
            cTestSubItemDisplayName: tensile ? "下屈服" : "冲击功1",
            cValue: "",
            valueDisplay: "",
            nItemAccuracy: 1,
            isJudge: 1,
            isPrint: 1,
            needTest: 1,
            ctrlMode: 0,
            seq: 1,
            judgeRange: { min: tensile ? 235 : 27, max: tensile ? 450 : 200, equalsMethod: 1 },
            judgeRangeNk: { min: tensile ? 250 : 40, max: tensile ? 430 : 180, equalsMethod: 1 },
            cJudgeResult: 0,
          },
          {
            id: `QL4K-TI${i}2`,
            cTestSubItem: tensile ? "P102" : "P310",
            cTestSubItemName: tensile ? "抗拉强度" : "平均冲击功",
            cTestSubItemDisplayName: tensile ? "抗拉" : "平均冲击功",
            cValue: "",
            valueDisplay: "",
            nItemAccuracy: 1,
            isJudge: 1,
            isPrint: 1,
            needTest: 1,
            ctrlMode: 0,
            seq: 2,
            judgeRange: { min: tensile ? 370 : 27, max: tensile ? 600 : 200, equalsMethod: 1 },
            judgeRangeNk: { min: tensile ? 380 : 40, max: tensile ? 580 : 180, equalsMethod: 1 },
            cJudgeResult: 0,
          },
        ],
      };
    };
    return ok(config, [mk(1), mk(2), mk(3)]);
  },

  /* 保存试样 / 提交审核 / 备注 / 更新检验项目 → 只回成功 */
  [`post ${LIMS}/testJob/saveSamples`]: (config) => ok(config, null),
  [`post ${LIMS}/testJob/saveSample`]: (config) => ok(config, null),
  [`post ${LIMS}/testJob/completeItem`]: (config) => ok(config, null),
  [`post ${LIMS}/testJob/remark`]: (config) => ok(config, null),
  [`post ${LIMS}/testJob/updateTestJobItems`]: (config) => ok(config, null),

  /* 采集试验结果（tqlLXCollect 4 个读接口 ≤5 条演示行） */
  [`post ${LIMS}/tqlLXCollect/getTensileCollectDataByBatch`]: (config) =>
    ok(
      config,
      Array.from({ length: 2 }, (_, i) => ({
        id: `QL4K-P1${i + 1}`,
        cSampleNo: `S00${i + 1}`,
        cTestNo: "W20260923001",
        nYieLdStrength: 260.5 + i,
        nMaxStrength: 420 + i * 5,
        nFinalRate: 26 + i,
        nFinalShrink: 55 + i,
        nYieLdUpStrength: 270 + i,
        createTime: stamp(),
      })),
    ),
  [`post ${LIMS}/tqlLXCollect/getImpactCollectDataByBatch`]: (config) =>
    ok(
      config,
      Array.from({ length: 1 }, (_, i) => ({
        id: `QL4K-P3${i + 1}`,
        cSampleNo: "S003",
        cEnergy1: "80",
        cEnergy2: "85",
        cEnergy3: "90",
        cAveEnergy: "85",
        cDirection: "横向",
        cTemperature: "20",
        createTime: stamp(),
      })),
    ),
  [`post ${LIMS}/tqlLXCollect/getTensileCollectDataBySampleNos`]: (config) =>
    ok(
      config,
      Array.from({ length: 2 }, (_, i) => ({
        id: `QL4K-P1S${i + 1}`,
        cSampleNo: `S00${i + 1}`,
        nYieLdStrength: 261.5 + i,
        nMaxStrength: 425 + i * 5,
        nFinalRate: 27 + i,
        nFinalShrink: 56 + i,
        nYieLdUpStrength: 271 + i,
        createTime: stamp(),
      })),
    ),
  [`post ${LIMS}/tqlLXCollect/getImpactCollectDataBySampleNos`]: (config) =>
    ok(config, [
      {
        id: "QL4K-P3S1",
        cSampleNo: "S003",
        cEnergy1: "81",
        cEnergy2: "86",
        cEnergy3: "91",
        cAveEnergy: "86",
        cDirection: "横向",
        cTemperature: "20",
        createTime: stamp(),
      },
    ]),

  /* ===== QL1040 力学信息（FrmTqlLxCollect，查询 ≤5 条演示行） ===== */
  [`post ${LIMS}/tqlLXCollect/queryTqlLxCollects`]: (config) =>
    ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        id: `LX-${i + 1}`,
        selected: false,
        nOrder: i + 1,
        stoveNo: `S26C0${i + 1}`,
        testNo: `T00${i + 1}`,
        batchNo: `B2609${i + 1}`,
        slabPieceNo: `SLAB00${i + 1}`,
        cTestNo: `W2026092300${i + 1}`,
        cTestItem: "拉伸",
        cSampleNo: `S00${i + 1}`,
        cOperatorName: "admin",
        nStatus: 1,
        nCurOrder: i + 1,
        nTestCount: 3,
        nMaxLoad: 100.5 + i,
        nMaxStrength: 400 + i,
        nYieLdUpStrength: 350 + i,
        cTestTime: stamp(),
        cSendDevice: "LX-DEV",
        createTime: stamp(),
      })),
    ),
  [`post ${LIMS}/tqlLXCollect/queryTqlImpactCollects`]: (config) =>
    ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        id: `IM-${i + 1}`,
        selected: false,
        nOrder: i + 1,
        stoveNo: `S26C0${i + 1}`,
        testNo: `T00${i + 1}`,
        batchNo: `B2609${i + 1}`,
        slabPieceNo: `SLAB00${i + 1}`,
        cSampleNo: `S00${i + 1}`,
        nStatus: 1,
        cLength: "300",
        cWidth: "75",
        cThickness: "10",
        cNotchDepth: "2",
        cNotchType: "V",
        cDirection: "横向",
        cEnergy1: `${80 + i}`,
        cEnergy2: `${85 + i}`,
        cEnergy3: `${90 + i}`,
        cAveEnergy: `${85 + i}`,
        cTemperature: "20",
        cSendDevice: "IM-DEV",
        createTime: stamp(),
      })),
    ),

  /* ===== QL8100 检验结果查询（FrmQL8100 动态列，≤5 条演示行） ===== */
  [`post ${LIMS}/frmQL8100/query`]: (config) =>
    ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        cTestNo: `W2026092300${i + 1}`,
        cDelivyStatusCode: "01",
        cDeliveryStateDesc: "已交货",
        cStove: `S26C0${i + 1}`,
        cBatch: `B2609${i + 1}`,
        cSgSign: "Q235B",
        cSgStd: "GB/T 700",
        cSpec: "20*2200*C",
        thick: 20,
        width: 2200,
        len: 8000,
        cJudgeResult: 2,
        jyTime: stamp(),
        cSampleNo: `S00${i + 1}`,
        nTestTimes: 1,
        cRecheckFlag: 0,
        results: [
          { subItemCode: "P101", subItemName: "上屈服强度", cTestResult: "352.7", judgeResult: 2, typeCode: "1", testItem: "T001", testItemName: "拉伸" },
          { subItemCode: "P106", subItemName: "下屈服强度", cTestResult: "340.2", judgeResult: 2, typeCode: "1", testItem: "T001", testItemName: "拉伸" },
          { subItemCode: "P201", subItemName: "抗拉强度", cTestResult: "455.1", judgeResult: 3, typeCode: "2", testItem: "T002", testItemName: "冲击" },
        ],
      })),
    ),

  /* ===== QL3200 检验结果审核 ===== */
  [`post ${LIMS}/qL3200/queryTestSamplesBySampleRequires`]: (config) => {
    const input = getBody<AnyObj>(config) ?? {};
    const requires = loadSamples().find((s) => s.id === input.id) ?? input;
    const mk = (i: number, sr: AnyObj) => {
      const tensile = i <= 2;
      return {
        selected: false,
        id: `TS-${sr.id ?? "X"}-${i}`,
        tql3110Id: sr.id ?? null,
        fId: sr.fId ?? null,
        cTestNo: sr.cTestNo ?? null,
        cSampleNo: `S00${i}`,
        cTestItemType: sr.cTestItemType ?? (tensile ? "CH" : "CF"),
        cTestItemTypeDesc: sr.cTestItemTypeDesc ?? "力学",
        cTestItem: sr.cTestItem ?? "TS01",
        cTestItemName: sr.cTestItemName ?? "拉伸试验",
        cSamplePosDesc: sr.cSamplePosDesc ?? "头部",
        cSampleLenDesc: sr.cSampleLenDesc ?? "定尺",
        cTestDirectDesc: sr.cTestDirectDesc ?? "纵向",
        cJudgeResult: 0,
        cDisable: 0,
        labRemark: "",
        nTestTimes: sr.nTestTimes ?? 1,
        cTestUser: "lab01",
        dTestTime: stamp(),
        cShiftNo: "甲班",
        cGroupNo: "G1",
        cRecheckFlag: 0,
        creator: "lab01",
        createTime: stamp(),
        cWholeBacklogCode: sr.cWholeBacklogCode ?? null,
        testItems: [
          {
            id: `TIV-${sr.id ?? "X"}-${i}-1`,
            cTestSubItem: tensile ? "Rm" : "C",
            cTestSubItemName: tensile ? "抗拉强度" : "碳",
            cTestSubItemDisplayName: tensile ? "Rm" : "C",
            cValue: tensile ? "435" : "0.16",
            valueDisplay: tensile ? "435" : "0.16",
            nItemAccuracy: 1,
            isJudge: 1,
            isPrint: 1,
            needTest: 1,
            ctrlMode: 0,
            seq: 1,
            judgeRange: { min: tensile ? 370 : 0.12, max: tensile ? 500 : 0.2, equalsMethod: 1 },
            judgeRangeNk: { min: tensile ? 380 : 0.1, max: tensile ? 480 : 0.22, equalsMethod: 1 },
            cJudgeResult: 2,
            cTargetValue: tensile ? "435" : "0.16",
            cFormula: "",
            cJudgeFormula: "",
            formulaResult: true,
          },
          {
            id: `TIV-${sr.id ?? "X"}-${i}-2`,
            cTestSubItem: tensile ? "Rp02" : "Mn",
            cTestSubItemName: tensile ? "屈服强度" : "锰",
            cTestSubItemDisplayName: tensile ? "Rp0.2" : "Mn",
            cValue: tensile ? "255" : "0.5",
            valueDisplay: tensile ? "255" : "0.5",
            nItemAccuracy: 1,
            isJudge: 1,
            isPrint: 1,
            needTest: 1,
            ctrlMode: 0,
            seq: 2,
            judgeRange: { min: tensile ? 235 : 0.3, max: tensile ? 275 : 0.8, equalsMethod: 1 },
            judgeRangeNk: { min: tensile ? 240 : 0.35, max: tensile ? 270 : 0.7, equalsMethod: 1 },
            cJudgeResult: 2,
            cTargetValue: tensile ? "255" : "0.5",
            cFormula: "",
            cJudgeFormula: "",
            formulaResult: true,
          },
        ],
      };
    };
    return ok(config, [mk(1, requires), mk(2, requires)]);
  },

  /* 审核 / 批量报出 / 撤销（回写 SampleRequires.cCheckStatus） */
  [`post ${LIMS}/qL3200/check`]: (config) => {
    const p = getParams(config);
    const ids = (getBody<AnyObj[]>(config) ?? []) as unknown as string[];
    const status = Number(p.status);
    const rows = loadSamples().map((s) =>
      ids.includes(s.id) ? { ...s, cCheckStatus: status, cCheckUser: "admin", dCheckTime: stamp() } : s,
    );
    saveJson(SAMPLES_KEY, rows);
    return ok(config, null);
  },
  [`post ${LIMS}/qL3200/passMulti`]: (config) => {
    const ids = (getBody<AnyObj[]>(config) ?? []) as unknown as string[];
    const rows = loadSamples().map((s) =>
      ids.includes(s.fId) ? { ...s, cCheckStatus: 2, cCheckUser: "admin", dCheckTime: stamp() } : s,
    );
    saveJson(SAMPLES_KEY, rows);
    return ok(config, null);
  },
  [`post ${LIMS}/qL3200/revertCheck`]: (config) => {
    const ids = (getBody<AnyObj[]>(config) ?? []) as unknown as string[];
    const rows = loadSamples().map((s) =>
      ids.includes(s.id) ? { ...s, cCheckStatus: 1, cCheckUser: "", dCheckTime: "" } : s,
    );
    saveJson(SAMPLES_KEY, rows);
    return ok(config, null);
  },
  [`post ${LIMS}/testJob/collectTestData`]: (config) => {
    void config;
    return ok(config, null);
  },
  /* QL2000 占位：≤5 条演示，不实现业务 */
  [`post ${LIMS}/stoveChemicalCompositionTest/queryStoveSamples`]: (config) =>
    ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        id: `DEMO-ST${i + 1}`,
        cPoNo: `PO${260901 + i}`,
        cStove: `L200${i + 1}`,
        cpStove: "",
        cSgSign: "Q235B",
        cSgStd: "GB/T 700",
        cStNo: "GB/T 700",
        cOrderNo: `DD${i + 1}`,
        cOrderTsyq: "",
        cLineCode: "LG01",
        cMachine: "1#",
        cRouteCode: "LF",
        nThick: 10,
        nWth: 1500,
        nLen: 0,
        nPlanWgt: 100,
        cSpec: "10×1500",
        cIngotCode: "Q",
        recheckFlag: 0,
        cJudgeResult: 0,
        cConfirmFlag: 0,
        dProdTime: stamp(),
        samples: [
          {
            id: `DEMO-SMP${i + 1}`,
            cStove: `L200${i + 1}`,
            cStNo: "GB/T 700",
            cSampleNo: `C00${i + 1}`,
            cGw: "W1",
            cSendUser: "lab01",
            dSendTime: stamp(),
            cJudgeResult: 0,
            cRecheckFlag: 0,
            cFinalFlag: i === 0 ? 1 : 0,
            cTestUser: "",
            dTestTime: "",
            cDisable: 0,
          },
        ],
      })),
    ),
  [`post ${LIMS}/stoveChemicalCompositionTest/getSamplesItems`]: (config) =>
    ok(
      config,
      Array.from({ length: 4 }, (_, i) => ({
        cCode: ["C", "Si", "Mn", "P"][i],
        cName: ["C", "Si", "Mn", "P"][i],
        nValue: i < 2 ? 0.12 + i * 0.1 : null,
        valueDisplay: i < 2 ? (i === 0 ? "0.12" : "0.35") : "",
        stdRange: { min: 0.05, max: 0.25, equalsMethod: 1 },
        mainRange: { min: 0.06, max: 0.22, equalsMethod: 1 },
        speRange: { min: 0.08, max: 0.2, equalsMethod: 1 },
        stdAccuracy: 2,
        cFormula: "",
        isJudge: 1,
        isPrint: 1,
        cCtrlFlag: 0,
        judgeResult: i < 2 ? 2 : 0,
      })),
    ),
  [`post ${LIMS}/stoveChemicalCompositionTest/saveItemResult`]: (config) => ok(config, null),
  [`post ${LIMS}/stoveChemicalCompositionTest/stoveConfirm`]: (config) => ok(config, null),
  [`post ${LIMS}/stoveChemicalCompositionTest/setFinalSample`]: (config) => ok(config, null),
  [`post ${LIMS}/stoveChemicalCompositionTest/addSample`]: (config) => ok(config, null),

  /* ===== QL1130 成分信息（FrmTqlCfCollect）：只登记占位，≤5 条演示行 ===== */
  [`post ${LIMS}/tqlCFCollect/queryTqlCfCollects`]: (config) => {
    void config;
    return ok(
      config,
      Array.from({ length: 4 }, (_, i) => ({
        selected: false,
        id: `CF${i + 1}`,
        cSampNo: `YH2609230${i + 1}`,
        cMeltingNo: `R260901${i + 1}`,
        cStove: `L300${i + 1}`,
        cSgCode: "Q235B",
        cSgStd: "GB/T 700",
        cStaCode: "W1",
        cCheckTime: stamp(),
        cShift: "白班",
        cGroup: "甲班",
        nStatus: 1,
        c: 0.12 + i * 0.01,
        si: 0.22,
        mn: 0.45,
        p: 0.012,
        s: 0.008,
        cr: 0.03,
        ni: 0.01,
        mo: 0.002,
        cu: 0.01,
        al: 0.02,
        ti: 0.002,
        nb: 0.001,
        v: 0.001,
        als: 0.015,
        ca: 0.002,
        ceq: 0.22,
        b: 0,
        alins: 0.001,
        w: 0,
        as: 0.001,
        sn: 0.001,
        co: 0,
        pb: 0,
        sb: 0,
        ta: 0,
        zr: 0,
        bi: 0,
        se: 0,
        te: 0,
        ce: 0,
        la: 0,
        n: 0.004,
        cRemark: "",
        creator: "admin",
        createTime: stamp(),
        lastModifier: "admin",
        lastModifyTime: stamp(),
      })),
    );
  },

  /* ===== QL9010 委托单信息查询：只登记占位（查询 ≤5 条演示行），不实现业务 ===== */
  [`post ${LIMS}/qL9010/queryTestJob`]: (config) => {
    void config;
    return ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        selected: false,
        id: `QL9-TJ${i + 1}`,
        cTestNo: `W2026092310${i + 1}`,
        cStove: `S200${i + 1}`,
        cBatch: `B26091${i + 1}`,
        cInternalNo: `IN90${i + 1}`,
        cSgSign: "Q235B",
        cSgStd: "GB/T 700",
        cStNo: "GB",
        cSpec: "10×100",
        nThick: 10,
        nWth: 100,
        nLen: 2000,
        cLineCode: "LG01",
        cStatus: 20,
        cRecheckFlag: 0,
        nTestTimes: 1,
        cJiaJi: i === 1 ? 1 : 0,
        cOrderNo: `PO26091${i + 1}`,
        orderCustCName: "演示客户",
        currentItemCompleteFlag: 0,
        cAutoJudgeResult: 0,
        cJudgeResult: 0,
        createTime: stamp(),
        dReceiveTime: stamp(),
        dSendTime: stamp(),
      })),
    );
  },
  [`post ${LIMS}/qL9010/querySamples`]: (config) => {
    void config;
    return ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        selected: false,
        id: `QL9-SMP${i + 1}`,
        fId: "QL9-TJ1",
        cTestNo: "W20260923101",
        cSampleNo: `S10${i + 1}`,
        cTestItemType: "P1",
        cTestItemTypeDesc: "拉伸",
        cTestItem: "P1A",
        cTestItemName: "拉伸试验",
        cSamplePosDesc: "头部",
        cJudgeResult: 0,
        labRemark: "",
        testItems: [
          {
            id: `QL9-TI${i + 1}`,
            cTestSubItem: "P101",
            cTestSubItemName: "下屈服强度",
            cValue: "",
            valueDisplay: "",
            nItemAccuracy: 1,
            isJudge: 1,
            isPrint: 1,
            needTest: 1,
            ctrlMode: 0,
            seq: 1,
            judgeRange: { min: 235, max: 450, equalsMethod: 1 },
            judgeRangeNk: { min: 250, max: 430, equalsMethod: 1 },
            cJudgeResult: 0,
          },
        ],
      })),
    );
  },
  [`post ${LIMS}/qL9010/querySampleRequires`]: (config) => {
    void config;
    return ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        id: `QL9-SR${i + 1}`,
        fId: "QL9-TJ1",
        cTestNo: "W20260923101",
        cTestItemType: "P1",
        cTestItemTypeDesc: "拉伸",
        cTestItem: "P1A",
        cTestItemName: "拉伸试验",
        nTestNum: 2,
        nSampleNumRnd: 2,
        cSamplePosDesc: "头部",
        cTestPurposeDesc: "性能",
        cCompleteFlag: 0,
        cJudgeResult: 0,
        selected: false,
        createTime: stamp(),
      })),
    );
  },

  /* QL1140 铁水成分查询占位：≤5 条演示；写操作不适用 */
  [`post ${LIMS}/tqlCFCollect/queryTqlCfCollectsTs`]: (config) =>
    ok(
      config,
      Array.from({ length: 3 }, (_, i) => ({
        id: `DEMO-CF-TS-${i + 1}`,
        selected: false,
        creator: "admin",
        createTime: "2026-09-20 10:00:00",
        lastModifier: "",
        lastModifyTime: "",
        nStatus: 1,
        cStove: `L11${i + 1}`,
        cSgCode: "Q235B",
        cSgStd: "GB/T 700",
        cStaCode: "W1",
        cSampNo: `TS00${i + 1}`,
        cMeltingNo: `M${260901 + i}`,
        cCheckTime: "2026-09-20 08:30:00",
        cShift: "甲班",
        cGroup: "G1",
        c: 0.12 + i * 0.01,
        si: 0.22,
        mn: 0.45,
        p: 0.018,
        s: 0.012,
        cr: 0.05,
        ni: 0.02,
        mo: 0.01,
        cu: 0.02,
        al: 0.03,
        ti: 0.002,
        nb: 0.001,
        v: 0.01,
        als: 0.025,
        ca: 0.002,
        ceq: 0.32,
        b: 0.0002,
        alins: 0.01,
        w: 0.01,
        as: 0.004,
        sn: 0.002,
        co: 0.001,
        pb: 0.001,
        sb: 0.001,
        ta: 0.001,
        zr: 0.001,
        bi: 0.0001,
        se: 0.0001,
        te: 0.0001,
        ce: 0.001,
        la: 0.001,
        n: 0.004,
        cRemark: "",
      })),
    ),

  /* 质量判定重迁占位 2026-09-23 */
  ["post /dDH.Service.LIMS.Services/tql1060/queryStorage"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/tql1060/queryRecord"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/tql1060/setDisable"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/tql1070/queryStorage"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/tql1070/queryRecord"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/tql1070/queryTql1070"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/tql1070/setDisable"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/qZ5000/queryCpcf"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/testJob/batchAutoJudge"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/stoveCFRecord/queryRecord"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/stoveCFRecord/queryProcessRecord"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/tql1050/addImages"]: (config) => ok(config, null),

  /* QZ6000 补漏 */
  ["post /dDH.Service.LIMS.Services/testJob/queryAllSamples"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.LIMS.Services/stoveChemicalCompositionTest/syncStoveCf"]: (config) => ok(config, null),

  /* 质量判定 LIMS 补漏 2026-09-23 */
  ["post /dDH.Service.LIMS.Services/tql2001/queryStoveInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cTestNo: `T2609${i + 1}`, cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}` })),
    ),
  ["post /dDH.Service.LIMS.Services/tql2001/queryStoveData"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cTestNo: `T2609${i + 1}`, cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}` })),
    ),
  ["post /dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryFinalOrDisableSamples"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cTestNo: `T2609${i + 1}`, cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}` })),
    ),
  ["post /dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryFinalSample"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cTestNo: `T2609${i + 1}`, cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}` })),
    ),
  ["post /dDH.Service.LIMS.Services/stoveChemicalCompositionTest/recheck"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/stoveChemicalCompositionTest/getStoveTestStds"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cTestNo: `T2609${i + 1}`, cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}` })),
    ),
  ["post /dDH.Service.LIMS.Services/stoveChemicalCompositionTest/stoveAutoJudge"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/testJob/queryTestJobMainForJudge"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cTestNo: `T2609${i + 1}`, cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}` })),
    ),
  ["post /dDH.Service.LIMS.Services/testJob/changeJudgeResult"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/testJob/checkComplexDecide"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/testJob/queryRecheckSampleRequires"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cTestNo: `T2609${i + 1}`, cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}` })),
    ),
  ["post /dDH.Service.LIMS.Services/testJob/labRecheck"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/testJob/qMRecheck"]: (config) => ok(config, null),
  ["post /dDH.Service.LIMS.Services/testJob/querySamplesByTestNo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cTestNo: `T2609${i + 1}`, cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}` })),
    ),
};

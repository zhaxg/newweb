import type {
  BinChangeRecord,
  BlendPile,
  DowntimeRecord,
  InputOutputQuality,
  ProductionInput,
  ProductionOutput,
  ProcessCollectData,
  SupplyRecord,
  TankStock,
} from "@/api/mes4tq/types";
import { PROCESS_SEQ, SILO_BINS, UNITS, materialByName, unitsOfProcess } from "./org";
import { SHIFT_CODES, between, dayOffset, pick, stamp } from "./model";
import { PEOPLE } from "./people";

/**
 * TW 工序作业的**共享表**：料仓变料 / 投料实绩 / 收料实绩 / 停机 / 槽存 / 供料 / 采集数据。
 *
 * 为什么这七个实体放一个文件而不是按工序拆：它们是**同一张表的六个工序切片**——
 * `ProductionInput` 在原料页看到的是混匀投料、在高炉页看到的是料批投料，
 * 数据源完全同构（都是 TPP_2100）。按工序拆会得到六份几乎一样的生成逻辑，
 * 改一处漏五处，而客户在工序统计页会把六道工序的行混着看——**同源才对得上**。
 *
 * ⚠️ 业务数字（产量、系数、成本、偏差）一律不在这儿生成——那些只能由 `model.ts` 的
 * 派生函数算。本文件只负责铺**行本身**：单号、时间、班组、人名、料号这些不可再分的量。
 *
 * 确定性：所有随机走 `model.rng/between/pick`，seed 从业务键拼
 * （`in|${process}|${date}|${unit}|${i}`），所以同一页面刷新两次是同一批数。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. 各工序的物料流向（喂给生成器）
   ══════════════════════════════════════════════════════════════════════════ */

interface Flow {
  /** 投入的料（按顺序取，循环） */
  inMats: string[];
  /** 产出的料 */
  outMat: string;
  /** 每天每台机组铺几条投料记录 */
  perUnitDay: number;
}

/**
 * 六道工序的物料流。口径照规格书 A3 各页的描述：
 * 原料「各单品种矿→混匀配料仓」、烧结「混匀料+熔剂+燃料+返矿」、
 * 球团「精粉+膨润土+返矿」、高炉「矿焦比/喷煤」——**投什么料是工艺事实**，
 * 编错了客户（尤其工长）第一眼就能看出来。
 */
const FLOWS: Record<string, Flow> = {
  raw: { inMats: ["澳粉", "巴西粉", "精粉", "返矿"], outMat: "混匀料", perUnitDay: 6 },
  coke: { inMats: ["焦煤", "肥煤", "气煤", "瘦煤", "1/3焦煤"], outMat: "焦炭", perUnitDay: 6 },
  pellet: { inMats: ["精粉", "膨润土", "返矿"], outMat: "球团矿", perUnitDay: 6 },
  sinter: { inMats: ["混匀矿", "石灰石", "焦粉", "返矿"], outMat: "烧结矿", perUnitDay: 7 },
  lime: { inMats: ["石灰石"], outMat: "白灰块", perUnitDay: 5 },
  blast: { inMats: ["烧结矿", "球团矿", "焦炭", "焦丁", "块矿"], outMat: "铁水", perUnitDay: 7 },
};

/* ══════════════════════════════════════════════════════════════════════════
   2. 料仓变料实绩（TPA_1041）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 料仓变料：每个工序的每个料仓，近 7 天各变 2~4 次。
 *
 * 变料时间落在**当前生产日的 A 班**为主（变料通常在交接班后第一件事做），
 * 再往前补几天的历史，好让「按时间筛」这条真能筛出东西——
 * 全是今天的行，日期区间筛选就形同虚设。
 *
 * `nPercent`（混料配比）只在原料与烧结工序给：别的工序一个仓只放一种料，
 * 「配比」没有意义，给 100% 反而误导。
 */
export const BIN_CHANGES: BinChangeRecord[] = PROCESS_SEQ.flatMap((process) =>
  unitsOfProcess(process).flatMap((unit) =>
    SILO_BINS.filter((s) => s.workstationCode === unit.id).flatMap((bin, bi) =>
      Array.from({ length: 3 }, (_, k) => {
        const day = -(k % 7);
        const date = dayOffset(day);
        const flow = FLOWS[process];
        const seed = `bin|${process}|${bin.binCode}|${date}|${k}`;
        /* 新料种取本工序物料流的下一项——「换料」要有变化，变完还是原来那个料看不出动作 */
        const fromMat = flow.inMats[(bi + k) % flow.inMats.length];
        const toMat = flow.inMats[(bi + k + 1) % flow.inMats.length];
        const mat = materialByName(toMat);
        const hh = String(6 + Math.floor(between(0, 12, `h|${seed}`, 0))).padStart(2, "0");
        const mm = String(Math.floor(between(0, 60, `m|${seed}`, 0))).padStart(2, "0");
        const operator = pick(PEOPLE, `op|${seed}`);
        return {
          id: `BC-${process.toUpperCase()}-${bi + 1}${k}`,
          binCode: bin.binCode,
          feedTime: stamp(date, `${hh}:${mm}`),
          storeroomCode: "",
          storepositionCode: "",
          mtrlConsumeType: 1,
          product: mat?.group ?? "",
          matrlId: mat?.id ?? "",
          batchNo: `B${date.replace(/-/g, "").slice(2)}${String(bi + 1).padStart(2, "0")}`,
          suppId: "",
          /* 只有配混工序才有配比；其余工序的仓是单料仓，给空而不是给 100 */
          nPercent:
            process === "raw" || process === "sinter" || process === "pellet"
              ? Math.round(between(40, 100, `p|${seed}`, 1))
              : undefined,
          process,
          operator: operator.name,
          remark: k === 0 ? `${fromMat} → ${toMat}` : "",
        } satisfies BinChangeRecord;
      }),
    ),
  ),
);

/* ══════════════════════════════════════════════════════════════════════════
   3. 投料实绩（TPP_2100）/ 收料实绩（TPP_2200）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 投料实绩：近 7 天 × 本工序机组 × 每机组每天 N 条。
 *
 * 三条**与真实表逐字对齐**的字段（`dataStatus`/`dataType`/`bizState`）不是摆设：
 * `dataType=1`（采集）的行来自 L2 上抛，`0`（人工）是补录，`2`（调账）是月末调整——
 * 客户问「这个数哪来的」时，`dataType` 列就是答案；
 * `dataStatus=1`（作废）的行必须**留在表里但算不进合计**，作废的数据看不见就等于没做审计。
 *
 * `h2o`（水分）与 `wetWeight`/`dryWeight` 三者要自洽：`dryWeight = wetWeight / (1 + h2o/100)`。
 * 这条不等式列上算得出来，客户拿计算器一按就知道 mock 是不是随手编的。
 */
export const INPUTS: ProductionInput[] = PROCESS_SEQ.flatMap((process) => {
  const flow = FLOWS[process];
  return unitsOfProcess(process).flatMap((unit) =>
    Array.from({ length: 7 * flow.perUnitDay }, (_, i) => {
      const day = -(6 - Math.floor(i / flow.perUnitDay));
      const date = dayOffset(day);
      const shift = SHIFT_CODES[i % 3];
      const seed = `in|${process}|${unit.id}|${date}|${i}`;
      const mat = materialByName(flow.inMats[i % flow.inMats.length]);
      const wet = Math.round(between(120, 980, `w|${seed}`, 1));
      const h2o = between(5.8, 12.4, `h|${seed}`, 2);
      const dry = Math.round((wet / (1 + h2o / 100)) * 100) / 100;
      const hh = String(6 + (i % 18)).padStart(2, "0");
      const mm = String((i * 7) % 60).padStart(2, "0");
      const bin = SILO_BINS.find((b) => b.workstationCode === unit.id);
      return {
        id: `IN-${process.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
        workshopId: unit.workshopId,
        unitId: unit.id,
        materialId: mat?.id ?? "",
        lbId: bin?.binCode ?? "",
        moveType: "101",
        batchNo: `B${date.replace(/-/g, "").slice(2)}${String((i % 9) + 1).padStart(2, "0")}`,
        /* 高炉料批号只在高炉有（`glBatch` 是高炉专属，别的工序给空） */
        stoveNo: process === "blast" ? `${(i % 3) + 1}#` : process === "sinter" ? `${(i % 2) + 1}#` : undefined,
        /* 采集为主、偶尔人工补录、个别调账——三种来源都要有，否则 dataType 列全是 1 */
        dataType: i % 13 === 0 ? 0 : i % 29 === 0 ? 2 : 1,
        dataStatus: i % 37 === 0 ? 1 : 0,
        bizState: i % 3 === 0 ? 1 : 0,
        wetWeight: wet,
        dryWeight: dry,
        h2o,
        weighMode: i % 4 === 0 ? 2 : 1,
        inputTime: stamp(date, `${hh}:${mm}`),
        prodDate: date,
        team: pick(["T-A", "T-B", "T-C", "T-D"], `tm|${seed}`),
        shift,
        glBatch: process === "blast" ? (i % 12) + 1 : undefined,
        pljhId: `BP-${process.toUpperCase()}-001`,
        suppId: "",
        process,
        remark: i % 37 === 0 ? "采集中断，作废重传" : "",
      } satisfies ProductionInput;
    }),
  );
});

/**
 * 收料实绩：与投料**同批次同班**，所以 `batchNo` 与投料行对得上——
 * 客户在工序统计页把投料和收料并排看时，两边的批次能对上，账才讲得通。
 *
 * 高炉的 `stoveNo` 必填、`direction` 是铁水去向（0=炼钢 1=铸铁），
 * `ctk` 出铁口也只在高炉给——这三个是产出侧的高炉专属字段。
 */
export const OUTPUTS: ProductionOutput[] = PROCESS_SEQ.flatMap((process) => {
  const flow = FLOWS[process];
  return unitsOfProcess(process).flatMap((unit) =>
    Array.from({ length: 7 * 4 }, (_, i) => {
      const day = -(6 - Math.floor(i / 4));
      const date = dayOffset(day);
      const shift = SHIFT_CODES[i % 3];
      const seed = `out|${process}|${unit.id}|${date}|${i}`;
      const mat = materialByName(flow.outMat);
      const wet = Math.round(between(300, 2400, `w|${seed}`, 1));
      const h2o = between(3.2, 9.6, `h|${seed}`, 2);
      const dry = Math.round((wet / (1 + h2o / 100)) * 100) / 100;
      const hh = String(7 + (i % 17)).padStart(2, "0");
      const mm = String((i * 11) % 60).padStart(2, "0");
      return {
        id: `OUT-${process.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
        workshopId: unit.workshopId,
        unitId: unit.id,
        materialId: mat?.id ?? "",
        batchNo: `B${date.replace(/-/g, "").slice(2)}${String((i % 9) + 1).padStart(2, "0")}`,
        /* 产出侧炉号必填（`ProductionOutput` 的 `stoveNo` 非可选） */
        stoveNo: process === "blast" ? `${(i % 3) + 1}#` : process === "sinter" ? `${(i % 2) + 1}#` : `${(i % 3) + 1}#`,
        dataType: i % 11 === 0 ? 0 : 1,
        dataStatus: i % 31 === 0 ? 1 : 0,
        bizState: i % 2 === 0 ? 1 : 0,
        wetWeight: wet,
        dryWeight: dry,
        h2o,
        weighMode: 1,
        outputTime: stamp(date, `${hh}:${mm}`),
        prodDate: date,
        team: pick(["T-A", "T-B", "T-C", "T-D"], `tm|${seed}`),
        shift,
        /* 铁水去向只在高炉有意义：0=炼钢、1=铸铁；铸铁走的是小铁块，占少数 */
        ctk: process === "blast" ? ["1号", "2号", "3号"][i % 3] : undefined,
        direction: process === "blast" ? (i % 9 === 0 ? 1 : 0) : undefined,
        testNo: `TQL${date.replace(/-/g, "").slice(2)}${String(i + 1).padStart(3, "0")}`,
        process,
        remark: "",
      } satisfies ProductionOutput;
    }),
  );
});

/**
 * 投收料质量明细（TPP_2900）：每条实绩挂 3~4 个检验项。
 *
 * 检验项**按工序给**：烧结看 TFe/SiO2/CaO、高炉看 Si/Mn/S/P、
 * 焦化看水分/挥发分/灰分、球团看抗压强度——给错了客户会问
 * 「烧结矿怎么验 Si/Mn/P」。
 */
const QUALITY_ITEMS: Record<string, string[]> = {
  raw: ["TFe", "SiO2", "Al2O3", "H2O"],
  coke: ["M40", "M10", "Vdaf", "Ad"],
  pellet: ["TFe", "SiO2", "抗压强度", "转鼓指数"],
  sinter: ["TFe", "SiO2", "CaO", "FeO"],
  lime: ["CaO", "活性度", "SiO2", "MgO"],
  blast: ["Si", "Mn", "S", "P"],
};

/** 与 `INPUTS`/`OUTPUTS` 的 `batchNo` 同源，所以从实绩页点开质量明细能对上批次 */
export const IO_QUALITIES: InputOutputQuality[] = [...INPUTS.slice(0, 160), ...OUTPUTS.slice(0, 160)].flatMap((row) => {
  const items = QUALITY_ITEMS[row.process ?? "raw"];
  return items.map((item, k) => {
    const seed = `iq|${row.id}|${item}`;
    /* 检验值给的是**字符串**——照真实表 `C_VALUE`，可转 decimal，
         前端展示层再转数（写死 number 会让「7.420」这种带前导零的原始值丢信息） */
    const v = item === "TFe" ? between(54.2, 62.8, `t|${seed}`, 2) : between(0.02, 12.5, `x|${seed}`, 3);
    return {
      id: `IQ-${row.id}-${k}`,
      businessId: row.id,
      testItem: item,
      value: String(v),
      time: (row as any).inputTime ?? (row as any).outputTime ?? "",
    } satisfies InputOutputQuality;
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. 停机记录（TPP_1050）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 机组停机：只给**会停的**机组（烧结机、竖炉、竖窑、高炉、焦炉）。
 * 混匀线与配煤系统是连续供料系统，演示里不停——全铺一遍会显得哪都在停机。
 *
 * 类型分布刻意 60% 计划停机、40% 异常：全是计划检修不像生产、全是故障不像管理，
 * 而 `status="N"`（作废）的行必须留着——作废的记录看不见就等于没有审计。
 */
const STOPPABLE = new Set(["烧结机", "竖炉", "竖窑", "高炉", "焦炉"]);

export const DOWNTIMES: DowntimeRecord[] = UNITS.filter((u) => STOPPABLE.has(u.type)).flatMap((unit) =>
  Array.from({ length: 8 }, (_, i) => {
    const day = -(i % 7);
    const date = dayOffset(day);
    const seed = `dt|${unit.id}|${date}|${i}`;
    const isPlan = rng2(seed) < 0.6;
    const startH = 1 + Math.floor(between(0, 22, `s|${seed}`, 0));
    const startM = Math.floor(between(0, 60, `sm|${seed}`, 0));
    const dur = Math.round(between(25, 460, `d|${seed}`, 0));
    const endTotal = startH * 60 + startM + dur;
    const endH = Math.min(23, Math.floor(endTotal / 60));
    const endM = endTotal % 60;
    const typeName = isPlan ? "计划停机" : "异常停机";
    return {
      id: `DT-${unit.id}-${String(i + 1).padStart(3, "0")}`,
      startTime: stamp(date, `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`),
      endTime: stamp(date, `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`),
      unitId: unit.id,
      /* `type`/`reason` 在真实表里是字母码（A/B/C），本域用中文——
         `cells.ts` 的 `TAG_CLASS` 按中文配色，给字母码会全灰 */
      type: typeName,
      reason: isPlan ? pick(["内部原因", "其他"], `r|${seed}`) : pick(["内部原因", "外部原因", "其他"], `r2|${seed}`),
      minutes: dur,
      process: processOfUnit(unit.id),
      remark: isPlan ? "计划检修" : i % 4 === 0 ? "设备故障" : "",
      /* 作废行保留但标 N：作废的记录在真实系统里也要查得到 */
      status: i % 9 === 0 ? "N" : "Y",
    } satisfies DowntimeRecord;
  }),
);

/* ══════════════════════════════════════════════════════════════════════════
   4.5 混匀料堆实绩（TPP_1010，TW0102 与 TB0001 共用）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 混匀料堆：近 14 天的开铺/封堆记录。
 *
 * **`isVirtual`（直供烧结虚拟堆）那一行是这一页的看点**——它没有实际堆存，
 * 是混匀线直接供烧结的「账上堆」。规格书 TPP_1010 的 `N_IS_VIRTUAL` 就是为它设的，
 * 演示时客户会问「为什么这个堆没有堆号位置」，答案就是它是虚拟堆。
 *
 * `endTime` 为空 = **还没封堆**（在堆）。封堆后 `qty` 才定稿——
 * 这是 B2 的 `D_END_TIME 未封堆=null` 的原话，页面要把空显示成「在堆」而不是「—」。
 */
export const BLEND_PILES: BlendPile[] = Array.from({ length: 14 }, (_, i) => {
  const date = dayOffset(-i);
  const seed = `pile|${date}`;
  const closed = i % 3 !== 0;
  const virtual = i === 4;
  const q = Math.round(between(6800, 14200, `q|${seed}`, 0));
  return {
    id: `BP-${date.replace(/-/g, "")}`,
    begTime: stamp(date, "06:30"),
    endTime: closed ? stamp(date, "17:45") : undefined,
    unitId: pick(["HY01-01", "HY01-02"], `u|${seed}`),
    pileNo: `HY${date.replace(/-/g, "").slice(2)}`,
    storePositionId: `SR-03-P${String((i % 6) + 1).padStart(2, "0")}`,
    planId: "BP-RAW-001",
    isVirtual: virtual,
    d202BegTime: stamp(date, "07:10"),
    d202EndTime: closed ? stamp(date, "17:20") : undefined,
    yhPljh: `YH${date.replace(/-/g, "").slice(2)}`,
    flagDel: false,
    qty: closed ? q : Math.round(q * 0.62),
    status: virtual ? "直供烧结" : closed ? "已封堆" : "堆料中",
    remark: virtual ? "虚拟堆：不实际落地，混匀料直供烧结" : "",
  } satisfies BlendPile;
});

/* ══════════════════════════════════════════════════════════════════════════
   5. 烧结料仓槽存（TPA_1043）
   ══════════════════════════════════════════════════════════════════════════ */

/** 槽存只有烧结有（`TWS001` 的右表「槽存」列），别的工序的仓存是料仓台账的 `levelPct` */
export const TANK_STOCKS: TankStock[] = unitsOfProcess("sinter").flatMap((unit) =>
  Array.from({ length: 7 * 3 }, (_, i) => {
    const day = -(6 - Math.floor(i / 3));
    const shift = SHIFT_CODES[i % 3];
    const date = dayOffset(day);
    const seed = `tank|${unit.id}|${date}|${shift}`;
    const mat = materialByName(FLOWS.sinter.inMats[i % 4]);
    return {
      id: `TS-${unit.id}-${String(i + 1).padStart(3, "0")}`,
      date,
      workshopId: unit.workshopId,
      workstationId: unit.id,
      shift,
      product: mat?.group ?? "",
      matrlId: mat?.id ?? "",
      batchNo: "",
      /* 槽存是 0-100 的百分比（`cells.ts` 的 `levelBarRenderer` 吃它），
         与料仓台账的 `levelPct` 同一个量纲——两列在同一屏出现时不能一列是 % 一列是吨 */
      tankStock: Math.round(between(8, 96, `tk|${seed}`, 0)),
    } satisfies TankStock;
  }),
);

/* ══════════════════════════════════════════════════════════════════════════
   6. 供料作业记录（TW0105）与采集数据（TPP_3000）
   ══════════════════════════════════════════════════════════════════════════ */

/** 向烧结/球团/高炉供料——原料工序的出口，与下游的投料实绩同一批料 */
export const SUPPLIES: SupplyRecord[] = Array.from({ length: 7 * 3 * 4 }, (_, i) => {
  const day = -(6 - Math.floor(i / 12));
  const date = dayOffset(day);
  const shift = SHIFT_CODES[i % 3];
  const seed = `sup|${date}|${i}`;
  const dest = pick(["1#烧结机", "2#烧结机", "1#竖炉", "3#竖炉", "1#高炉", "2#高炉", "3#高炉"], `d|${seed}`);
  const mat = materialByName(pick(["混匀矿", "烧结矿", "球团矿", "焦炭"], `m|${seed}`));
  return {
    id: `SUP-${date.replace(/-/g, "")}-${String(i + 1).padStart(4, "0")}`,
    process: "raw",
    date,
    shift,
    fromUnit: pick(["HY01-01", "HY01-02"], `f|${seed}`),
    toUnit: dest,
    materialId: mat?.id ?? "",
    materialName: mat?.name ?? "",
    qty: Math.round(between(180, 940, `q|${seed}`, 0)),
    unit: "t",
    beginTime: stamp(date, `${String(6 + (i % 18)).padStart(2, "0")}:10`),
    endTime: stamp(date, `${String(6 + (i % 18)).padStart(2, "0")}:55`),
    operator: pick(PEOPLE, `op|${seed}`).name,
    status: i % 23 === 0 ? "中断" : "完成",
    remark: i % 23 === 0 ? "皮带故障，转下一班补送" : "",
  } satisfies SupplyRecord;
});

/** 工艺采集数据（TPP_3000）：投收料的采集侧来源，`tslSign` 0=投料 1=收料 */
export const COLLECT_DATA: ProcessCollectData[] = Array.from({ length: 240 }, (_, i) => {
  const process = PROCESS_SEQ[i % PROCESS_SEQ.length];
  const day = -(6 - Math.floor(i / 36));
  const date = dayOffset(day);
  const begin = stamp(date, `${String(6 + (i % 17)).padStart(2, "0")}:${String((i * 3) % 60).padStart(2, "0")}`);
  const end = stamp(date, `${String(6 + (i % 17)).padStart(2, "0")}:${String(((i * 3) % 60) + 5).padStart(2, "0")}`);
  const mat = materialByName(FLOWS[process].inMats[i % FLOWS[process].inMats.length]);
  const seed = `cd|${process}|${date}|${i}`;
  const unit = pick(unitsOfProcess(process), `u|${seed}`);
  return {
    id: `CD-${String(i + 1).padStart(4, "0")}`,
    lbId: SILO_BINS.find((b) => b.workstationCode === unit.id)?.binCode ?? "",
    workstationId: unit.id,
    matrlId: mat?.id ?? "",
    batchNo: `B${date.replace(/-/g, "").slice(2)}${String((i % 9) + 1).padStart(2, "0")}`,
    h2o: between(4.5, 13.2, `h|${seed}`, 2),
    unit: "t",
    beginDate: begin,
    endDate: end,
    wgt: Math.round(between(60, 760, `w|${seed}`, 1)),
    tslSign: i % 2 === 0 ? 0 : 1,
    /* 0=未使用 1=已使用 2=不参与计算——三态都要有，否则 `status` 筛选是空的 */
    status: i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0,
    product: mat?.group ?? "",
    hyBatch: process === "raw" ? `HY${date.replace(/-/g, "").slice(2)}` : undefined,
    suppId: "",
    process,
  } satisfies ProcessCollectData;
});

/* ══════════════════════════════════════════════════════════════════════════
   7. 小工具
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 机组 → 工序。
 *
 * 放在 `model.ts` 之外是因为它要读 `data/org.ts`，而 `model.ts` 刻意不依赖本域的
 * 组织结构（它只做纯计算）。这里用不到派生，只是查一次表。
 */
export function processOfUnit(unitId: string): string {
  const unit = UNITS.find((u) => u.id === unitId);
  const ws = unit ? unit.workshopId : "";
  const factory = { raw: "FG01", coke: "FG02", sinter: "FG03", pellet: "FG04", lime: "FG05", blast: "FG06" };
  const workshopToFactory = { CJ01: "FG01", CJ02: "FG02", CJ03: "FG03", CJ04: "FG04", CJ05: "FG05", CJ06: "FG06" };
  const f = (workshopToFactory as any)[ws];
  return PROCESS_SEQ.find((p) => (factory as any)[p] === f) ?? "raw";
}

/** 本地的确定性随机（只给 `rng2` 这一处用；`model.rng` 也行，但少一次跨文件依赖） */
function rng2(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h = (h >>> 0) + 0x6d2b79f5;
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}

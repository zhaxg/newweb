import type { StockRecord, StockTxn, YardPile } from "@/api/mes4tq/types";
import { MATERIALS, STORE_LOCATIONS } from "./org";
import { SHIFT_CODES, between, dayOffset, pick, stamp } from "./model";
import { PEOPLE } from "./people";

/**
 * TS 物料与库存的种子（TS0001 库房库位 / TS0002 库存 / TS0003 出入库 / TS0004 料场）。
 *
 * 库房与库位的**定义**在 `org.ts`（它们是全站主数据，TW 的料仓也挂同一批库位）；
 * 这里只放**流水与余额**——会随时间变的那部分。
 *
 * ── 库前 / 库后 的边界（规格书 B11 第 1 条）─────────────────────────────
 * **进厂入储在 ERP-MR、库后的消耗/移存/回收在 MES**。所以这批流水**全是库后动作**：
 * 出库、移库、内部回收，没有「入库」——进厂入储的账在 ERP，MES 只接它的信息。
 * 这条边界是客户对账时最常问的一句话，所以 `direction` 字段里**没有「入库」这个值**，
 * 有入账动作的只有「盘盈」（盘点发现多了），那是 MES 自己的事。
 *
 * ⚠️ 数字口径：`dryWeight = wetWeight / (1 + h2o/100)` 仍然成立，
 * 与 TW 的投料实绩是同一条等式——客户在两页各按一次计算器，结果必须一样。
 */

/** 出入库方向：**没有「入库」**——见文件头的库前/库后边界 */
const TXN_DIRECTIONS = ["出库", "移库", "回收", "盘盈", "盘亏"] as const;

const TXN_MOVE_TYPE: Record<string, string> = {
  出库: "201",
  移库: "301",
  回收: "901",
  盘盈: "A01",
  盘亏: "A02",
};

/**
 * 库存流水（TS0003）：近 7 天 × 每天 16 条。
 *
 * `docNo`（凭证号）是与 ERP 对账的连接键——真实系统里 MES 出库会回抛 ERP 记账，
 * 所以它必须**有规律**（`MES + 日期 + 序号`），不能是随机串：
 * 客户拿凭证号去 ERP 查是查得到的，那才叫接通了。
 */
export const STOCK_TXNS: StockTxn[] = Array.from({ length: 7 * 16 }, (_, i) => {
  const day = -(6 - Math.floor(i / 16));
  const date = dayOffset(day);
  const shift = SHIFT_CODES[i % 3];
  const mat = pick(MATERIALS, `m|${date}|${i}`);
  const loc = pick(STORE_LOCATIONS, `l|${date}|${i}`);
  const dir = (TXN_DIRECTIONS as readonly string[])[i % TXN_DIRECTIONS.length];
  const seed = `tx|${date}|${i}`;
  /* 出库/回收给大吨位、移库给中等、盘盈亏给小吨位——盘一趟能差出几十吨太假 */
  const base = dir.startsWith("盘") ? between(0.5, 6, `d|${seed}`, 1) : between(180, 2600, `d|${seed}`, 1);
  const h2o = between(4.5, 12.8, `h|${seed}`, 2);
  const wet = Math.round(base * (1 + h2o / 100) * 100) / 100;
  const op = pick(PEOPLE, `op|${seed}`);
  return {
    id: `TX-${date.replace(/-/g, "")}-${String(i + 1).padStart(4, "0")}`,
    materialId: mat.id,
    batchNo: `B${date.replace(/-/g, "").slice(2)}${String((i % 9) + 1).padStart(2, "0")}`,
    direction: dir,
    moveType: TXN_MOVE_TYPE[dir],
    dryWeight: Math.round(base * 100) / 100,
    wetWeight: wet,
    h2o: Math.round(h2o * 100) / 100,
    storeRoomCode: loc.storeRoomCode,
    storePositionCode: loc.id,
    /* 凭证号有规律：`MES + 日期 + 序号`，与 ERP 对账时按这个号查得到 */
    docNo: `MES${date.replace(/-/g, "")}${String(i + 1).padStart(4, "0")}`,
    txnTime: stamp(date, `${String(6 + (i % 18)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`),
    operator: op.name,
    remark: dir.startsWith("盘") ? `${shift} 班盘点调整` : "",
  } satisfies StockTxn;
});

/**
 * 库存记录（TS0002 实物库存，真实表 `TMW_1000`）：物料 × 库位 铺一行。
 *
 * 每个物料落 2~3 个库位（同一种矿可能分堆），所以**同料号会有多行**——
 * 这正是 B2 `StockRecord` 的粒度（料号 + 批次 + 库位）。
 * 汇总视图（`StockBalance`）由 `routes/stock.ts` 在读取时按料号+库房聚一次。
 */
export const STOCK_RECORDS: StockRecord[] = MATERIALS.flatMap((mat, mi) => {
  const locs = STORE_LOCATIONS.filter((_, li) => li % 7 === mi % 7).slice(0, 3);
  return locs.map((loc, li) => {
    const seed = `sr|${mat.id}|${loc.id}`;
    const h2o = mat.unit === "m³" ? 0 : between(4.2, 13.5, `h|${seed}`, 2);
    /* 干基给大数、湿基由水分反推——反过来编（先编湿的）会出现湿 < 干的荒谬行 */
    const dry = Math.round(between(1200, 46000, `d|${seed}`, 0));
    const wet = Math.round(dry * (1 + h2o / 100) * 100) / 100;
    const createDay = -(li + 1);
    const creator = pick(PEOPLE, `cr|${seed}`);
    const day = dayOffset(createDay);
    return {
      id: `SR-${mat.id}-${loc.id}`,
      materialId: mat.id,
      batchNo: `B${day.replace(/-/g, "").slice(2)}${String((li % 9) + 1).padStart(2, "0")}`,
      spec: mat.group === "矿石" ? `${mat.name} 混装` : mat.name,
      supplierDesc: pick(["北方矿产", "远洋贸易", "本地焦化", "熔剂建材", "球团原料"], `sp|${seed}`),
      cargoName: mat.name,
      unit: mat.unit,
      dryWeight: dry,
      wetWeight: wet,
      h2o: Math.round(h2o * 100) / 100,
      storeRoomCode: loc.storeRoomCode,
      storePositionCode: loc.id,
      /* 乐观锁时间戳（真实表的 `D_TIME_STAMP`）——有它才是「并发改同一行会被挡住」的形状 */
      timeStamp: `${day} ${String(8 + li).padStart(2, "0")}:15:00`,
      creator: creator.name,
      createTime: `${day} 08:15:00`,
      lastModifier: li % 3 === 0 ? creator.name : undefined,
      lastModifyTime: li % 3 === 0 ? `${day} 14:30:00` : undefined,
    } satisfies StockRecord;
  });
});

/**
 * 收发存汇总（TS0002 的「收发存」页签）：按料号 + 库房聚合。
 *
 * `begin + in - out = end` 这条等式**必须成立**——收发存表就是给客户对账的，
 * 三个数里有一个是硬编的就对不上。所以这里先算 `in`/`out` 从流水里来，
 * `end` 由流水的净额加期初得出，而不是四个数各自生成。
 */
export interface StockBalanceRow {
  id: string;
  materialId: string;
  storeRoomCode: string;
  beginWeight: number;
  inWeight: number;
  outWeight: number;
  endWeight: number;
  /** 结存 = 期初 + 入 - 出，页面上验算用的差额（应为 0） */
  diff: number;
}

export const STOCK_BALANCES: StockBalanceRow[] = MATERIALS.flatMap((mat, mi) =>
  STORE_LOCATIONS.filter((_, li) => li % 7 === mi % 7)
    .map((l) => l.storeRoomCode)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((room) => {
      const txns = STOCK_TXNS.filter((t) => t.materialId === mat.id && t.storeRoomCode === room);
      /* 只统计「出库/回收」是出、「盘盈」是入；移库是库间转移，对**该库房**的进出都有影响，
         所以按方向的正负号统一记账，而不是按字面分组 */
      const inQty = txns
        .filter((t) => t.direction === "盘盈" || t.direction === "移库")
        .reduce((s, t) => s + t.dryWeight, 0);
      const outQty = txns
        .filter((t) => t.direction === "出库" || t.direction === "回收" || t.direction === "盘亏")
        .reduce((s, t) => s + t.dryWeight, 0);
      const seed = `sb|${mat.id}|${room}`;
      const begin = Math.round(between(8000, 42000, `b|${seed}`, 0));
      const end = Math.round(begin + inQty - outQty);
      return {
        id: `SB-${mat.id}-${room}`,
        materialId: mat.id,
        storeRoomCode: room,
        beginWeight: begin,
        inWeight: Math.round(inQty),
        outWeight: Math.round(outQty),
        endWeight: end,
        /* 应为 0：它就是那条等式的残差，非 0 说明聚合口径错了 */
        diff: begin + Math.round(inQty) - Math.round(outQty) - end,
      } satisfies StockBalanceRow;
    }),
);

/**
 * 料场料条与堆（TS0004 料场可视化）。
 *
 * `beginPos`/`endPos` 是**料条上的相对位置（0~100）**，不是吨位——
 * 料场图画的是「这条 800m 的料条上，12%~46% 处堆着矿粉」，
 * 所以两个位置是百分比。吨位由 `qty` 单独给。
 */
export const YARD_PILES: YardPile[] = Array.from({ length: 24 }, (_, i) => {
  const seed = `yp|${i}`;
  const beginPos = Math.round(between(0, 78, `bp|${seed}`, 0));
  const width = Math.round(between(8, 22, `w|${seed}`, 0));
  const status = pick(["堆料中", "静置", "取料中", "已取空"], `st|${seed}`);
  const mat = pick(
    MATERIALS.filter((m) => m.group === "矿石" || m.group === "熔剂"),
    `m|${seed}`,
  );
  const buildDay = -(i % 9);
  return {
    id: `YP-${String(i + 1).padStart(3, "0")}`,
    stripNo: `L${String((i % 6) + 1).padStart(2, "0")}`,
    pileNo: `P${dayOffset(buildDay).replace(/-/g, "").slice(2)}-${(i % 4) + 1}`,
    materialId: mat.id,
    /* 已取空的堆给 0 吨而不是一个正数——「取空了还显示 1200t」会让料场图的账对不上 */
    qty: status === "已取空" ? 0 : Math.round(between(600, 5400, `q|${seed}`, 0)),
    beginPos,
    endPos: Math.min(100, beginPos + width),
    buildTime: stamp(dayOffset(buildDay), `${String(6 + (i % 14)).padStart(2, "0")}:00`),
    status,
  } satisfies YardPile;
});

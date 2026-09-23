/**
 * Ylgy 视图模型 —— 移植自 DDH.Winforms.SQM.Forms.Tqmyl.Ylgy.cs（926 行）
 *
 * 原系统把「炼钢工艺要点」拆成 4 张表（Tqmyl01 主表 / 02 钢种标准 / 03 工序 / 04 指标值），
 * WinForms 侧用 Ylgy 聚合编辑后再 ToEntities() 一次性回传。web 侧保持同一套聚合与编辑语义，
 * 保存仍走 tqmylApi.save(YlgyEntities)。
 *
 * 数据源全部是系统字典（ISystemKeyValueAppService）：
 *   YLGY.TEMPLATE      指标模板（覆盖默认值/排序）
 *   YLGY.INDEX         指标字典
 *   YLGY.PROC.INDEX.GRP 工序 × 指标分组
 *   YLGY.GYLJ.GX       工艺路径
 *   YLGY.INDEX.PROPERTITY 指标属性（FrmYl06/Yl07 用）
 *   A0100:QMYS         化学成分指标（TestItemRepo.GetAllCfs）
 *
 * 待接入：YlgyTemplateRepo/YlgyIndexPropertyRepo 原带 IHmxCache，web 侧改为会话内 Promise 缓存；
 *        原 Mapper.MapTo / .Clone() 以展开 + JSON 深拷贝等价实现。
 */
import type { Tqmyl01, Tqmyl02, Tqmyl03, Tqmyl04, YlgyEntities } from "@/api/mes4ddh/sqm.swagger";
import { ValidFlag } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import type { HmxKv } from "@/api/admin/types";
import { NextStrId } from "@/lib/yitIdHelper";

/* ---------- KV 组常量（KeyValueConst / YlgyTemplateRepo） ---------- */
export const KV_TEMPLATE = "YLGY.TEMPLATE";
export const KV_INDEX = "YLGY.INDEX";
export const KV_GRP = "YLGY.PROC.INDEX.GRP";
export const KV_GYLJ = "YLGY.GYLJ.GX";
export const KV_PROP = "YLGY.INDEX.PROPERTITY";
/** KeyValueConst.QMYS —— 化学成分指标 */
export const KV_QMYS = "A0100:QMYS";
/** KeyValueConst.QMAC —— 锭坯型 */
export const KV_QMAC = "A0100:QMAC";
/** QMConsts */
export const CQZB_GRP = "CQZB";
export const YLGY_CF_CLASS = "C";
export const LZ_CODE = "CCM";
export const MZ_CODE = "MZ";

/* ---------- 视图模型数据形状 ---------- */

export interface YlgyIdxClass {
  id?: string | null;
  proc?: string | null;
  classCode?: string | null;
  classDesc?: string | null;
  seq: number;
}

export interface YlgyIdx {
  id?: string | null;
  code?: string | null;
  name?: string | null;
  classCode?: string | null;
  unit?: string | null;
  procString?: string | null;
  seq: number;
  secondaryCoolingZoneName?: string | null;
  formula?: string | null;
  decimalPlaces?: number | null;
  /** C# ProcString.Split(',') */
  procs?: string[] | null;
}

export interface YlgyTemplate {
  id?: string | null;
  proc?: string | null;
  cls?: string | null;
  code?: string | null;
  name?: string | null;
  classDesc?: string | null;
  seq: number;
  default?: boolean;
  unit?: string | null;
  formula?: string | null;
  decimalPlaces?: number | null;
}

/** 工艺路径（YLGY.GYLJ.GX 字典） */
export interface Gylj {
  id?: string | null;
  code?: string | null;
  name?: string | null;
  grp?: string | null;
  procs?: string[] | null;
}

/** 指标属性（YLGY.INDEX.PROPERTITY 字典，cSw01 存 JSON 数组） */
export interface YlgyIndexProperty {
  id?: string | null;
  proc?: string | null;
  group?: string | null;
  idxCode?: string | null;
  propertyName?: string | null;
  defaultValue?: string | null;
  values?: { value?: unknown }[];
}

/* ---------- 会话内缓存（等价原 IHmxCache） ---------- */
const cache = new Map<string, Promise<unknown>>();
function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const p = load().catch((e) => {
      cache.delete(key);
      throw e;
    });
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}
/** 原 YlgyIndexPropertyRepo.RemoveCache / YlgyTemplateRepo 缓存失效 */
export function clearYlgyCache(...keys: string[]) {
  if (keys.length === 0) cache.clear();
  else keys.forEach((k) => cache.delete(k));
}

async function loadKv(pcode: string): Promise<HmxKv[]> {
  try {
    return (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
  } catch {
    /* 拦截层已 toast；字典缺失时按空表继续，画面不至于空白 */
    return [];
  }
}

/* ---------- YlgyTemplateRepo ---------- */

async function queryGrps(): Promise<YlgyIdxClass[]> {
  const kvs = await loadKv(KV_GRP);
  return kvs
    .map((x) => ({
      id: x.id,
      proc: x.cCode,
      classCode: x.cName,
      classDesc: x.cDesc,
      seq: Number.parseInt(x.cOrder || "0", 10) || 0,
    }))
    .sort((a, b) => a.seq - b.seq);
}

async function queryIndexes(): Promise<YlgyIdx[]> {
  const kvs = await loadKv(KV_INDEX);
  // C#：cEnable=="1" 且 cValue != "C"（排除化学成分），再拼上 TestItemRepo.GetAllCfs()
  const base = kvs
    .filter((x) => x.cEnable === "1" && x.cValue !== "C")
    .map((x) => ({
      id: x.id,
      code: x.cCode,
      name: x.cName,
      classCode: x.cValue,
      unit: x.cDesc,
      procString: x.cGroup,
      seq: Number.parseInt(x.cOrder || "0", 10) || 0,
      secondaryCoolingZoneName: x.cSw01,
      formula: null as string | null,
      decimalPlaces: null as number | null,
      procs: (x.cGroup ?? "").split(",").filter(Boolean),
    }));
  return [...base, ...(await queryCfs())].sort((a, b) => a.seq - b.seq);
}

/** C# TestItemRepo.GetAllCfs() → QuerySysKvItemList(KeyValueConst.QMYS)，映射成 YlgyIdx（classCode 固定 "C"） */
async function queryCfs(): Promise<YlgyIdx[]> {
  const kvs = await loadKv(KV_QMYS);
  return kvs
    .map((x) => ({
      id: x.id,
      code: x.cCode,
      name: x.cName,
      classCode: "C",
      unit: x.cDesc,
      procString: null as string | null,
      seq: Number.parseInt(x.cOrder || "0", 10) || 0,
      secondaryCoolingZoneName: null as string | null,
      formula: x.cSw01 ?? null,
      decimalPlaces: Number.parseInt(x.cValue ?? "", 10) || null,
      procs: null as string[] | null,
    }))
    .sort((a, b) => a.seq - b.seq);
}

export const YlgyTemplateRepo = {
  getGrps: () => memo("grp", queryGrps),
  getIndexes: () => memo("idx", queryIndexes),

  /** C# GetCqzb：分组 CQZB 的指标 */
  async getCqzb(): Promise<YlgyTemplate[]> {
    const idxes = await YlgyTemplateRepo.getIndexes();
    return idxes
      .filter((x) => x.classCode === CQZB_GRP)
      .map((x) => ({ code: x.code, name: x.name, seq: x.seq }));
  },

  async getAll(): Promise<YlgyTemplate[]> {
    return memo("tpl", async () => {
      const grps = await YlgyTemplateRepo.getGrps();
      const idxes = await YlgyTemplateRepo.getIndexes();
      const kvs = await loadKv(KV_TEMPLATE);
      const templs = kvs
        .sort((a, b) => Number(a.cOrder || "0") - Number(b.cOrder || "0"))
        .map((x) => ({
          id: x.id,
          proc: x.cValue,
          cls: x.cGroup,
          code: x.cCode,
          name: x.cName,
          unit: x.cDesc,
          classDesc: x.cSw01,
          seq: Number.parseInt(x.cSw02 || "0", 10) || 0,
          default: String(x.cSw03 ?? "") === "true",
        }));

      // C#：grps × 匹配到的 idxes 交叉展开，templs 只提供 default/id
      return grps
        .flatMap((p) =>
          idxes
            .filter(
              (x) =>
                (x.procs == null || x.procs.includes(p.proc ?? "")) &&
                (x.classCode ?? "").startsWith(p.classCode ?? ""),
            )
            .map((x) => {
              const t = templs.find(
                (w) => w.proc === p.proc && w.cls === p.classCode && w.code === x.code,
              );
              return {
                id: t?.id ?? NextStrId(),
                proc: p.proc,
                cls: p.classCode,
                classDesc: p.classDesc,
                code: x.code,
                name: x.name,
                seq: x.seq,
                unit: x.unit,
                decimalPlaces: x.decimalPlaces,
                formula: x.formula,
                default: t?.default ?? false,
              } satisfies YlgyTemplate;
            }),
        )
        .sort((a, b) => a.seq - b.seq);
    });
  },

  async getByProc(proc: string): Promise<YlgyTemplate[]> {
    return (await YlgyTemplateRepo.getAll()).filter((x) => x.proc === proc);
  },

  async getByProcGrp(proc: string, grp: string): Promise<YlgyTemplate[]> {
    return (await YlgyTemplateRepo.getAll()).filter((x) => x.proc === proc && x.cls === grp);
  },
};

/* ---------- GyljRepo（工艺路径字典） ---------- */

export const GyljRepo = {
  async getAll(): Promise<Gylj[]> {
    return memo("gylj", async () => {
      const kvs = await loadKv(KV_GYLJ);
      return kvs
        .sort((a, b) => Number(a.cOrder || "0") - Number(b.cOrder || "0"))
        .map((x) => ({
          id: x.id,
          code: x.cCode,
          name: x.cName,
          procs: (x.cValue ?? "").split("/").filter(Boolean),
          grp: x.cGroup,
        }));
    });
  },
  async tryGet(code?: string | null): Promise<Gylj | undefined> {
    return (await GyljRepo.getAll()).find((x) => x.code === code);
  },
};

/* ---------- YlgyIndexPropertyRepo（FrmYl06/Yl07 数据层） ---------- */

function fromKv(k: HmxKv): YlgyIndexProperty {
  let values: unknown[] = [];
  try {
    values = JSON.parse(k.cSw01 || "[]") as unknown[];
  } catch {
    values = [];
  }
  return {
    id: k.id,
    proc: k.cCode,
    idxCode: k.cName,
    group: k.cGroup,
    propertyName: k.cDesc,
    defaultValue: k.cValue,
    values: values.map((v) => ({ value: v })),
  };
}

function toKv(p: YlgyIndexProperty): HmxKv {
  const s = (v?: string | null) => v ?? undefined;
  return {
    selected: false,
    id: p.id ?? NextStrId(),
    cPid: KV_PROP,
    cCode: s(p.proc),
    cName: s(p.idxCode),
    cGroup: s(p.group),
    cDesc: s(p.propertyName),
    cValue: s(p.defaultValue),
    cSw01: JSON.stringify((p.values ?? []).map((x) => x.value)),
  };
}

export const YlgyIndexPropertyRepo = {
  async getAll(): Promise<YlgyIndexProperty[]> {
    return memo("prop", async () => (await loadKv(KV_PROP)).map(fromKv));
  },
  toKv,
  fromKv,
};

/* ---------- YlgyGx：一道工序（Tqmyl03 + 分组后的 Tqmyl04） ---------- */

export class Tqmyl04Grp {
  grp: string;
  grpName: string;
  values: Tqmyl04[];
  constructor(code: string, name: string, values: Tqmyl04[]) {
    this.grp = code;
    this.grpName = name;
    // C#：Values.OrderBy(x => x.NSeq)
    this.values = [...values].sort((a, b) => (a.nSeq ?? 0) - (b.nSeq ?? 0));
  }
}

export class YlgyGx {
  static readonly TSYQ_GRP = "TSYQ";
  data: Tqmyl03;
  valueGrps: Tqmyl04Grp[] = [];

  private constructor(data: Tqmyl03) {
    this.data = data;
  }

  get allValues(): Tqmyl04[] {
    return this.valueGrps.flatMap((g) => g.values);
  }

  getGylj(): Promise<Gylj | undefined> {
    return GyljRepo.tryGet(this.data.cProc);
  }

  static async create(data: Tqmyl03, values?: Tqmyl04[] | null): Promise<YlgyGx> {
    const grps = await YlgyTemplateRepo.getGrps();
    const gx = new YlgyGx(data);
    const list = values ?? [];
    gx.valueGrps = grps
      .filter((x) => x.proc === data.cProc)
      .map(
        (x) =>
          new Tqmyl04Grp(
            x.classCode ?? "",
            x.classDesc ?? "",
            list.filter(
              (w) =>
                w.cTqmyl03Id === data.id &&
                (w.cClass ?? "").startsWith(x.classCode ?? "") &&
                w.cClassDesc === x.classDesc,
            ),
          ),
      );
    return gx;
  }

  /** C# CopyFrom：整批克隆指标并按分组重组（id/工序/序号重写） */
  async copyFrom(values?: Iterable<Tqmyl04> | null): Promise<void> {
    const grps = await YlgyTemplateRepo.getGrps();
    if (values == null) throw new Error("values 不能为空");
    const cloned = [...values].map((v) => ({
      ...JSON.parse(JSON.stringify(v)) as Tqmyl04,
      id: NextStrId(),
      cTqmyl01Code: this.data.cGyCode,
      cTqmyl01Id: this.data.cTqmyl01Id,
      cTqmyl03Id: this.data.id,
      cProc: this.data.cProc,
      nProcSeq: this.data.nSeq,
    }));
    this.valueGrps = grps
      .filter((x) => x.proc === this.data.cProc)
      .map(
        (x) =>
          new Tqmyl04Grp(
            x.classCode ?? "",
            x.classDesc ?? "",
            cloned.filter(
              (w) =>
                (w.cClass ?? "").startsWith(x.classCode ?? "") && w.cClassDesc === x.classDesc,
            ),
          ),
      );
  }

  updateGxSeq(): void {
    for (const v of this.allValues) v.nProcSeq = this.data.nSeq;
  }
}

/* ---------- Ylgy：整单聚合 ---------- */

export class Ylgy {
  data: Tqmyl01;
  /** 适用钢种标准 */
  stdSigns: Tqmyl02[] = [];
  /** 工艺路径 */
  gylj: YlgyGx[] = [];
  /** 产前准备指标（cClass = CQZB） */
  cqzbs: Tqmyl04[] = [];

  constructor(data?: Tqmyl01) {
    this.data =
      data ??
      ({
        id: NextStrId(),
        nValidFlag: ValidFlag.Invalid,
        // 原 C# 用 GenerateID() 占位，后端不认；保留字段位即可
        cPreRemark: "",
      } as Tqmyl01);
  }

  get allValues(): Tqmyl04[] {
    return this.gylj.flatMap((x) => x.allValues);
  }
  get allProcs(): Tqmyl03[] {
    return this.gylj.map((x) => x.data);
  }

  /** C# ToEntities() —— 四表拼成一次回传的 YlgyEntities */
  toEntities(): YlgyEntities {
    return {
      tqmyl01: this.data,
      tqmyl02s: [...this.stdSigns],
      tqmyl03s: [...this.allProcs],
      tqmyl04s: [...this.allValues, ...this.cqzbs],
    };
  }

  /** 编号变更时把 cGyCode / cTqmyl01Code 级联下去 */
  updateGyCode(newCode: string): void {
    this.data.cCode = newCode;
    for (const s of this.stdSigns) s.cGyCode = newCode;
    for (const p of this.allProcs) p.cGyCode = newCode;
    for (const v of this.allValues) v.cTqmyl01Code = newCode;
    for (const v of this.cqzbs) v.cTqmyl01Code = newCode;
  }

  /** 按 NSeq 相同视为同组，整组与相邻组交换序号（原 MoveGxUp/Down） */
  moveGxUp(gx: YlgyGx): number {
    return this.swapGroup(gx, "up");
  }
  moveGxDown(gx: YlgyGx): number {
    return this.swapGroup(gx, "down");
  }

  private swapGroup(gx: YlgyGx, dir: "up" | "down"): number {
    const list = this.gylj;
    const index = list.indexOf(gx);
    if (index === -1) return 0;
    const curSeq = gx.data.nSeq ?? 0;

    let start = index;
    while (start > 0 && (list[start - 1].data.nSeq ?? 0) === curSeq) start--;
    let end = index;
    while (end < list.length - 1 && (list[end + 1].data.nSeq ?? 0) === curSeq) end++;

    if (dir === "up") {
      if (start === 0) return 0;
      const prevEnd = start - 1;
      const prevSeq = list[prevEnd].data.nSeq ?? 0;
      let prevStart = prevEnd;
      while (prevStart > 0 && (list[prevStart - 1].data.nSeq ?? 0) === prevSeq) prevStart--;

      const prevGroup = list.slice(prevStart, prevEnd + 1);
      const curGroup = list.slice(start, end + 1);
      for (const it of prevGroup) it.data.nSeq = curSeq;
      for (const it of curGroup) it.data.nSeq = prevSeq;

      const merged = [...curGroup, ...prevGroup];
      list.splice(prevStart, prevGroup.length + curGroup.length, ...merged);
      this.refreshRoute();
      return prevGroup.length;
    }

    if (end === list.length - 1) return 0;
    const nextStart = end + 1;
    const nextSeq = list[nextStart].data.nSeq ?? 0;
    let nextEnd = nextStart;
    while (nextEnd < list.length - 1 && (list[nextEnd + 1].data.nSeq ?? 0) === nextSeq) nextEnd++;

    const curGroup = list.slice(start, end + 1);
    const nextGroup = list.slice(nextStart, nextEnd + 1);
    for (const it of curGroup) it.data.nSeq = nextSeq;
    for (const it of nextGroup) it.data.nSeq = curSeq;

    const merged = [...nextGroup, ...curGroup];
    list.splice(start, curGroup.length + nextGroup.length, ...merged);
    this.refreshRoute();
    return nextGroup.length;
  }

  /** 多道同组工序合并成同一 NSeq，并全局重编号 */
  merge(list: YlgyGx[]): void {
    if (!list?.length) return;
    for (const item of list) {
      if (!this.gylj.includes(item)) throw new Error("传入数据不在列表中");
    }
    const minSeq = Math.min(...list.map((x) => x.data.nSeq ?? 0));
    const indices = list.map((x) => this.gylj.indexOf(x)).sort((a, b) => a - b);
    const insertPos = indices[0];
    for (const item of list) {
      const i = this.gylj.indexOf(item);
      if (i >= 0) this.gylj.splice(i, 1);
    }
    this.gylj.splice(insertPos, 0, ...list);
    for (const item of list) item.data.nSeq = minSeq;
    this.renumberGroups();
    this.refreshRoute();
  }

  /** 把一道工序从同组里拆出来单独成组 */
  unmerge(item: YlgyGx): void {
    const index = this.gylj.indexOf(item);
    if (index === -1) return;
    const seq = item.data.nSeq ?? 0;
    let groupStart = index;
    while (groupStart > 0 && (this.gylj[groupStart - 1].data.nSeq ?? 0) === seq) groupStart--;
    let groupEnd = index;
    while (groupEnd < this.gylj.length - 1 && (this.gylj[groupEnd + 1].data.nSeq ?? 0) === seq)
      groupEnd++;
    if (groupStart === groupEnd) return;

    const TEMP = Number.MAX_SAFE_INTEGER;
    for (let i = groupStart; i <= groupEnd; i++) {
      if (this.gylj[i] !== item) this.gylj[i].data.nSeq = TEMP;
    }
    this.renumberGroups();
    this.refreshRoute();
  }

  /** 相同 NSeq 连续段统一编号为 1..n */
  private renumberGroups(): void {
    let seq = 1;
    let i = 0;
    while (i < this.gylj.length) {
      const cur = this.gylj[i].data.nSeq;
      const groupStart = i;
      while (i < this.gylj.length && this.gylj[i].data.nSeq === cur) i++;
      for (let j = groupStart; j < i; j++) this.gylj[j].data.nSeq = seq;
      seq++;
    }
  }

  /** 新增工序：同组续序 / 换组 +1，并灌入该工序的默认指标（template.Default） */
  async addGx(gylj: Gylj): Promise<YlgyGx> {
    const last = this.gylj[this.gylj.length - 1];
    let seq = 1;
    if (last) {
      const lastGrp = (await last.getGylj())?.grp;
      seq = lastGrp === gylj.grp ? (last.data.nSeq ?? 1) : (last.data.nSeq ?? 0) + 1;
    }
    const yl03: Tqmyl03 = {
      id: NextStrId(),
      cGyCode: this.data.cCode,
      cProc: gylj.code,
      cProcName: gylj.name,
      cTqmyl01Id: this.data.id,
      nSeq: seq,
    };
    const templates = await YlgyTemplateRepo.getByProc(gylj.code ?? "");
    const yl04s = templates
      .filter((x) => x.default)
      .map(
        (x) =>
          ({
            id: NextStrId(),
            cClass: x.cls,
            cClassDesc: x.classDesc,
            cCode: x.code,
            cProc: gylj.code,
            cName: x.name,
            cTqmyl01Code: this.data.cCode,
            cTqmyl01Id: this.data.id,
            cTqmyl03Id: yl03.id,
            nSeq: x.seq,
            nProcSeq: yl03.nSeq,
            cUnit: x.unit,
          }) as Tqmyl04,
      );
    const gx = await YlgyGx.create(yl03, yl04s);
    this.gylj.push(gx);
    this.refreshRoute();
    return gx;
  }

  removeGx(yl03: Tqmyl03): void {
    const index = this.gylj.findIndex((x) => x.data === yl03);
    if (index === -1) return;
    const gx = this.gylj[index];
    const prev = index === 0 ? undefined : this.gylj[index - 1];
    const next = index === this.gylj.length - 1 ? undefined : this.gylj[index + 1];
    this.gylj.splice(index, 1);
    // 同组内还有别的工序 → 不重编号；是组内最后一个 → 后续组序号 -1
    if ((prev?.data.nSeq ?? null) === gx.data.nSeq || (next?.data.nSeq ?? null) === gx.data.nSeq) {
      this.refreshRoute();
      return;
    }
    for (let i = index; i < this.gylj.length; i++) {
      this.gylj[i].data.nSeq = (this.gylj[i].data.nSeq ?? 0) - 1;
    }
    this.refreshRoute();
  }

  /** 重算 cPlanRouteCode / cPlanRouteDesc：同组用「/」，换组用「-」/「→」 */
  refreshRoute(): void {
    const sbCode: string[] = [];
    const sbDesc: string[] = [];
    let prev: YlgyGx | undefined;
    for (const item of this.gylj) {
      if (prev && item.data.nSeq === prev.data.nSeq) {
        sbCode.push("/");
        sbDesc.push("/");
      } else if (prev) {
        sbCode.push("-");
        sbDesc.push("→");
      }
      sbCode.push(item.data.cProc ?? "");
      sbDesc.push(item.data.cProcName ?? "");
      prev = item;
    }
    this.data.cPlanRouteCode = sbCode.join("");
    this.data.cPlanRouteDesc = sbDesc.join("");
  }

  /** 原 OnOkClick 前置校验，中文提示照抄 */
  validate(): void {
    if (!(this.data.cCode ?? "").trim()) throw new Error("工艺要点编号不能为空");
    if (!(this.data.cName ?? "").trim()) throw new Error("工艺要点名称不能为空");
  }

  static readonly CQZB_GRP = CQZB_GRP;

  static async fromEntities(entities: YlgyEntities): Promise<Ylgy> {
    const ylgy = new Ylgy(entities.tqmyl01 ?? undefined);
    ylgy.stdSigns = [...(entities.tqmyl02s ?? [])];
    const gxs = await Promise.all(
      [...(entities.tqmyl03s ?? [])]
        .sort((a, b) => (a.nSeq ?? 0) - (b.nSeq ?? 0))
        .map((x) => YlgyGx.create(x, entities.tqmyl04s ?? [])),
    );
    ylgy.gylj = gxs;
    ylgy.cqzbs = (entities.tqmyl04s ?? []).filter((x) => x.cClass === CQZB_GRP);
    return ylgy;
  }

  /** C# Copy()：复制一份用于「复制」按钮 —— 新 Id、清空编号名称、置为未生效 */
  async copy(): Promise<Ylgy> {
    const res = new Ylgy({ ...this.data });
    res.data.id = NextStrId();
    res.data.cCode = null;
    res.data.cName = null;
    res.data.createTime = undefined;
    res.data.creator = undefined;
    res.data.nValidFlag = ValidFlag.Invalid;
    res.cqzbs = (JSON.parse(JSON.stringify(this.cqzbs)) as Tqmyl04[]).map((x) => ({
      ...x,
      id: NextStrId(),
      cTqmyl01Code: res.data.cCode,
      cTqmyl01Id: res.data.id,
    }));
    for (const item of this.gylj) {
      const data = JSON.parse(JSON.stringify(item.data)) as Tqmyl03;
      data.id = NextStrId();
      data.cTqmyl01Id = res.data.id;
      data.cGyCode = res.data.cCode;
      const gx = await YlgyGx.create(data);
      await gx.copyFrom(item.allValues);
      res.gylj.push(gx);
    }
    res.refreshRoute();
    return res;
  }
}

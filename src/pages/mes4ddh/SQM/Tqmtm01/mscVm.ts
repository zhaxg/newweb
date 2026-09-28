/**
 * FrmTM000ViewModel + Models 的 TS 移植（DDH.Winforms.SQM.Forms.Tqmtm）
 * 对应 FrmTqmtm01（主列表查询/增删改/生效禁用）与 FrmEditMsc（编辑）共用的内存对象图。
 * 已接入：mSCApi.queryTm08s / queryMSCs / queryMSC / saveMsc / deleteMsc / effectMsc；
 *         querySysKvItemList(A0100:PROC_CODE)（全程工序叙述字典）；tableConfigApi.queryTableConfig（TQMTMAC 行正/反向槽位映射）
 * 说明：IdxRow = 基表多态行（tableCode 判别：TQMTMT1/TQMTMP0/TQMTMAC/其余=槽位行 TsTableProValIdxTable）
 */
import { NextStrId } from "@/lib/yitIdHelper";
import { useAuthStore } from "@/stores/authStore";
import { systemKeyValueApi } from "@/api/admin/request";
import {
  mSCApi,
  type MSCDto,
  type MSCQueryParaPaginationQueryInput,
  type Tqmtm01,
  type Tqmtm02,
  type Tqmtm03,
  type Tqmtm04,
  type Tqmtm08,
  type IBasicIndexTable,
  type TsTableProValIdxTable,
  ValidFlag,
  YesNo,
  MscBasicTableType,
} from "@/api/mes4ddh/sqm.swagger";
import { tableConfigApi, type TsTableSettingDto } from "@/api/mes4ddh/ddh.swagger";

export const TABLE_T1 = "TQMTMT1";
export const TABLE_P0 = "TQMTMP0";
export const TABLE_MAC = "TQMTMAC";

export type IdxRow = IBasicIndexTable & Record<string, any>;

const TYPE_DISPLAY: Record<number, string> = { 1: "冶金规范类", 2: "产线类", 3: "工序类", 4: "试验项目类" };
const VALID_DISPLAY: Record<number, string> = { 0: "未生效", 1: "生效" };

const uid = () => NextStrId();
const nowIso = () => new Date().toISOString();
const me = () => {
  try {
    return useAuthStore().session?.userId ?? "";
  } catch {
    return "";
  }
};

/** EqualsFlag 位：2=左开 4=右开（Default=1 闭闭，Open=6 开开）——对应 C# DecimalRange.CheckInRange */
export function checkInRange(
  r: { min?: number | null; max?: number | null; equalsMethod?: number } | null | undefined,
  x?: number | null,
): boolean {
  if (!r || x == null) return false;
  const m = r.equalsMethod ?? 1;
  if (r.min != null && (m & 2 ? x <= r.min : x < r.min)) return false;
  if (r.max != null && (m & 4 ? x >= r.max : x > r.max)) return false;
  return true;
}

const isSlotRow = (r: Record<string, unknown>) => "cValue0" in r;

/* ================================================================ MSCIdx 层 */

export class IdxDetailValues {
  readonly idx: MSCIdx;
  values: IdxRow[] = [];
  subIdxes: MSCSubIdx[] = [];
  constructor(idx: MSCIdx) {
    this.idx = idx;
  }
  get isReadOnly() {
    return this.idx.data.cTqmtm09Id != null;
  }
  getT1(): IdxRow[] {
    return this.values.filter((r) => r.tableCode === TABLE_T1);
  }
  getP0(): IdxRow[] {
    return this.values.filter((r) => r.tableCode === TABLE_P0);
  }
  getTsTableVal(): TsTableProValIdxTable[] {
    return this.values.filter(
      (r) => r.tableCode !== TABLE_T1 && r.tableCode !== TABLE_P0 && isSlotRow(r),
    ) as TsTableProValIdxTable[];
  }
  getMacRows(): IdxRow[] {
    return this.values.filter((r) => r.tableCode === TABLE_MAC && !isSlotRow(r));
  }
  getMacSlots(): IdxRow[] {
    return this.values.filter((r) => r.tableCode === TABLE_MAC && isSlotRow(r));
  }
  /** C# Init(values, tm04s)：子级索引由 ISubIdxTable 行（TQMTMT1 行）派生 */
  init(values: IdxRow[], tm04s?: Tqmtm04[] | null) {
    this.values = [...values];
    this.subIdxes = [];
    for (const row of this.values.filter((r) => r.tableCode === TABLE_T1)) {
      if (!tm04s) {
        this.subIdxes.push(MSCSubIdx.create(this.idx, row));
        continue;
      }
      const subIdxNo = row.subIdxNo ?? row.queryTableIdxNo;
      const subTableCode = row.subTableCode ?? TABLE_P0;
      const tmp = tm04s
        .filter((w) => w.cIdxNo === subIdxNo)
        .filter((w) => w.cBasicTableCode === subTableCode)
        .filter((w) => w.cTestItemCode === row.testItemType);
      this.subIdxes.push(MSCSubIdx.create(this.idx, tmp[0] ?? null, row));
    }
  }
  clear() {
    this.values = [];
    this.subIdxes = [];
  }
  add(item: IdxRow) {
    this.values.push(item);
    if (item.tableCode === TABLE_T1) this.subIdxes.push(MSCSubIdx.create(this.idx, item));
  }
  remove(item: IdxRow) {
    const i = this.values.indexOf(item);
    if (i >= 0) this.values.splice(i, 1);
    if (item.tableCode === TABLE_T1) {
      const j = this.subIdxes.findIndex((s) => s.parent === this.idx && s.idxData === item);
      if (j >= 0) this.subIdxes.splice(j, 1);
    }
  }
  forEach(fn: (r: IdxRow) => void) {
    this.values.forEach(fn);
  }
  sortValues(key: (r: IdxRow) => string) {
    this.values.sort((a, b) => key(a).localeCompare(key(b)));
    this.subIdxes.sort((a, b) => key(a.idxData as IdxRow).localeCompare(key(b.idxData as IdxRow)));
  }
}

export abstract class MSCNode {
  abstract data: Tqmtm01 | Tqmtm02 | Tqmtm03 | Tqmtm04;
  abstract readonly id: string;
  abstract readonly treeDisplayText: string;
  abstract readonly tableType: MscBasicTableType;
  readonly idxes: MSCIdx[] = [];
}

export class MSCIdx extends MSCNode {
  readonly parent: MSCNode;
  data: Tqmtm04;
  readonly idxDetails: IdxDetailValues;
  constructor(parent: MSCNode) {
    super();
    this.parent = parent;
    this.data = {};
    this.idxDetails = new IdxDetailValues(this);
    this.idxes.push(this); // C#：Idxes 内部仅含自身，用于树联动
  }
  static create(t04: Tqmtm04, parent: MSCNode): MSCIdx {
    if (t04.cBasicTableCode === TABLE_T1) {
      const t1 = new Tqmtmt1Idx(parent);
      t1.data = t04;
      return t1;
    }
    const idx = new MSCIdx(parent);
    idx.data = t04;
    return idx;
  }
  static async createWith(
    t04: Tqmtm04,
    tm04s: Tqmtm04[] | undefined,
    parent: MSCNode,
    rows: IdxRow[],
  ): Promise<MSCIdx> {
    const idx = MSCIdx.create(t04, parent);
    await idx.initIdxData(rows, tm04s);
    return idx;
  }
  get id() {
    return this.data.id ?? "";
  }
  get tableType() {
    return MscBasicTableType.None;
  }
  get treeDisplayText() {
    return this.data.cBasicTableCName ?? "";
  }
  get idxNo() {
    return this.data.cIdxNo ?? null;
  }
  get basicTableCode() {
    return this.data.cBasicTableCode ?? "";
  }
  get subIdxes() {
    return this.idxDetails.subIdxes;
  }
  async initIdxData(rows: IdxRow[], tm04s?: Tqmtm04[] | null) {
    const data = await this.idxDataFilter(rows);
    this.idxDetails.init(data, tm04s);
    for (const sub of this.idxDetails.subIdxes) {
      await sub.initIdxData(rows, tm04s);
    }
  }
  protected async idxDataFilter(rows: IdxRow[]): Promise<IdxRow[]> {
    let data = rows.filter((x) => x.tableCode === this.basicTableCode).filter((x) => x.idxNo === this.idxNo);
    if (this.basicTableCode === TABLE_MAC) {
      data = await unionMacTyped(data);
    }
    return data;
  }
  createIdxData(): IdxRow {
    return { id: uid(), tableCode: this.basicTableCode, idxNo: null } as IdxRow;
  }
  addIdxData(): IdxRow {
    if (!this.data.cIdxNo) this.updateIdxNo(this.data.id ?? uid());
    const row = this.createIdxData();
    row.idxNo = this.idxNo;
    this.idxDetails.add(row);
    return row;
  }
  addIdxDataItem(row: IdxRow) {
    if (!this.data.cIdxNo) this.updateIdxNo(this.data.id ?? uid());
    row.idxNo = this.idxNo;
    this.idxDetails.add(row);
  }
  removeIdxData(row: IdxRow) {
    this.idxDetails.remove(row);
  }
  updateIdxNo(idxNo: string) {
    this.data.cIdxNo = idxNo;
    this.idxDetails.forEach((x) => (x.idxNo = idxNo));
  }
  setIdxData(rows: IdxRow[]) {
    const list = rows.map((x) => ({ ...x, id: uid() })) as IdxRow[];
    const candidates = list.filter((x) => x.tableCode === this.basicTableCode);
    this.idxDetails.init(candidates);
    for (const sub of this.idxDetails.subIdxes) {
      sub.setIdxData(list.filter((x) => x.idxNo === sub.idxNo));
    }
    this.updateIdxNo(this.id);
  }
  async clone(parent: MSCNode): Promise<MSCIdx> {
    const tm04s = collectTm04s(this);
    const rows = copyRowsWithSubs(this.idxDetails);
    const data = { ...this.data } as Tqmtm04;
    return MSCIdx.createWith(data, tm04s, parent, rows);
  }
  async copy(parent: MSCNode): Promise<MSCIdx> {
    const tmp = await this.clone(parent);
    tmp.data.id = uid();
    parent.idxes.push(tmp);
    tmp.updateIdxNo(tmp.id);
    setCopiedParentData(tmp.data, parent);
    setCopiedDetail(tmp, parent);
    return tmp;
  }
}

export class Tqmtmt1Idx extends MSCIdx {
  createIdxData(): IdxRow {
    return { id: uid(), tableCode: TABLE_T1, idxNo: null } as IdxRow;
  }
  protected override async idxDataFilter(rows: IdxRow[]): Promise<IdxRow[]> {
    const data = (await super.idxDataFilter(rows)).filter((r) => r.tableCode === TABLE_T1);
    data.sort((a, b) => String(a.testItemType ?? "").localeCompare(String(b.testItemType ?? "")));
    return data;
  }
  override addIdxData(): IdxRow {
    const row = super.addIdxData();
    this.idxDetails.sortValues((r) => String(r.testItemType ?? ""));
    return row;
  }
  override addIdxDataItem(row: IdxRow) {
    super.addIdxDataItem(row);
    this.idxDetails.sortValues((r) => String(r.testItemType ?? ""));
  }
}

export class MSCSubIdx extends MSCIdx {
  readonly idxData: IdxRow;
  constructor(parent: MSCIdx, tm04: Tqmtm04 | null, idxData: IdxRow) {
    super(parent);
    this.idxData = idxData;
    if (!tm04) this.initTm04();
    else this.data = tm04;
  }
  /** 2 参 = 无真实 tm04（InitTm04 克隆父级）；3 参 = 命中真实 tm04（对应 C# 两个静态重载） */
  static create(parent: MSCIdx, a: Tqmtm04 | IdxRow | null, b?: IdxRow): MSCSubIdx {
    if (b) {
      return b.tableCode === TABLE_T1
        ? new MSCTestItemNode(parent, a as Tqmtm04, b)
        : new MSCSubIdx(parent, a as Tqmtm04, b);
    }
    const row = a as IdxRow;
    return row.tableCode === TABLE_T1 ? new MSCTestItemNode(parent, null, row) : new MSCSubIdx(parent, null, row);
  }
  protected initTm04() {
    const data = { ...(this.parent.data as Tqmtm04) } as Tqmtm04;
    data.id = uid();
    data.cBasicTableCode = this.basicTableCode;
    this.data = data;
  }
  override get id() {
    return this.idxData.id ?? "";
  }
  override get treeDisplayText() {
    return String(this.idxData);
  }
  override get idxNo() {
    return this.idxData.subIdxNo ?? this.idxData.queryTableIdxNo ?? null;
  }
  override get basicTableCode() {
    return this.idxData.subTableCode ?? "";
  }
}

export class MSCTestItemNode extends MSCSubIdx {
  constructor(parent: MSCIdx, tm04: Tqmtm04 | null, idxData: IdxRow) {
    super(parent, tm04, idxData);
    if (tm04) {
      this.data.cTestItemCode = idxData.testItemType;
      this.data.cTestItemName = idxData.testItemTypeDesc;
      this.data.cBasicTableCName = idxData.testItemName;
      this.data.cIdxNo = idxData.queryTableIdxNo;
    }
  }
  protected override initTm04() {
    const data = { ...(this.parent.data as Tqmtm04) } as Tqmtm04;
    data.id = uid();
    data.cBasicTableCode = TABLE_P0;
    data.cBasicTableCName = "试验子项目要求";
    data.cBasicTableEName = "TQMTMP0";
    data.cBasicTableType = "试验项目类";
    data.cBasicTableTypeCode = MscBasicTableType.D;
    data.cIdxNo = "";
    data.cTestItemCode = "";
    data.cTestItemName = "";
    data.cTqmtm09Id = "";
    this.data = data;
  }
  get t1() {
    return this.idxData as IdxRow;
  }
  override get idxNo() {
    return this.idxData.queryTableIdxNo ?? null;
  }
  override get basicTableCode() {
    return TABLE_P0;
  }
  override get treeDisplayText() {
    return `${this.idxData.testItemType ?? ""} ${this.idxData.testItemName ?? ""}`.trim();
  }
  override updateIdxNo(idxNo: string) {
    this.idxData.queryTableIdxNo = idxNo;
    this.idxDetails.forEach((x) => (x.idxNo = idxNo));
    this.data.cIdxNo = idxNo;
    super.updateIdxNo(idxNo);
  }
  addIdxData(): IdxRow {
    if (!this.idxData.queryTableIdxNo) this.updateIdxNo(this.idxData.id ?? uid());
    const row: IdxRow = { id: uid(), tableCode: TABLE_P0, idxNo: this.idxData.queryTableIdxNo } as IdxRow;
    this.idxDetails.add(row);
    return row;
  }
  protected override async idxDataFilter(rows: IdxRow[]): Promise<IdxRow[]> {
    return (await super.idxDataFilter(rows))
      .filter((r) => r.tableCode === TABLE_P0)
      .filter((r) => r.testItemType === this.idxData.testItemType)
      .filter((r) => r.testItemCode === this.idxData.testItemCode);
  }
  override setIdxData(rows: IdxRow[]) {
    const filtered = rows
      .filter((r) => r.tableCode === TABLE_P0)
      .filter((r) => r.testItemType === this.idxData.testItemType)
      .filter((r) => r.testItemCode === this.idxData.testItemCode);
    super.setIdxData(filtered);
  }
}

function collectTm04s(idx: MSCIdx): Tqmtm04[] {
  const list: Tqmtm04[] = [{ ...idx.data } as Tqmtm04];
  for (const sub of idx.subIdxes) list.push(...collectTm04s(sub));
  return list;
}
function copyRowsWithSubs(details: IdxDetailValues): IdxRow[] {
  let res = details.values.map((x) => JSON.parse(JSON.stringify(x)) as IdxRow);
  for (const sub of details.subIdxes) {
    res = res.concat(copyRowsWithSubs(sub.idxDetails));
  }
  return res;
}
function setCopiedParentData(data: Tqmtm04, parent: MSCNode) {
  if (parent instanceof MSC) {
    data.cMsc = parent.data.cMsc;
    data.cTqmtm01Id = parent.id;
    return;
  }
  if (parent instanceof MSCLine) {
    data.cTqmtm02Id = parent.id;
    setCopiedParentData(data, parent.msc);
    return;
  }
  if (parent instanceof MSCProc) {
    data.cTqmtm03Id = parent.id;
    setCopiedParentData(data, parent.line);
    return;
  }
  if (parent instanceof MSCIdx) setCopiedParentData(data, parent.parent);
}
function setCopiedDetail(idx: MSCIdx, parent: MSCNode) {
  let msc: MSC | null = null,
    line: MSCLine | null = null,
    proc: MSCProc | null = null;
  if (parent instanceof MSC) msc = parent;
  else if (parent instanceof MSCLine) {
    line = parent;
    msc = parent.msc;
  } else if (parent instanceof MSCProc) {
    proc = parent;
    line = parent.line;
    msc = parent.line.msc;
  } else if (parent instanceof MSCIdx) {
    setCopiedDetail(idx, parent.parent);
    return;
  }
  for (const detail of idx.idxDetails.values) {
    detail.id = uid();
    detail.idxNo = idx.idxNo;
  }
  for (const item of idx.subIdxes) {
    item.idxData.id = uid();
    const d = item.data as Tqmtm04;
    d.id = uid();
    if (msc) {
      d.cMsc = msc.data.cMsc;
      d.cTqmtm01Id = msc.id;
    }
    d.cTqmtm02Id = line?.id ?? null;
    d.cTqmtm03Id = proc?.id ?? null;
    item.updateIdxNo(item.id);
    setCopiedDetail(item, item.parent);
  }
}

/* ================================================================ MSC 层 */

export class MSC extends MSCNode {
  data: Tqmtm01 = {};
  readonly lines: MSCLine[] = [];
  override get id() {
    return this.data.id ?? "";
  }
  override get treeDisplayText() {
    return `冶金规范[${this.data.cMsc ?? ""}]`;
  }
  override get tableType() {
    return MscBasicTableType.A;
  }
  createIdx(x: Tqmtm04): MSCIdx {
    x.cMsc = this.data.cMsc;
    x.cTqmtm01Id = this.id;
    return MSCIdx.create(x, this);
  }
  addIdxes(list: Tqmtm04[]) {
    for (const x of list) this.idxes.push(this.createIdx({ ...x } as Tqmtm04));
  }
  updateMsc(cd: string) {
    this.data.cMsc = cd;
    for (const line of this.lines) {
      line.data.cMsc = cd;
      for (const proc of line.procs) {
        proc.data.cMsc = cd;
        for (const idx of proc.idxes) idx.data.cMsc = cd;
      }
      for (const idx of line.idxes) idx.data.cMsc = cd;
    }
    for (const idx of this.idxes) idx.data.cMsc = cd;
  }
  createLine(tm04s: Tqmtm04[]): MSCLine {
    const lineNo = this.generateNextLineNo();
    const line = new MSCLine(this);
    line.data = {
      id: uid(),
      cMsc: this.data.cMsc,
      cMscLineNo: lineNo,
      nDefaultSeq: (this.lines.length + 1) * 10,
      cHoldFlag: YesNo.N,
      cTqmtm01Id: this.id,
      createTime: nowIso(),
      creator: me(),
    } as Tqmtm02;
    line.addIdxes(tm04s);
    return line;
  }
  generateNextLineNo(): string {
    const nums = this.lines
      .map((x) => x.data.cMscLineNo ?? "")
      .filter((x) => x !== "" && /^\d+$/.test(x))
      .map((x) => parseInt(x, 10));
    if (!nums.length) return "0001";
    return String(Math.max(...nums) + 1).padStart(4, "0");
  }
  addLine(line: MSCLine) {
    this.lines.push(line);
    this.sortLines();
  }
  sortLines() {
    this.lines.sort((a, b) => String(a.data.cMscLineNo ?? "").localeCompare(String(b.data.cMscLineNo ?? "")));
  }
  removeLine(lineNo: string): MSCLine | null {
    const line = this.lines.find((x) => x.data.cMscLineNo === lineNo) ?? null;
    if (line) this.lines.splice(this.lines.indexOf(line), 1);
    this.sortLines();
    return line;
  }
  async copy(mscNo: string): Promise<MSC> {
    const res = new MSC();
    res.data = { ...this.data } as Tqmtm01;
    res.data.cMscSrc = this.data.cMsc;
    res.data.id = uid();
    res.data.cMsc = mscNo;
    res.data.cValidFlag = ValidFlag.Invalid;
    for (const line of this.lines) await line.copy(res);
    for (const idx of this.idxes) await idx.copy(res);
    return res;
  }
}

export class MSCLine extends MSCNode {
  data: Tqmtm02 = {};
  readonly procs: MSCProc[] = [];
  readonly msc: MSC;
  constructor(msc: MSC) {
    super();
    this.msc = msc;
  }
  override get id() {
    return this.data.id ?? "";
  }
  override get treeDisplayText() {
    return `产线[${this.data.cMscLineNo ?? ""}]`;
  }
  override get tableType() {
    return MscBasicTableType.B;
  }
  createIdx(x: Tqmtm04): MSCIdx {
    x.cMsc = this.msc.data.cMsc;
    x.cMscLineNo = this.data.cMscLineNo;
    x.cTqmtm01Id = this.msc.id;
    x.cTqmtm02Id = this.id;
    return MSCIdx.create(x, this);
  }
  addIdxes(list: Tqmtm04[]) {
    for (const x of list) this.idxes.push(this.createIdx({ ...x } as Tqmtm04));
  }
  updateLineNo(lineNo: string) {
    this.data.cMscLineNo = lineNo;
    this.procs.forEach((x) => (x.data.cMscLineNo = lineNo));
    for (const idx of [...this.idxes, ...this.procs.flatMap((p) => p.idxes)]) updateIdxLineNo(idx, lineNo);
  }
  createProc(): MSCProc {
    const seq = this.procs.length ? Math.max(...this.procs.map((p) => p.data.nWholeBacklogSeq ?? 0)) : 0;
    const proc = new MSCProc(this);
    proc.data = {
      id: uid(),
      cMsc: this.data.cMsc,
      cMscLineNo: this.data.cMscLineNo,
      cTqmtm01Id: this.msc.id,
      cTqmtm02Id: this.id,
      nWholeBacklogSeq: seq + 10,
      creator: me(),
      createTime: nowIso(),
    } as Tqmtm03;
    return proc;
  }
  addProc(proc: MSCProc, tm04s: Tqmtm04[]) {
    proc.addIdxes(tm04s);
    this.procs.push(proc);
    this.sortProcs();
    this.refreshProc();
  }
  sortProcs() {
    this.procs.sort(
      (a, b) =>
        (a.data.nWholeBacklogSeq ?? 0) - (b.data.nWholeBacklogSeq ?? 0) ||
        String(a.data.cWholeBacklogCode ?? "").localeCompare(String(b.data.cWholeBacklogCode ?? "")),
    );
  }
  rmProc(procId: string): MSCProc | null {
    const proc = this.procs.find((x) => x.data.id === procId) ?? null;
    if (proc) this.procs.splice(this.procs.indexOf(proc), 1);
    this.sortProcs();
    this.refreshProc();
    return proc;
  }
  refreshProc() {
    if (!this.procs.length) {
      this.data.cWholeBacklog = "";
      this.data.cWholeBacklogDesc = "";
      return;
    }
    const sorted = [...this.procs].sort(
      (a, b) =>
        (a.data.nWholeBacklogSeq ?? 0) - (b.data.nWholeBacklogSeq ?? 0) ||
        String(a.data.cWholeBacklogCode ?? "").localeCompare(String(b.data.cWholeBacklogCode ?? "")),
    );
    this.data.cWholeBacklog = sorted.map((x) => x.data.cWholeBacklogCode ?? "").join("-");
    this.data.cWholeBacklogDesc = sorted
      .map(
        (x) =>
          procKvList.get(x.data.cWholeBacklogCode ?? "") ?? x.data.cWholeBacklogName ?? x.data.cWholeBacklogCode ?? "",
      )
      .join("-");
  }
  async copy(msc: MSC): Promise<MSCLine> {
    const line = new MSCLine(msc);
    line.data = { ...this.data } as Tqmtm02;
    line.data.id = uid();
    line.data.cMsc = msc.data.cMsc;
    line.data.cTqmtm01Id = msc.id;
    msc.lines.push(line);
    for (const proc of this.procs) await proc.copy(line);
    for (const idx of this.idxes) await idx.copy(line);
    return line;
  }
}
function updateIdxLineNo(idx: MSCIdx, lineNo: string) {
  idx.data.cMscLineNo = lineNo;
  for (const sub of idx.subIdxes) updateIdxLineNo(sub, lineNo);
}

export class MSCProc extends MSCNode {
  data: Tqmtm03 = {};
  readonly line: MSCLine;
  constructor(line: MSCLine) {
    super();
    this.line = line;
  }
  override get id() {
    return this.data.id ?? "";
  }
  override get treeDisplayText() {
    return `工序${this.data.cWholeBacklogCode ?? ""}[${this.data.cWholeBacklogName ?? ""}]`;
  }
  override get tableType() {
    return MscBasicTableType.C;
  }
  createIdx(x: Tqmtm04): MSCIdx {
    x.cMsc = this.line.msc.data.cMsc;
    x.cMscLineNo = this.line.data.cMscLineNo;
    x.cTqmtm01Id = this.line.msc.id;
    x.cTqmtm02Id = this.line.id;
    x.cTqmtm03Id = this.id;
    x.cWholeBacklogCode = this.data.cWholeBacklogCode;
    x.cWholeBacklogName = this.data.cWholeBacklogName;
    x.nWholeBacklogSeq = this.data.nWholeBacklogSeq;
    return MSCIdx.create(x, this);
  }
  addIdxes(list: Tqmtm04[]) {
    for (const x of list) this.idxes.push(this.createIdx({ ...x } as Tqmtm04));
  }
  updateProcNo(procNo: string, tm04s: Tqmtm04[]) {
    this.data.cWholeBacklogCode = procNo;
    this.idxes.length = 0;
    this.addIdxes(tm04s);
    this.line.refreshProc();
  }
  async copy(line: MSCLine): Promise<MSCProc> {
    const msc = line.msc;
    const proc = new MSCProc(line);
    proc.data = { ...this.data } as Tqmtm03;
    proc.data.id = uid();
    proc.data.cMsc = msc.data.cMsc;
    proc.data.cTqmtm01Id = msc.id;
    proc.data.cTqmtm02Id = line.id;
    line.procs.push(proc);
    for (const idx of this.idxes) await idx.copy(proc);
    return proc;
  }
}

/* ================================================================ 树 */

export class IdxReferenceTree {
  readonly pid: string;
  readonly idxRefObj: MSCNode;
  constructor(pid: string, obj: MSCNode) {
    this.pid = pid;
    this.idxRefObj = obj;
  }
  get id() {
    return this.idxRefObj.id;
  }
  get displayTxt() {
    return this.idxRefObj.treeDisplayText;
  }
  get tableType() {
    return this.idxRefObj.tableType;
  }
}

export function buildTree(msc: MSC): IdxReferenceTree[] {
  const list: IdxReferenceTree[] = [];
  const push = (pid: string, obj: MSCNode) => list.push(new IdxReferenceTree(pid, obj));
  push("0", msc);
  for (const line of msc.lines) {
    push(msc.id, line);
    for (const proc of line.procs) {
      push(line.id, proc);
      for (const idx of proc.idxes) {
        push(proc.id, idx);
        pushTestItems(list, idx);
      }
    }
    for (const idx of line.idxes) {
      push(line.id, idx);
      pushTestItems(list, idx);
    }
  }
  for (const idx of msc.idxes) {
    push(msc.id, idx);
    pushTestItems(list, idx);
  }
  return list;
}
function pushTestItems(list: IdxReferenceTree[], idx: MSCIdx) {
  for (const sub of idx.subIdxes) {
    list.push(new IdxReferenceTree(idx.id, sub));
    pushTestItems(list, sub);
  }
}

/* ================================================================ TQMTMAC 槽位映射 */

let macCfg: TsTableSettingDto | null | undefined;
async function getMacCfg(): Promise<TsTableSettingDto | null> {
  if (macCfg === undefined) {
    macCfg = await tableConfigApi.queryTableConfig(TABLE_MAC).catch(() => null);
  }
  return macCfg;
}
async function unionMacTyped(rows: IdxRow[]): Promise<IdxRow[]> {
  const typed = rows.filter((r) => !isSlotRow(r));
  const slots = rows.filter((r) => isSlotRow(r));
  if (!slots.length) return typed;
  const cfg = await getMacCfg();
  const props = (cfg?.tableColumnSettings ?? []).filter((p) => p.cProCode && p.nSeq != null);
  const seen = new Set(typed.map((t) => t.id));
  for (const slot of slots) {
    const row: IdxRow = { ...slot } as IdxRow;
    for (const p of props) row[p.cProCode as string] = slot[`cValue${p.nSeq}`] ?? null;
    row.tableCode = TABLE_MAC;
    if (seen.has(row.id)) continue;
    typed.push(row);
  }
  return typed;
}
export async function macTypedToSlot(row: IdxRow): Promise<TsTableProValIdxTable> {
  const cfg = await getMacCfg();
  const out: Record<string, unknown> = {
    id: row.id,
    cTbCode: TABLE_MAC,
    tableCode: TABLE_MAC,
    idxNo: row.idxNo ?? null,
    creator: row.creator ?? null,
    createTime: row.createTime ?? null,
    lastModifier: row.lastModifier ?? null,
    lastModifyTime: row.lastModifyTime ?? null,
  };
  for (const p of cfg?.tableColumnSettings ?? []) {
    if (p.nSeq == null || !p.cProCode) continue;
    const v = row[p.cProCode];
    out[`cValue${p.nSeq}`] = v == null ? null : String(v);
  }
  return out as unknown as TsTableProValIdxTable;
}

/* ================================================================ ViewModel */

export const procKvList = new Map<string, string>();

export function updateMscDesc(msc: MSC) {
  const d = msc.data;
  d.cMscDesc = `${d.cProdClassDesc ?? ""} ${d.cProdCName ?? ""} ${d.cDeliveryStateDesc ?? ""} ${d.cCustStd ?? ""}`;
}

function convertTableType(t: number): MscBasicTableType {
  if (t === 1) return MscBasicTableType.A;
  if (t === 2) return MscBasicTableType.B;
  if (t === 3) return MscBasicTableType.C;
  throw new Error("不支持的基表类型");
}

export class MscVm {
  readonly mscs: MSC[] = [];
  tm08s: Tqmtm08[] = [];
  private backup: MSC | null = null;

  /** 原 InitData()：基表配置 + 全程工序字典 */
  async loadBase() {
    this.tm08s = (await mSCApi.queryTm08s()) ?? [];
    try {
      const list = (await systemKeyValueApi.querySysKvItemList("A0100:PROC_CODE")) ?? [];
      procKvList.clear();
      list.filter((x) => x.cCode).forEach((x) => procKvList.set(x.cCode as string, x.cName ?? ""));
    } catch {
      /* 拦截层已 toast */
    }
  }

  /** 原 InitData(page)：分页查询并水合对象图，返回 DataCount */
  async queryPage(input: MSCQueryParaPaginationQueryInput): Promise<number> {
    await this.loadBase();
    this.mscs.length = 0;
    const dto = (await mSCApi.queryMSCs(input)) ?? { data: [], dataCount: 0 };
    for (const item of dto.data ?? []) {
      this.mscs.push(await initMsc(item));
    }
    return dto.dataCount ?? 0;
  }

  getTm04s(type: MscBasicTableType, prodCode?: string | null, procCd?: string | null): Tqmtm04[] {
    const rows = this.tm08s
      .filter((x) => convertTableType(x.cBasicTableTypeCode as number) === type)
      .filter((x) => !x.cProdCode || x.cProdCode === prodCode);
    const byProc = procCd == null ? null : rows.filter((x) => x.cWorkTypeCode === procCd);
    return (byProc ?? rows).map(createTm04);
  }

  createMsc(mscNo: string): MSC {
    const msc = new MSC();
    msc.data = {
      id: uid(),
      cMsc: mscNo,
      createTime: nowIso(),
      creator: me(),
      nVersion: 1,
      cValidFlag: ValidFlag.Invalid,
    } as Tqmtm01;
    msc.addIdxes(this.getTm04s(MscBasicTableType.A, msc.data.cProdCode));
    return msc;
  }
  addMsc(msc: MSC) {
    this.mscs.push(msc);
  }
  async copyMsc(msc: MSC, mscNo: string): Promise<MSC> {
    return msc.copy(mscNo);
  }

  async beginEdit(msc: MSC): Promise<MSC> {
    if (this.backup) throw new Error("当前数据正在编辑，请先提交或撤回后再进行编辑操作");
    const dto = await mSCApi.queryMSC(msc.data.cMsc ?? undefined);
    this.backup = await initMsc(dto as MSCDto);
    return this.backup;
  }
  rollbackEdit() {
    this.backup = null;
  }
  completeEdit() {
    if (!this.backup) return;
    const i = this.mscs.findIndex((x) => x.id === this.backup?.id);
    if (i < 0) return;
    this.mscs.splice(i, 1, this.backup);
    this.backup = null;
  }

  async save(msc: MSC) {
    await mSCApi.saveMsc(await toDto(msc));
  }
  async delete(msc: MSC) {
    await mSCApi.deleteMsc(msc.id);
    const i = this.mscs.indexOf(msc);
    if (i >= 0) this.mscs.splice(i, 1);
  }
  /** 原 Effect：已是目标状态 → 抛「冶金规范{生效|未生效}，不需要操作」 */
  async effect(msc: MSC, flag: ValidFlag) {
    if (msc.data.cValidFlag === flag) throw new Error(`冶金规范${VALID_DISPLAY[flag]}，不需要操作`);
    await mSCApi.effectMsc(msc.id, flag);
    msc.data.cValidFlag = flag;
  }

  updateMsc(msc: MSC, cd: string) {
    msc.updateMsc(cd);
  }
  updateProdCd(msc: MSC, prodCd?: string | null) {
    msc.data.cProdCode = prodCd ?? null;
  }

  /** 原 btnRefreshBaseTable（更新基表）：按 Tqmtm08 补齐各层级缺失的基表索引 */
  addNotExistsIdxTabs(msc: MSC) {
    let tm04s = this.getTm04s(MscBasicTableType.A, msc.data.cProdCode).filter(
      (w) => !msc.idxes.some((x) => x.data.cBasicTableCode === w.cBasicTableCode),
    );
    msc.addIdxes(tm04s);
    for (const line of msc.lines) {
      tm04s = this.getTm04s(MscBasicTableType.B, msc.data.cProdCode).filter(
        (w) => !line.idxes.some((x) => x.data.cBasicTableCode === w.cBasicTableCode),
      );
      line.addIdxes(tm04s);
      for (const proc of line.procs) {
        tm04s = this.getTm04s(MscBasicTableType.C, msc.data.cProdCode, proc.data.cWholeBacklogCode).filter(
          (w) => !proc.idxes.some((x) => x.data.cBasicTableCode === w.cBasicTableCode),
        );
        proc.addIdxes(tm04s);
      }
    }
  }

  /* 产线 */
  createLine(msc: MSC): MSCLine {
    return msc.createLine(this.getTm04s(MscBasicTableType.B, msc.data.cProdCode));
  }
  addLine(msc: MSC, line: MSCLine) {
    msc.addLine(line);
  }
  removeLine(msc: MSC, lineNo: string) {
    return msc.removeLine(lineNo);
  }
  updateLine(line: MSCLine, dto: EditLineDto): MSCLine {
    if (line.data.cMscLineNo !== dto.lineNo) line.updateLineNo(dto.lineNo ?? "");
    applyLineData(dto, line);
    return line;
  }

  /* 工序 */
  createProc(line: MSCLine): MSCProc {
    return line.createProc();
  }
  addProc(line: MSCLine, proc: MSCProc) {
    line.addProc(proc, this.getTm04s(MscBasicTableType.C, line.msc.data.cProdCode, proc.data.cWholeBacklogCode));
  }
  removeProc(line: MSCLine, procId: string) {
    return line.rmProc(procId);
  }
  updateProc(proc: MSCProc, dto: EditProcDto): MSCProc {
    if (proc.data.cWholeBacklogCode !== dto.procCd) {
      proc.updateProcNo(dto.procCd ?? "", this.getTm04s(MscBasicTableType.C, proc.line.msc.data.cProdCode, dto.procCd));
    }
    applyProcData(dto, proc);
    return proc;
  }

  buildTree(): IdxReferenceTree[] {
    return this.mscs.flatMap((msc) => buildTree(msc));
  }
}

function createTm04(x: Tqmtm08): Tqmtm04 {
  const type = convertTableType(x.cBasicTableTypeCode as number);
  return {
    id: uid(),
    cBasicTableTypeCode: type,
    cBasicTableType: TYPE_DISPLAY[type],
    cWholeBacklogCode: "NA",
    cWholeBacklogName: "NA",
    nWholeBacklogSeq: 0,
    cMscLineNo: "NA",
    cBasicTableCode: x.cBasicTableCode,
    cBasicTableCName: x.cBasicTableCName,
    cBasicTableEName: x.cBasicTableEName,
    cItemMustFlag: x.cItemMustFlag,
    creator: me(),
    createTime: nowIso(),
  } as unknown as Tqmtm04;
}

/* ---------- 原 InitMsc：MSCDto → 对象图 ---------- */
function guessTableCode(row: IdxRow): string {
  if (row.cTbCode) return row.cTbCode;
  if ("testSubItemCode" in row && "valueMin" in row) return TABLE_P0;
  if ("certiIndicate" in row || "sampleNumRnd" in row) return TABLE_T1;
  return "";
}
function allRowsOf(dto: MSCDto): IdxRow[] {
  if (dto.allIdxData?.length) {
    return dto.allIdxData.map((r) => {
      const row = r as IdxRow;
      if (row.tableCode == null) row.tableCode = guessTableCode(row);
      return row;
    });
  }
  const rows: IdxRow[] = [];
  (dto.idxData ?? []).forEach((r) => rows.push({ ...r, tableCode: r.tableCode ?? r.cTbCode } as IdxRow));
  (dto.tqmtmt1s ?? []).forEach((r) => rows.push({ ...r, tableCode: TABLE_T1 } as IdxRow));
  (dto.tqmtmp0s ?? []).forEach((r) => rows.push({ ...r, tableCode: TABLE_P0 } as IdxRow));
  return rows;
}
export async function initMsc(item: MSCDto): Promise<MSC> {
  const msc = new MSC();
  msc.data = (item.tqmtm01 ?? {}) as Tqmtm01;
  const rows = allRowsOf(item);
  const tm04s = item.tqmtm04s ?? [];
  for (const x of tm04s.filter((y) => y.cBasicTableTypeCode === MscBasicTableType.A)) {
    msc.idxes.push(await MSCIdx.createWith(x, tm04s, msc, rows));
  }
  for (const lx of item.tqmtm02s ?? []) {
    const line = new MSCLine(msc);
    line.data = lx;
    msc.lines.push(line);
    for (const x of tm04s
      .filter((y) => y.cBasicTableTypeCode === MscBasicTableType.B)
      .filter((y) => y.cTqmtm02Id === line.id)) {
      line.idxes.push(await MSCIdx.createWith(x, tm04s, line, rows));
    }
    for (const px of (item.tqmtm03s ?? []).filter((y) => y.cTqmtm02Id === line.id)) {
      const proc = new MSCProc(line);
      proc.data = px;
      line.procs.push(proc);
      for (const x of tm04s
        .filter((y) => y.cBasicTableTypeCode === MscBasicTableType.C)
        .filter((y) => y.cTqmtm03Id === proc.id)) {
        proc.idxes.push(await MSCIdx.createWith(x, tm04s, proc, rows));
      }
    }
    line.sortProcs();
    line.refreshProc();
  }
  msc.sortLines();
  return msc;
}

/* ---------- 原 ToDto：对象图 → MSCDto ---------- */
async function toDto(msc: MSC): Promise<MSCDto> {
  const proc = msc.lines.flatMap((l) => l.procs);
  const idxGroups = [...msc.idxes, ...msc.lines.flatMap((l) => l.idxes), ...proc.flatMap((p) => p.idxes)].map(
    (i) => i.idxDetails,
  );
  const testItemDetails = idxGroups
    .flatMap((g) => g.subIdxes.filter((s) => s instanceof MSCTestItemNode))
    .map((s) => s.idxDetails);

  const idxData: TsTableProValIdxTable[] = [];
  for (const g of idxGroups) {
    idxData.push(...g.getTsTableVal());
    for (const mac of g.getMacRows()) idxData.push(await macTypedToSlot(mac));
    // 槽位形态的 TQMTMAC 行原样带回（C# ToTableProVlaue 只处理强类型行）
    idxData.push(...(g.getMacSlots() as unknown as TsTableProValIdxTable[]));
  }
  return {
    tqmtm01: msc.data,
    tqmtm02s: msc.lines.map((l) => l.data),
    tqmtm03s: proc.map((p) => p.data),
    tqmtm04s: [
      ...msc.idxes.map((i) => i.data),
      ...msc.lines.flatMap((l) => l.idxes.map((i) => i.data)),
      ...proc.flatMap((p) => p.idxes.map((i) => i.data)),
      ...idxGroups
        .flatMap((g) => g.subIdxes)
        .filter((s): s is MSCTestItemNode => s instanceof MSCTestItemNode)
        .map((s) => s.data as Tqmtm04),
    ],
    tqmtmt1s: idxGroups.flatMap((g) => g.getT1()),
    tqmtmp0s: testItemDetails.flatMap((g) => g.getP0()),
    idxData,
  } as MSCDto;
}

/* ---------- EditLineDto / EditProcDto（原 TransData/UpdateData） ---------- */
export interface EditLineDto {
  lineNo?: string | null;
  stNo?: string | null;
  stNo1?: string | null;
  stNo2?: string | null;
  stNo3?: string | null;
  stNo4?: string | null;
  stNo5?: string | null;
  stNo6?: string | null;
  stNo7?: string | null;
  stNo8?: string | null;
  stNo9?: string | null;
  remark?: string | null;
}
export interface EditProcDto {
  procCd?: string | null;
  remark?: string | null;
  procName?: string | null;
  seq?: number;
}
export function transLine(line: MSCLine): EditLineDto {
  return {
    lineNo: line.data.cMscLineNo,
    remark: line.data.cRemark,
    stNo: line.data.cStNo,
    stNo1: line.data.cStNo1,
    stNo2: line.data.cStNo2,
    stNo3: line.data.cStNo3,
    stNo4: line.data.cStNo4,
    stNo5: line.data.cStNo5,
    stNo6: line.data.cStNo6,
    stNo7: line.data.cStNo7,
    stNo8: line.data.cStNo8,
    stNo9: line.data.cStNo9,
  };
}
export function applyLineData(dto: EditLineDto, line: MSCLine) {
  line.data.cMscLineNo = dto.lineNo ?? null;
  line.data.cRemark = dto.remark ?? null;
  line.data.cStNo = dto.stNo ?? null;
  line.data.cStNo1 = dto.stNo1 ?? null;
  line.data.cStNo2 = dto.stNo2 ?? null;
  line.data.cStNo3 = dto.stNo3 ?? null;
  line.data.cStNo4 = dto.stNo4 ?? null;
  line.data.cStNo5 = dto.stNo5 ?? null;
  line.data.cStNo6 = dto.stNo6 ?? null;
  line.data.cStNo7 = dto.stNo7 ?? null;
  line.data.cStNo8 = dto.stNo8 ?? null;
  line.data.cStNo9 = dto.stNo9 ?? null;
}
export function transProc(proc: MSCProc): EditProcDto {
  return {
    procCd: proc.data.cWholeBacklogCode,
    remark: proc.data.cRemark,
    seq: proc.data.nWholeBacklogSeq,
  };
}
export function applyProcData(dto: EditProcDto, proc: MSCProc) {
  proc.data.cWholeBacklogCode = dto.procCd ?? null;
  proc.data.cRemark = dto.remark ?? null;
  proc.data.cWholeBacklogName = dto.procName ?? null;
  proc.data.nWholeBacklogSeq = dto.seq ?? 0;
  proc.line.sortProcs();
  proc.line.refreshProc();
}

/** 原 FrmEditMsc.ValidateTestItem：保存前校验（消息含 <b> 标签，展示前去标签） */
export function validateTestItems(msc: MSC): string {
  const msg: string[] = [];
  const pfx = (line: MSCLine, proc: MSCProc) =>
    `产线[${line.data.cMscLineNo ?? ""}] 工序[${proc.data.cWholeBacklogCode ?? ""}-${proc.data.cWholeBacklogName ?? ""}]`;
  for (const line of msc.lines) {
    for (const proc of line.procs) {
      for (const idx of proc.idxes) {
        if (!(idx instanceof Tqmtmt1Idx) && !(idx.data.cBasicTableCode === TABLE_T1)) continue;
        for (const t1 of idx.idxDetails.getT1()) {
          const tmp1 = t1.sampleNumRnd == null || t1.sampleNumRnd <= 0;
          const tmp2 = t1.certiIndicate === YesNo.Y && (t1.certiItemNum == null || t1.certiItemNum <= 0);
          const rangeBad = t1.thickMax < t1.thickMin || t1.widthMax < t1.widthMin || t1.lengthMax < t1.lengthMin;
          if (tmp1 || tmp2 || rangeBad) {
            let s = `${pfx(line, proc)} 试验项目要求[${t1.testItemType ?? ""}-${t1.testItemName ?? ""}] `;
            if (tmp1) s += "  <b>取样个数</b>必须大于0;";
            if (tmp2) s += "  <b>列印项目组数</b>必须大于0;";
            if (rangeBad) s += "  <b>规格范围错误</b>;";
            msg.push(s);
          }
        }
        // 试验子项（TQMTMP0）
        for (const node of idx.idxDetails.subIdxes) {
          const tmp0s = node.idxDetails.getP0();
          const existsErr: string[] = [];
          for (let i = 0; i < tmp0s.length - 1; i++) {
            if (existsErr.includes(tmp0s[i].testSubItemCode)) continue;
            for (let j = i + 1; j < tmp0s.length; j++) {
              if (existsErr.includes(tmp0s[i].testSubItemCode)) break;
              if (tmp0s[i].testSubItemCode !== tmp0s[j].testSubItemCode) continue;
              const thickHit =
                checkInRange(tmp0s[i].thickRange, tmp0s[j].minThick) ||
                checkInRange(tmp0s[i].thickRange, tmp0s[j].maxThick) ||
                checkInRange(tmp0s[j].thickRange, tmp0s[i].minThick) ||
                checkInRange(tmp0s[j].thickRange, tmp0s[i].maxThick);
              const widthHit =
                checkInRange(tmp0s[i].widthkRange, tmp0s[j].minWidth) ||
                checkInRange(tmp0s[i].widthkRange, tmp0s[j].maxWidth) ||
                checkInRange(tmp0s[j].widthkRange, tmp0s[i].minWidth) ||
                checkInRange(tmp0s[j].widthkRange, tmp0s[i].maxWidth);
              if (thickHit && widthHit) {
                existsErr.push(tmp0s[i].testSubItemCode);
                msg.push(
                  `${pfx(line, proc)} 试验子项目要求[${tmp0s[i].testItemName ?? ""}-${tmp0s[i].testSubItemName ?? ""}(${tmp0s[i].testSubItemCode ?? ""})]   <b>试验子项代码[${tmp0s[i].testSubItemCode}]重复，规格范围存在交集</b>;`,
                );
              }
            }
          }
          for (const p0 of tmp0s) {
            if (p0.valueMax < p0.valueMin || p0.maxThick < p0.minThick || p0.maxWidth < p0.minWidth) {
              let s = `${pfx(line, proc)} 试验子项目要求[${p0.testItemName ?? ""}-${p0.testSubItemName ?? ""}] `;
              if (p0.valueMax < p0.valueMin) s += "  <b>检验标准上限不能小于检验标准下限</b>;";
              if (p0.maxThick < p0.minThick || p0.maxWidth < p0.minWidth) s += "  <b>规格范围错误</b>;";
              msg.push(s);
            }
          }
        }
      }
    }
  }
  return msg.join("\n");
}

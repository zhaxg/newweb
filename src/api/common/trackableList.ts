export interface SaveChangesData<T> {
  addedItems: T[];
  changedItems: T[];
  deletedItems: T[];
}

const RAW = Symbol("trackable.raw");
const ORIG = Symbol("trackable.orig");
const SNAP = Symbol("trackable.snap");
const DIRTY = Symbol("trackable.dirty");
const PROXIES = Symbol("trackable.proxies");
const REG = Symbol("trackable.register");
const READ = Symbol("trackable.readable");
const MUT = Symbol("trackable.mutating");
const REBUILD = Symbol("trackable.rebuild");

const isObj = (v: unknown): v is Record<PropertyKey, unknown> => typeof v === "object" && v !== null;
const INDEX_RE = /^(?:0|[1-9]\d*)$/;

function toRaw<X>(item: X): X {
  const raw = isObj(item) ? ((item as Record<symbol, unknown>)[RAW] as object | undefined) : undefined;
  return (raw ?? item) as X;
}

function trackIdOfItem(item: unknown): string | undefined {
  if (!isObj(item)) return undefined;
  return (toRaw(item) as { __trackId?: string }).__trackId;
}

function issueTrackId(target: object, id: string): void {
  try {
    Object.defineProperty(target, "__trackId", { value: id, enumerable: false, writable: true, configurable: true });
  } catch {
    (target as { __trackId: string }).__trackId = id; // 不可扩展对象退化枚举槽，出口/比较剔除
  }
}

let trackSeq = 0;
const trackPrefix = `h${Math.random().toString(36).slice(2, 10)}-`;

/**
 * 结构化比较（替代 JSON.stringify 全行比对）：键序无关、Date 按时刻、undefined 视同缺失、
 * 函数按引用、循环引用成对消解。trackId 永不参与比较。
 */
function valueEquals(a: unknown, b: unknown, seen = new Map<object, Set<object>>()): boolean {
  if (Object.is(a, b)) return true;
  if (!isObj(a) || !isObj(b)) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  let partners = seen.get(a);
  if (partners) {
    if (partners.has(b)) return true;
  } else {
    partners = new Set();
    seen.set(a, partners);
  }
  partners.add(b);
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => valueEquals(v, b[i], seen));
  }
  const ea = normEntries(a);
  const eb = normEntries(b);
  if (ea.length !== eb.length) return false;
  const mb = new Map(eb);
  return ea.every(([k, v]) => mb.has(k) && valueEquals(v, mb.get(k), seen));
}

const normEntries = (o: object) =>
  Object.entries(o).filter(([k, v]) => k !== "__trackId" && v !== undefined && typeof v !== "function");

/** 行内容代理：任意深度的属性写都落回裸对象并置脏对应行实例 */
function wrapRow<K extends object>(row: K, markDirty: () => void): K {
  const cache = new WeakMap<object, object>();
  const wrap = <V extends object>(v: V): V => (cache.get(v) as V) ?? inner(v);
  const inner = <V extends object>(target: V): V =>
    new Proxy(target, {
      get(t, k, r) {
        if (k === RAW) return t;
        const v = Reflect.get(t, k, r);
        return isObj(v) && typeof k !== "symbol" ? wrap(v) : v;
      },
      set(t, k, v) {
        const old = (t as Record<PropertyKey, unknown>)[k];
        if (Object.is(old, v)) return true;
        (t as Record<PropertyKey, unknown>)[k] = isObj(v) ? toRaw(v) : v;
        markDirty();
        return true;
      },
      deleteProperty(t, k) {
        delete (t as Record<PropertyKey, unknown>)[k];
        markDirty();
        return true;
      },
    });
  cache.set(row, row);
  return wrap(row);
}

function deepClone<X>(item: X): X {
  if (!isObj(item)) return item;
  try {
    return structuredClone(item);
  } catch {
    return JSON.parse(JSON.stringify(item)) as X;
  }
}

interface State<T> {
  [ORIG]: Map<string, T>;
  [SNAP]: Map<string, T>;
  [DIRTY]: WeakSet<T>;
  [PROXIES]: WeakMap<T, T>;
  [REG]: (item: unknown) => string | undefined;
  [READ]: (item: T) => T;
  [MUT]: (v?: boolean) => boolean;
  [REBUILD]: () => void;
}

/**
 * 变更跟踪列表：以「行实例身份」判增删，内容比较只用来判 changed。
 *
 * 对外仍是数组（下标读写、length、迭代、原生 Array 方法照常），但一切写路径都在守门内：
 * - `list[i] = x` 显式替换：新内容对象**继承该槽位原主的 trackId** → 记为 changed，
 *   绝不退化成 add+delete（行在服务器端的身份保住）；写入自带身份的对象（行挪位）保留原身份；
 * - 原生 push/splice/shift/length= 的槽位写只做登记与归一化，不触发继承（位移不是替换）；
 * - 行对象任意深度被原地改（Object.assign、grid 单元格编辑、UI 回写）经行代理置脏 → changed；
 * - map/filter/slice/concat 显式落回普通数组，不携带跟踪身份；
 * - __trackId 非枚举（spread/JSON 带不走 → 克隆行不撞 id、提交体天然干净），
 *   读取走 trackIdOf(row)，别直接点属性。
 * 约定：行必须是对象（原始值行无法登记身份，不参与变更账本）；同一行对象只应存在于列表一处。
 * （实例状态用 symbol 键而非 #private：#字段品牌检查不穿透 Proxy receiver。）
 */
export class TrackableList<T> extends Array<T> {
  declare [ORIG]: Map<string, T>;
  declare [SNAP]: Map<string, T>;
  declare [DIRTY]: WeakSet<T>;
  declare [PROXIES]: WeakMap<T, T>;
  declare [REG]: (item: unknown) => string | undefined;
  declare [READ]: (item: T) => T;
  declare [MUT]: (v?: boolean) => boolean;
  declare [REBUILD]: () => void;

  /** 派生数组（splice 返回值等）落回原生 Array，不误入本类构造 */
  static override get [Symbol.species](): ArrayConstructor {
    return Array;
  }

  constructor(items: T[] | number = []) {
    super();
    // splice 等原生方法经 SpeciesConstructor 兜底 new A(len)——数字入参按空列表处理
    const incoming = typeof items === "number" ? [] : items;
    const self = this as unknown as State<T> & T[];
    const orig = new Map<string, T>();
    const snap = new Map<string, T>();
    let dirty = new WeakSet<T>();
    const proxies = new WeakMap<T, T>();
    let adopting = true;

    const readable = (item: T): T => {
      const raw = toRaw(item);
      return (isObj(raw) && (proxies.get(raw as T) as T)) || raw;
    };
    const register = (item: unknown): string | undefined => {
      const raw = toRaw(item);
      if (!isObj(raw)) return undefined;
      let id = (raw as { __trackId?: string }).__trackId;
      if (id === undefined) {
        id = `${trackPrefix}${trackSeq++}`;
        issueTrackId(raw, id);
      } else if (Object.prototype.propertyIsEnumerable.call(raw, "__trackId")) {
        // 老实现/老数据留下的枚举 trackId 会随 spread/JSON 泄漏并被克隆行带走 → 就地收编为非枚举，身份值不变
        issueTrackId(raw, id);
      }
      if (!proxies.has(raw as T)) proxies.set(raw as T, wrapRow(raw as object, () => dirty.add(raw as T)) as T);
      return id;
    };
    const rebuildOriginals = (): void => {
      orig.clear();
      snap.clear();
      for (let i = 0; i < self.length; i++) {
        const raw = toRaw(self[i]);
        const id = register(raw);
        if (id === undefined || orig.has(id)) continue;
        orig.set(id, raw as T);
        snap.set(id, deepClone(raw));
      }
    };

    for (const key of [
      [READ, readable],
      [REG, register],
      [REBUILD, rebuildOriginals],
      [ORIG, orig],
      [SNAP, snap],
      [PROXIES, proxies],
      [
        MUT,
        (v?: boolean) => {
          if (v === undefined) return adopting;
          const prev = adopting;
          adopting = !!v;
          return prev;
        },
      ],
    ] as [symbol, unknown][]) {
      Object.defineProperty(self, key[0], { value: key[1], enumerable: false, configurable: true });
    }
    Object.defineProperty(self, DIRTY, {
      get: () => dirty,
      set: (v: WeakSet<T>) => {
        dirty = v;
      },
      enumerable: false,
      configurable: true,
    });

    for (const item of incoming) {
      register(item);
      super.push(item);
    }
    rebuildOriginals();

    return new Proxy(this, {
      get(t, k, r) {
        if (typeof k === "string" && INDEX_RE.test(k)) {
          const arr = t as unknown as T[];
          const i = Number(k);
          if (i < arr.length) return readable(arr[i]);
        }
        return Reflect.get(t, k, r);
      },
      set(t, k, v) {
        if (typeof k === "string" && INDEX_RE.test(k)) {
          const arr = t as unknown as T[];
          const i = Number(k);
          const oldRaw = toRaw(arr[i]);
          const raw = toRaw(v);
          if (Object.is(oldRaw, raw)) return true;
          const broughtId = trackIdOfItem(v); // 登记前判定：写入者自带身份（行对象挪槽）优先保留
          const newId = register(raw);
          if (adopting && newId !== undefined) {
            const oldId = trackIdOfItem(oldRaw);
            if (oldId !== undefined && newId !== oldId && broughtId === undefined) {
              // 无身份的新内容占据老行槽位 → 换发老身份；orig/snap 键随迁
              issueTrackId(raw as object, oldId);
              proxies.set(raw as T, wrapRow(raw as object, () => dirty.add(raw as T)) as T);
              const carried = orig.get(newId);
              if (carried !== undefined && !orig.has(oldId)) {
                orig.delete(newId);
                snap.delete(newId);
              } else {
                orig.set(oldId, oldRaw as T);
              }
              if (!snap.has(oldId)) snap.set(oldId, deepClone(oldRaw));
            }
          }
          Object.defineProperty(arr, i, { value: raw, writable: true, enumerable: true, configurable: true });
          return true;
        }
        return Reflect.set(t, k, v);
      },
    } as ProxyHandler<TrackableList<unknown>>);
  }

  get SaveChangesData(): SaveChangesData<T> {
    const live = new Set<string>();
    const added: T[] = [];
    const changed: T[] = [];
    for (let i = 0; i < this.length; i++) {
      const raw = toRaw((this as unknown as T[])[i]);
      if (!isObj(raw)) continue;
      const id = this[REG](raw)!;
      if (live.has(id)) continue;
      live.add(id);
      if (!this[ORIG].has(id)) added.push(raw);
      else if (this[DIRTY].has(raw as T) || !valueEquals(raw, this[SNAP].get(id))) changed.push(raw);
    }
    const deleted: T[] = [];
    for (const [id, item] of this[ORIG]) if (!live.has(id)) deleted.push(item);
    return { addedItems: added, changedItems: changed, deletedItems: deleted };
  }

  add(item: T): T {
    this[REG](item);
    super.push(item);
    return this[READ](item);
  }

  remove(predicate: (item: T) => boolean): void {
    this.spliceByPredicate(predicate);
  }

  /** 行身份：代理/裸对象都认；未登记对象（如新克隆行）会先收编再发号 */
  trackIdOf(item: unknown): string | undefined {
    if (!isObj(item)) return undefined;
    const raw = toRaw(item);
    this[REG](raw);
    return trackIdOfItem(raw);
  }

  /** 以当前内容为新基线：全部视为未变更（保存成功后重建列表也可，语义等价） */
  reset(): void {
    const rows: T[] = [];
    for (let i = 0; i < this.length; i++) {
      const raw = toRaw((this as unknown as T[])[i]);
      if (isObj(raw)) {
        delete (raw as { __trackId?: string }).__trackId;
        rows.push(deepClone(raw));
      } else {
        rows.push(raw);
      }
    }
    this[MUT](false);
    super.splice(0, this.length, ...rows);
    this[MUT](true);
    this[DIRTY] = new WeakSet<T>();
    this[REBUILD]();
  }

  /* 原生变异期间关闭槽位身份继承（位移/增删不是显式替换），结束后精确还原。 */
  override push(...items: T[]): number {
    const prev = this[MUT](false);
    try {
      return super.push(...items);
    } finally {
      this[MUT](prev);
    }
  }

  override pop(): T | undefined {
    this[MUT](false);
    const v = super.pop();
    this[MUT](true);
    return v;
  }

  override shift(): T | undefined {
    this[MUT](false);
    const v = super.shift();
    this[MUT](true);
    return v;
  }

  override unshift(...items: T[]): number {
    const prev = this[MUT](false);
    try {
      return super.unshift(...items);
    } finally {
      this[MUT](prev);
    }
  }

  override splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    const prev = this[MUT](false);
    try {
      // super.splice 会把省略的 deleteCount 强制成 0 → 手动分派保留原生「删到末尾」语义
      return arguments.length < 2 ? super.splice(start) : super.splice(start, deleteCount as number, ...items);
    } finally {
      this[MUT](prev);
    }
  }

  override sort(compareFn?: (a: T, b: T) => number): this {
    const prev = this[MUT](false);
    try {
      super.sort(compareFn);
      return this;
    } finally {
      this[MUT](prev);
    }
  }

  override reverse(): this {
    const prev = this[MUT](false);
    try {
      super.reverse();
      return this;
    } finally {
      this[MUT](prev);
    }
  }

  /** remove 的谓词只用于定位；被删行照常进 deletedItems */
  private spliceByPredicate(predicate: (item: T) => boolean): void {
    for (let i = this.length - 1; 0 <= i; i--) {
      if (predicate(this[i] as T)) this.splice(i, 1);
    }
  }

  /* 派生读显式落回原生 Array（SpeciesConstructor 兜底会 new A(len) 误入本类构造）；
     结果元素经 get 陷阱已是行代理，身份不受影响。 */
  override map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: unknown): U[] {
    return Array.prototype.map.call(this, callbackfn, thisArg);
  }

  override filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: unknown): T[] {
    return Array.prototype.filter.call(this, predicate, thisArg);
  }

  override slice(start?: number, end?: number): T[] {
    return Array.prototype.slice.call(this, start, end);
  }

  override concat(...items: (T | ConcatArray<T>)[]): T[] {
    return Array.prototype.concat.call(this, ...items);
  }
}

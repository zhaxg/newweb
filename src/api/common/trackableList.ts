export interface SaveChangesData<T> {
  addedItems: T[];
  changedItems: T[];
  deletedItems: T[];
}

type TrackableItem<T> = T & { __trackId: string };

export class TrackableList<T> extends Array<T> {
  // 获取变更集合（Vue 模板可直接使用）
  get SaveChangesData(): SaveChangesData<T> {
    const addedItems = this.filter(
      (item) =>
        !this._originalItems.some(
          (orig) => orig.__trackId === (item as any).__trackId,
        ),
    ).map((x) => this.removeTrackId(x as TrackableItem<T>));

    const changedItems = this.filter((newItem) => {
      const oldItem = this._originalItems.find(
        (item) => item.__trackId === (newItem as any).__trackId,
      );
      return oldItem && !this._isEqual(oldItem, newItem);
    }).map((x) => this.removeTrackId(x as TrackableItem<T>));

    const deletedItems = this._originalItems
      .filter(
        (origItem) =>
          !this.some(
            (item) => (item as any).__trackId === (origItem as any).__trackId,
          ),
      )
      .map((x) => this.removeTrackId(x as TrackableItem<T>));

    return {
      addedItems,
      changedItems,
      deletedItems,
    };
  }

  private _originalItems: TrackableItem<T>[] = [];

  constructor(items: T[] = []) {
    super();
    this._init(items);
  }

  add(item: T): void {
    this.push(this._wrapItem(item));
  }

  // 覆盖原生方法以保持响应式
  override push(...items: T[]): number {
    const wrapped = items.map((item) => this._wrapItem(item));
    return super.push(...wrapped);
  }

  remove(predicate: (item: T) => boolean): void {
    for (let i = this.length - 1; 0 <= i; i--) {
      if (predicate(this[i] as T)) {
        this.splice(i, 1);
      }
    }
  }

  removeTrackId(item: TrackableItem<T>): T {
    const { __trackId, ...rest } = item;
    return rest as T;
  }

  // 重置为初始状态
  reset(): void {
    this._init(this.map((x) => this.removeTrackId(x as TrackableItem<T>)));
  }

  override splice(
    start: number,
    deleteCount?: number,
    ...items: T[]
  ): T[] {
    const wrappedItems = items.map((item) => this._wrapItem(item));
    return super.splice(start, deleteCount ?? this.length, ...wrappedItems);
  }

  // 初始化数据
  private _init(items: T[] = []) {
    this.length = 0;
    if (0 < items.length) {
      const wrappedItems = items.map((item) => this._wrapItem(item));
      super.push(...wrappedItems);
      this._originalItems = JSON.parse(JSON.stringify(wrappedItems));
    }
  }

  // 辅助方法
  private _isEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // 包装数据项
  private _wrapItem(item: T): TrackableItem<T> {
    return {
      ...item,
      __trackId: Math.random().toString(36).slice(2),
    } as TrackableItem<T>;
  }
}

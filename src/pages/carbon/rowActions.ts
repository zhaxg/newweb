import type { ICellRendererParams } from "ag-grid-community";

/** 表格「操作」列的一条行内动作（原页面是行尾文字链接，不是按钮，故不套 PrimeVue Button） */
export interface RowAction {
  label: string;
  onClick: (row: any) => void;
}

/**
 * 生成「操作」列的 cellRenderer：DOM 构造而非 Vue 组件——
 * AG Grid 的 function renderer 返回 HTMLElement 在任何集成方式下都成立，
 * 也避开 cellRenderer 组件传 props/context 的一层管道。
 *
 * `e.stopPropagation()` 必须有：否则点击会冒泡成行选中（`:row-selection` 的 enableClickSelection），
 * 点「资产划拨」会先把行选上再弹窗。
 */
export function actionRenderer(actions: RowAction[]) {
  return (p: ICellRendererParams): HTMLElement => {
    const wrap = document.createElement("div");
    wrap.className = "flex h-full items-center gap-3 px-3";
    for (const a of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = a.label;
      btn.className = "cursor-pointer whitespace-nowrap text-xs text-primary hover:underline";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        a.onClick(p.data);
      });
      wrap.appendChild(btn);
    }
    return wrap;
  };
}

/** 「序号」列：页面序号。mock 只回当前页的行，故 rowIndex+1 即页内序号（对齐原 antd 的 1..20） */
export function seqRenderer(p: ICellRendererParams): string {
  return String((p.node?.rowIndex ?? 0) + 1);
}

/**
 * 取行主键。碳域各表主键名不统一——JNPF 侧有的叫 `id`、有的叫 `pkid`/`pkId`/`recordsId`/
 * `projectId`/`fuelId`…（逐个端点看过返回体确认），删行/查详情要按各自的名字拿，
 * 否则会传出 `undefined` 去打 `/delete/undefined`。按这个顺序回落，认不出时回 `undefined` 交给调用方。
 */
export function rowId(row: any): string | undefined {
  if (!row) return undefined;
  const v = row.id ?? row.pkid ?? row.pkId ?? row.recordsId ?? row.projectId ?? row.fuelId ?? row.materialsId;
  return v === null || v === undefined ? undefined : String(v);
}

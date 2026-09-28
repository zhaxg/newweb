import type { ICellRendererParams } from "ag-grid-community";
import type { ActionResult } from "@/api/equipment/types";

/** 一条行内动作（`ListPage` 由 spec 的 `RowAct` 生成，页面一般不直接构造） */
export interface RowAction {
  label: string;
  onClick: (row: any) => void;
  /** 当前行是否提供这个动作；不给即常显 */
  shown?: (row: any) => boolean;
}

/**
 * 生成「操作」列的 cellRenderer：DOM 构造而非 Vue 组件——
 * AG Grid 的 function renderer 返回 HTMLElement 在任何集成方式下都成立，
 * 也避开 cellRenderer 组件传 props/context 的一层管道。
 *
 * 两个本域特有的处理：
 * - **`shown(row)` 在渲染时判定**：工单/报警/作业票的状态机页面上，按钮只在该出现的状态出现。
 *   做成 disabled 会让一列里全是灰按钮（客户不知道点不动的原因），直接不渲染更清楚。
 * - **一个都不剩时给破折号**：留白会让人以为这一列没数据没渲染出来。
 *
 * `e.stopPropagation()` 必须有：否则点击会冒泡成行选中，点「派工」会先把行选上再弹窗。
 */
export function actionRenderer(actions: RowAction[]) {
  return (p: ICellRendererParams): HTMLElement => {
    const wrap = document.createElement("div");
    wrap.className = "flex h-full items-center gap-3 px-3";
    let count = 0;
    for (const a of actions) {
      if (a.shown && !a.shown(p.data)) continue;
      count += 1;
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
    if (!count) {
      const none = document.createElement("span");
      none.className = "text-xs text-muted-foreground";
      none.textContent = "—";
      wrap.appendChild(none);
    }
    return wrap;
  };
}

/**
 * 取行主键。
 *
 * 本域所有实体在 `api/equipment/types.ts` 里都叫 `id`（mock 实现契约、不是抓包来的线上字段），
 * 所以不像 carbon 那样要试一串名字。仍留这个函数是为了**把「行没有 id」这件事显式化**：
 * 聚合视图（如驾驶舱的报警条）只挑了部分字段，拿它喂删除接口就会打出 `/remove/undefined`，
 * 这里回 `undefined` 交给调用方拦下。
 */
export function rowId(row: any): string | undefined {
  const v = row?.id;
  return v === null || v === undefined || v === "" ? undefined : String(v);
}

/** toast 函数形状（`useToast()` 返回的那个，传进来而不是在这里调 composable——非组件上下文拿不到注入） */
export type ToastFn = (msg: string, duration?: number, severity?: "success" | "info" | "warn" | "error") => void;

/**
 * 统一处理动作端点的返回：**业务拒绝不走 HTTP 错误**。
 *
 * mock（以及真实后端）对「库存不足」「当前状态不允许派工」这类结果回的是
 * `HTTP 200 + 信封成功 + data:{ok:false,msg}`，拦截层不会弹它，必须由页面弹——
 * 否则用户点了按钮只看到列表刷新了一下，不知道刚才那一下到底成没成。
 *
 * 成功时优先用后端的 `msg`：本域的 msg 是「吐丝机导辊 库存 6→4，已自动请购 PR-004」这种
 * 带数字的具体结果，比页面自说自话的「操作成功」有说服力。
 *
 * @returns 是否成功（失败时调用方**不要**刷新，也不要关弹窗）
 */
export function applyResult(res: unknown, fallback: string, toast: ToastFn): boolean {
  const r = res as ActionResult | undefined;
  if (r && typeof r.ok === "boolean") {
    if (!r.ok) {
      toast(r.msg || "操作未完成", 2800, "warn");
      return false;
    }
    toast(r.msg || fallback, 2400, "success");
    return true;
  }
  // 没有信封（如纯视图端点回 null）：按成功处理，用兜底文案
  toast(fallback, 2200, "success");
  return true;
}

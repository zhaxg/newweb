import { useToast as usePrimeToast } from "primevue/usetoast";

export type ToastSeverity = "success" | "info" | "warn" | "error";

/* PrimeVue toast 模板是双段结构：summary=标题（加粗档）、detail=正文（弱化色档）。
   原用法把整句塞进 summary、detail 恒空，所以只剩一行裸标题——和官方演示观感不一致的第一处根因
   （第二处是宽度：见 prime-overrides.css「.p-toast 宽度回收」）。
   现在正文一律进 detail，标题默认取 severity 派生的两字档，特殊场景可传 title 定制 */
const SEVERITY_TITLE: Record<ToastSeverity, string> = { success: "成功", info: "提示", warn: "警告", error: "错误" };

export function useToast() {
  const toaster = usePrimeToast();

  /** severity 语义：success=操作成功，info=中性提示，warn=用户输入/前置条件不满足，error=请求或系统失败 */
  function toast(msg: string, duration = 2000, severity: ToastSeverity = "info", title?: string) {
    toaster.add({ severity, summary: title ?? SEVERITY_TITLE[severity], detail: msg, life: duration });
  }

  return { toast };
}

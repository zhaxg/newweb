import { useToast as usePrimeToast } from "primevue/usetoast";

export type ToastSeverity = "success" | "info" | "warn" | "error";

export function useToast() {
  const toaster = usePrimeToast();

  /** severity 语义：success=操作成功，info=中性提示，warn=用户输入/前置条件不满足，error=请求或系统失败 */
  function toast(msg: string, duration = 2000, severity: ToastSeverity = "info") {
    toaster.add({ severity, summary: msg, life: duration });
  }

  return { toast };
}

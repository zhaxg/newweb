import { ref } from "vue";
import { useToast as usePrimeToast } from "primevue/usetoast";

type ToastAction = { label: string; onClick: () => void };
export type ToastSeverity = "success" | "info" | "warn" | "error";

/* 带 action 的提示共享状态：App.vue 的 <Toast> group="action" 模板读取渲染按钮 */
const actionState = ref<ToastAction | undefined>(undefined);

export function useToast() {
  const toaster = usePrimeToast();

  /** severity 语义：success=操作成功，info=中性提示，warn=用户输入/前置条件不满足，error=请求或系统失败 */
  function toast(msg: string, duration = 2000, severity: ToastSeverity = "info", action?: ToastAction) {
    actionState.value = action;
    toaster.add({ severity, summary: msg, life: duration });
  }

  function dismissToast() {
    actionState.value = undefined;
    toaster.removeAllGroups();
  }

  return { action: actionState, toast, dismissToast };
}

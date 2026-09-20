import { ref } from "vue";
import { useToast as usePrimeToast } from "primevue/usetoast";

export type ToastAction = { label: string; onClick: () => void };

/* 带 action 的提示共享状态：App.vue 的 <Toast> group="action" 模板读取渲染按钮 */
const actionState = ref<ToastAction | undefined>(undefined);

export function useToast() {
  const toaster = usePrimeToast();

  function toast(msg: string, duration = 2000, action?: ToastAction) {
    actionState.value = action;
    toaster.add({ severity: "info", summary: msg, life: duration });
  }

  function dismissToast() {
    actionState.value = undefined;
    toaster.removeAllGroups();
  }

  return { action: actionState, toast, dismissToast };
}

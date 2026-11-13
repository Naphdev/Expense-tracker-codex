import { defineStore } from "pinia";
import { ref } from "vue";

export interface ToastAction {
  label: string;
  to: string;
}

export const useToastStore = defineStore("toast", () => {
  const message = ref("");
  const visible = ref(false);
  const action = ref<ToastAction | null>(null);
  let timer: number | undefined;

  function show(text: string, nextAction?: ToastAction) {
    message.value = text;
    action.value = nextAction ?? null;
    visible.value = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      visible.value = false;
      action.value = null;
    }, nextAction ? 6500 : 2800);
  }

  return { message, visible, action, show };
});

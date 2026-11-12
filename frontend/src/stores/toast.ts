import { defineStore } from "pinia";
import { ref } from "vue";

export const useToastStore = defineStore("toast", () => {
  const message = ref("");
  const visible = ref(false);
  let timer: number | undefined;

  function show(text: string) {
    message.value = text;
    visible.value = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      visible.value = false;
    }, 2800);
  }

  return { message, visible, show };
});

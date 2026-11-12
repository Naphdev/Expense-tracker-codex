import { defineStore } from "pinia";
import { ref } from "vue";

export type ThemePref = "system" | "light" | "dark";

export const useThemeStore = defineStore("theme", () => {
  const preference = ref<ThemePref>((localStorage.getItem("pfa-theme") as ThemePref) || "light");

  function resolved() {
    if (preference.value === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return preference.value;
  }

  function apply() {
    document.documentElement.classList.toggle("dark", resolved() === "dark");
  }

  function setPreference(value: ThemePref) {
    preference.value = value;
    localStorage.setItem("pfa-theme", value);
    apply();
  }

  return { preference, setPreference, apply, resolved };
});

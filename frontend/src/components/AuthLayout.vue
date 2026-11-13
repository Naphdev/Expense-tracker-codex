<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n();
function toggle() {
  locale.value = locale.value === "th" ? "en" : "th";
  localStorage.setItem("pfa-lang", String(locale.value));
}
</script>
<template>
  <div class="min-h-dvh bg-[#E9EEFF] px-5 py-8 text-[#17263E]">
    <div class="mx-auto w-full max-w-md">
      <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/finance-letter-f.svg" alt="" class="h-10 w-10 rounded-2xl" />
          <div>
            <p class="text-[12px] tracking-[-0.24px]">{{ t("app.tagline") }}</p>
            <h1 class="text-[25px] leading-[30px] tracking-[-0.75px]">{{ t("app.name") }}</h1>
          </div>
        </div>
        <button class="h-[46px] rounded-full border border-[#DCE4F0] bg-white px-5 text-[12px] font-semibold tracking-[-0.24px] text-[#263B55] transition hover:bg-[#F5F7FC]" type="button" @click="toggle">
          {{ locale === "th" ? "EN" : "TH" }}
        </button>
      </div>
      <div class="rounded-[28px] border border-[#DEE6F1] bg-white p-6 text-[#17263E] shadow-[0_24px_80px_rgba(20,35,59,0.08)] sm:p-8">
        <slot />
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";

const { t, locale } = useI18n();
const auth = useAuthStore();
const router = useRouter();

const form = reactive({
  name: "",
  email: "",
  password: "",
});

const error = ref("");
const loading = ref(false);
const showPassword = ref(false);

const passwordStrength = computed(() => {
  const password = form.password;
  if (!password) return 0;

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return score;
});

const strengthLabel = computed(() => {
  if (passwordStrength.value <= 2) return "Weak";
  if (passwordStrength.value <= 3) return "Medium";
  return "Strong";
});

const strengthColor = computed(() => {
  if (passwordStrength.value <= 2) return "#EF4444";
  if (passwordStrength.value <= 3) return "#F59E0B";
  return "#147A65";
});

async function submit() {
  if (loading.value) return;

  error.value = "";

  const name = form.name.trim();
  const email = form.email.trim();

  if (name.length < 2) {
    error.value = t("validation.required");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error.value = t("validation.email");
    return;
  }

  if (form.password.length < 8) {
    error.value = t("validation.password");
    return;
  }

  loading.value = true;

  try {
    await auth.register(
      name,
      email,
      form.password,
      locale.value === "th" ? "th" : "en"
    );

    await router.push("/");
  } catch {
    error.value = t("common.error");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen bg-white text-[#17263E] lg:grid lg:grid-cols-2">

    <!-- Brand Section -->
    <section
      class="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#E9EEFF] px-12 py-10 lg:flex xl:px-16"
    >
      <!-- Background Decoration -->
      <div
        class="pointer-events-none absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full border border-[#3159D8]/10"
      />

      <div
        class="pointer-events-none absolute -right-20 top-1/3 h-[350px] w-[350px] rounded-full border border-[#3159D8]/10"
      />

      <!-- Logo -->
      <RouterLink to="/" class="relative z-10 flex w-fit items-center gap-3">
        <span
          class="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-xl font-bold text-white"
        >
          $
        </span>

        <span class="text-xl font-bold tracking-tight text-[#14233B]">
          ExpenseFlow
        </span>
      </RouterLink>

      <!-- Brand Content -->
      <div class="relative z-10 max-w-xl">
        <div
          class="mb-5 inline-flex items-center gap-2 rounded-full border border-[#3159D8]/20 bg-white/50 px-3 py-1.5 text-xs font-semibold text-[#2748B4]"
        >
          <span class="h-2 w-2 rounded-full bg-[#3159D8]" />
          START YOUR FINANCIAL JOURNEY
        </div>

        <h1
          class="max-w-lg text-5xl font-semibold leading-[1.08] tracking-[-2.5px] text-[#14233B] xl:text-6xl"
        >
          Build better
          <span class="text-[#3159D8]">money habits.</span>
        </h1>

        <p class="mt-6 max-w-md text-base leading-7 text-[#50627D]">
          Take the first step towards financial clarity.
          Understand your spending, stay organized,
          and make every decision count.
        </p>

        <!-- Savings Preview -->
        <div
          class="mt-12 max-w-[420px] rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(20,35,59,0.08)] backdrop-blur-xl"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-[#71839B]">
                SAVINGS GOAL
              </p>

              <p class="mt-1 text-sm font-semibold text-[#17263E]">
                Small steps, big progress.
              </p>
            </div>

            <span
              class="grid h-10 w-10 place-items-center rounded-xl bg-success-soft text-success"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </span>
          </div>

          <div class="mt-8">
            <div class="flex items-end justify-between">
              <div>
                <p class="text-xs text-[#71839B]">Saved so far</p>
                <p class="mt-1 text-4xl font-semibold tracking-[-1.5px] text-[#14233B]">
                  ฿980
                </p>
              </div>

              <span class="text-sm font-semibold text-success">
                66.7%
              </span>
            </div>

            <div class="mt-5 h-2 overflow-hidden rounded-full bg-[#DEE6F1]">
              <div
                class="h-full w-2/3 rounded-full bg-success"
              />
            </div>

            <div class="mt-3 flex justify-between text-xs text-[#71839B]">
              <span>Current savings</span>
              <span>Goal ฿1,470</span>
            </div>
          </div>

          <div class="mt-6 flex items-center gap-3 rounded-2xl bg-[#F5F7FC] p-4">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-success-soft text-success">
              ✓
            </span>

            <div>
              <p class="text-sm font-semibold text-[#17263E]">
                Every step matters
              </p>
              <p class="mt-0.5 text-xs text-[#71839B]">
                Start building your financial future today.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="relative z-10 flex items-center justify-between text-xs text-[#50627D]">
        <span>© 2026 ExpenseFlow. All rights reserved.</span>
        <span>Made for better financial habits.</span>
      </div>
    </section>

    <!-- Register Section -->
    <section
      class="flex min-h-screen flex-col bg-white px-6 py-7 sm:px-12 lg:px-14 xl:px-24"
    >
      <!-- Mobile Logo -->
      <RouterLink to="/" class="flex w-fit items-center gap-3 lg:hidden">
        <span
          class="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-bold text-white"
        >
          $
        </span>

        <span class="text-lg font-bold tracking-tight text-[#14233B]">
          ExpenseFlow
        </span>
      </RouterLink>

      <!-- Form Container -->
      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-[420px] py-12">

          <!-- Heading -->
          <div class="mb-8">
            <p class="text-sm font-medium text-[#3159D8]">
              GET STARTED
            </p>

            <h2
              class="mt-3 text-4xl font-semibold tracking-[-1.8px] text-[#17263E] sm:text-[42px]"
            >
              {{ t("auth.register") }}
            </h2>

            <p class="mt-3 text-[15px] leading-6 text-[#71839B]">
              Create your account and take control of your finances.
            </p>
          </div>

          <!-- Form -->
          <form class="space-y-5" @submit.prevent="submit">

            <!-- Name -->
            <div>
              <label
                for="name"
                class="mb-2 block text-sm font-semibold text-[#263B55]"
              >
                {{ t("auth.name") }}
              </label>

              <input
                id="name"
                v-model.trim="form.name"
                type="text"
                autocomplete="name"
                placeholder="Your full name"
                required
                minlength="2"
                :disabled="loading"
                class="w-full rounded-xl border border-[#DEE6F1] bg-[#F5F7FC] px-4 py-3.5 text-sm text-[#17263E] outline-none transition-all placeholder:text-[#8798AF] hover:border-[#B9C8DE] focus:border-[#3159D8] focus:bg-white focus:ring-4 focus:ring-[#3159D8]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <!-- Email -->
            <div>
              <label
                for="email"
                class="mb-2 block text-sm font-semibold text-[#263B55]"
              >
                {{ t("auth.email") }}
              </label>

              <input
                id="email"
                v-model.trim="form.email"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
                required
                :disabled="loading"
                class="w-full rounded-xl border border-[#DEE6F1] bg-[#F5F7FC] px-4 py-3.5 text-sm text-[#17263E] outline-none transition-all placeholder:text-[#8798AF] hover:border-[#B9C8DE] focus:border-[#3159D8] focus:bg-white focus:ring-4 focus:ring-[#3159D8]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <!-- Password -->
            <div>
              <label
                for="password"
                class="mb-2 block text-sm font-semibold text-[#263B55]"
              >
                {{ t("auth.password") }}
              </label>

              <div class="relative">
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="At least 8 characters"
                  required
                  minlength="8"
                  :disabled="loading"
                  class="w-full rounded-xl border border-[#DEE6F1] bg-[#F5F7FC] px-4 py-3.5 pr-12 text-sm text-[#17263E] outline-none transition-all placeholder:text-[#8798AF] hover:border-[#B9C8DE] focus:border-[#3159D8] focus:bg-white focus:ring-4 focus:ring-[#3159D8]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  :disabled="loading"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-[#8798AF] transition hover:text-[#3159D8] disabled:opacity-50"
                >
                  <svg
                    v-if="!showPassword"
                    xmlns="http://www.w3.org/2000/svg"
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>

                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m3 3 18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a14 14 0 0 1-3.1 3.8" />
                    <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4-.8" />
                  </svg>
                </button>
              </div>

              <!-- Password Strength -->
              <div v-if="form.password" class="mt-3">
                <div class="flex gap-1.5">
                  <div
                    v-for="index in 5"
                    :key="index"
                    class="h-1 flex-1 rounded-full transition-colors duration-200"
                    :style="{
                      backgroundColor:
                        index <= passwordStrength
                          ? strengthColor
                          : '#DEE6F1',
                    }"
                  />
                </div>

                <p class="mt-2 text-xs text-[#71839B]">
                  Password strength:
                  <span
                    class="font-semibold"
                    :style="{ color: strengthColor }"
                  >
                    {{ strengthLabel }}
                  </span>
                </p>
              </div>

              <p v-else class="mt-2 text-xs text-[#8798AF]">
                Use at least 8 characters.
              </p>
            </div>

            <!-- Error -->
            <div
              v-if="error"
              role="alert"
              aria-live="polite"
              class="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="mt-0.5 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>

              <span>{{ error }}</span>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3159D8] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(49,89,216,0.18)] transition-colors duration-200 hover:bg-[#2748B4] hover:shadow-[0_8px_20px_rgba(49,89,216,0.18)] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                v-if="loading"
                class="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>

              <span>
                {{ loading ? t("common.loading") : t("auth.register") }}
              </span>

              <svg
                v-if="!loading"
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </form>

          <!-- Login Link -->
          <p class="mt-8 text-center text-sm text-[#8798AF]">
            {{ t("auth.hasAccount") }}

            <RouterLink
              to="/login"
              class="ml-1 font-semibold text-[#3159D8] transition hover:text-[#2748B4] hover:underline"
            >
              {{ t("auth.login") }}
            </RouterLink>
          </p>

          <!-- Security Note -->
          <div class="mt-10 flex items-center justify-center gap-2 text-xs text-[#8798AF]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>

            Your financial data stays protected.
          </div>
        </div>
      </div>

      <!-- Mobile Footer -->
      <footer class="pb-2 text-center text-xs text-[#8798AF] lg:hidden">
        © 2026 ExpenseFlow. All rights reserved.
      </footer>
    </section>
  </main>
</template>

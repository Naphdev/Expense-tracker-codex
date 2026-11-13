<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { api } from "../../lib/api";

const { t } = useI18n();

const email = ref("");
const message = ref("");
const error = ref("");
const token = ref("");

const loading = ref(false);
const submitted = ref(false);
async function submit() {
  if (loading.value) return;

  error.value = "";
  message.value = "";
  token.value = "";

  const normalizedEmail = email.value.trim();

  if (!normalizedEmail) {
    error.value = t("validation.required");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    error.value = t("validation.email");
    return;
  }

  loading.value = true;
  try {
    const { data } = await api.post("/auth/forgot-password", {
      email: normalizedEmail,
    });

    const result = data?.data;

    message.value = result?.message || "Reset token generated.";

    token.value = result?.resetToken || "";

    submitted.value = true;
  } catch (err: any) {
    error.value = err?.response?.data?.message || t("common.error");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#F5F7FC] text-[#17263E]">
    <div class="grid min-h-screen lg:grid-cols-2">
      <!-- Left Brand Panel -->
      <section
        class="relative hidden overflow-hidden bg-[#E9EEFF] px-12 py-12 lg:flex lg:flex-col lg:justify-between xl:px-20"
      >
        <!-- Background Decoration -->
        <div
          class="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#3159D8]/10 blur-3xl"
        ></div>

        <div
          class="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#3159D8]/10 blur-3xl"
        ></div>

        <!-- Logo -->
        <RouterLink to="/" class="relative z-10 flex w-fit items-center gap-3">
          <img src="/finance-letter-f.svg" alt="" class="h-11 w-11 rounded-xl shadow-lg shadow-slate-900/10" />

          <span class="text-xl font-bold tracking-tight text-[#14233B]">
            ExpenseFlow
          </span>
        </RouterLink>

        <!-- Main Content -->
        <div class="relative z-10 max-w-lg">
          <div
            class="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/60 px-4 py-2 text-xs font-semibold text-[#2748B4]"
          >
            <span class="h-2 w-2 rounded-full bg-[#3159D8]"></span>
            ACCOUNT SECURITY
          </div>

          <h1
            class="text-5xl font-bold leading-[1.15] tracking-tight text-[#14233B] xl:text-6xl"
          >
            Your account,<br />
            your peace<br />
            of mind.
          </h1>

          <p class="mt-6 max-w-md text-base leading-7 text-[#50627D]">
            Getting back into your account should be simple and secure. We'll
            help you reset your password in just a few steps.
          </p>

          <!-- Security Card -->
          <div
            class="mt-12 rounded-2xl border border-primary/10 bg-white/70 p-6 shadow-sm backdrop-blur-sm"
          >
            <div class="mb-6 flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-[#14233B]">
                  Password recovery
                </p>
                <p class="mt-1 text-xs text-[#71839B]">
                  A simple and secure process
                </p>
              </div>

              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E5ECFF] text-[#2748B4]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            <div class="space-y-5">
              <div class="flex gap-4">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5ECFF] text-sm font-bold text-[#2748B4]"
                >
                  1
                </div>
                <div>
                  <p class="text-sm font-semibold text-[#14233B]">
                    Verify your email
                  </p>
                  <p class="mt-1 text-xs leading-5 text-[#71839B]">
                    Enter the email associated with your account.
                  </p>
                </div>
              </div>

              <div class="flex gap-4">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5ECFF] text-sm font-bold text-[#2748B4]"
                >
                  2
                </div>
                <div>
                  <p class="text-sm font-semibold text-[#14233B]">
                    Check your inbox
                  </p>
                  <p class="mt-1 text-xs leading-5 text-[#71839B]">
                    Follow the password reset instructions.
                  </p>
                </div>
              </div>

              <div class="flex gap-4">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5ECFF] text-sm font-bold text-[#2748B4]"
                >
                  3
                </div>
                <div>
                  <p class="text-sm font-semibold text-[#14233B]">
                    Create a new password
                  </p>
                  <p class="mt-1 text-xs leading-5 text-[#71839B]">
                    Choose a strong password to secure your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <p class="relative z-10 text-xs text-[#71839B]">
          © 2026 ExpenseFlow. Manage money with confidence.
        </p>
      </section>

      <!-- Right Form Panel -->
      <section
        class="flex min-h-screen flex-col justify-center bg-white px-6 py-10 sm:px-12 lg:px-16 xl:px-24"
      >
        <div class="mx-auto w-full max-w-md">
          <!-- Mobile Logo -->
          <RouterLink to="/" class="mb-12 flex items-center gap-3 lg:hidden">
            <img src="/finance-letter-f.svg" alt="" class="h-10 w-10 rounded-xl" />

            <span class="text-xl font-bold tracking-tight text-[#14233B]">
              ExpenseFlow
            </span>
          </RouterLink>

          <!-- Success State -->
          <div v-if="submitted" class="text-center">
            <div
              class="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5ECFF] text-[#3159D8]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>

            <p
              class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#3159D8]"
            >
              RESET TOKEN READY
            </p>

            <h1 class="text-3xl font-bold tracking-tight text-[#17263E]">
              Your reset token is ready
            </h1>

            <p class="mt-4 text-sm leading-7 text-[#71839B]">
              {{ message }}
            </p>

            <p class="mt-3 break-all text-sm font-semibold text-[#2748B4]">
              {{ email }}
            </p>

            <!-- Development Token -->
            <div
              v-if="token"
              class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left"
            >
              <p
                class="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700"
              >
                Development Reset Token
              </p>

              <p class="break-all text-xs leading-5 text-amber-900">
                {{ token }}
              </p>

              <RouterLink
                :to="{ path: '/reset', query: { token } }"
                class="mt-4 inline-flex text-sm font-semibold text-[#2748B4] hover:text-[#2748B4]"
              >
                Continue to reset password →
              </RouterLink>
            </div>

            <p class="mt-7 text-xs leading-6 text-[#71839B]">
              Didn't receive an email? Check your spam folder or try again.
            </p>

            <button
              type="button"
              class="mt-8 w-full rounded-xl border border-[#DEE6F1] bg-white px-5 py-3.5 text-sm font-semibold text-[#263B55] transition hover:bg-[#F5F7FC]"
              @click="submitted = false"
            >
              Try another email
            </button>
          </div>

          <!-- Forgot Password Form -->
          <div v-else>
            <div class="mb-10">
              <p
                class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#3159D8]"
              >
                PASSWORD RECOVERY
              </p>

              <h1
                class="text-3xl font-bold tracking-tight text-[#17263E] sm:text-4xl"
              >
                {{ t("auth.forgot") }}
              </h1>

              <p class="mt-4 text-sm leading-7 text-[#71839B]">
                Don't worry, it happens. Enter your registered email address and
                we'll send you instructions to reset your password.
              </p>
            </div>

            <!-- Error Message -->
            <div
              v-if="error"
              role="alert"
              class="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="19"
                height="19"
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

              <p>{{ error }}</p>
            </div>

            <form class="space-y-6" @submit.prevent="submit">
              <!-- Email -->
              <div>
                <label
                  for="email"
                  class="mb-2 block text-sm font-semibold text-[#263B55]"
                >
                  {{ t("auth.email") }}
                </label>

                <div class="relative">
                  <div
                    class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#8798AF]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </div>

                  <input
                    id="email"
                    v-model="email"
                    type="email"
                    autocomplete="email"
                    required
                    :placeholder="t('auth.email')"
                    class="w-full rounded-xl border border-[#DEE6F1] bg-[#F5F7FC] py-3.5 pl-12 pr-4 text-sm text-[#17263E] outline-none transition placeholder:text-[#8798AF] focus:border-[#3159D8] focus:bg-white focus:ring-4 focus:ring-[#3159D8]/10"
                  />
                </div>
              </div>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="loading"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3159D8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#2748B4] focus:outline-none focus:ring-4 focus:ring-[#3159D8]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  v-if="loading"
                  class="h-5 w-5 animate-spin"
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
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>

                <span>
                  {{ loading ? t("common.loading") : t("auth.sendReset") }}
                </span>
              </button>
            </form>

            <!-- Back to Login -->
            <div class="mt-9 text-center">
              <RouterLink
                to="/login"
                class="inline-flex items-center gap-2 text-sm font-semibold text-[#2748B4] transition hover:text-[#2748B4]"
              >
                <svg
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
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>

                Back to login
              </RouterLink>
            </div>
          </div>

          <!-- Bottom Note -->
          <div
            class="mt-14 border-t border-[#E9EEF5] pt-6 text-center text-xs text-[#8798AF]"
          >
            Secure account recovery · ExpenseFlow
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

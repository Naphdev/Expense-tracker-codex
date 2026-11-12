
<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AuthLayout from "@/components/AuthLayout.vue";
import { api } from "@/lib/api";

const router = useRouter();
const route = useRoute();

const token = ref(
  typeof route.query.token === "string" ? route.query.token : ""
);

const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);
const error = ref("");
const success = ref("");

const requirements = computed(() => [
  { label: "At least 8 characters", valid: password.value.length >= 8 },
  { label: "Contains an uppercase letter", valid: /[A-Z]/.test(password.value) },
  { label: "Contains a lowercase letter", valid: /[a-z]/.test(password.value) },
  { label: "Contains a number", valid: /[0-9]/.test(password.value) },
]);

const strength = computed(() => {
  const score = requirements.value.filter((item) => item.valid).length;

  if (!password.value) return 0;
  return score;
});

const strengthLabel = computed(() => {
  if (strength.value <= 1) return "Weak";
  if (strength.value === 2) return "Fair";
  if (strength.value === 3) return "Good";
  return "Strong";
});

const passwordsMatch = computed(
  () =>
    confirmPassword.value.length > 0 &&
    password.value === confirmPassword.value
);

async function submit() {
  error.value = "";
  success.value = "";

  if (!token.value) {
    error.value = "Reset token is missing. Please request a new reset token.";
    return;
  }

  if (requirements.value.some((item) => !item.valid)) {
    error.value = "Please meet all password requirements.";
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match.";
    return;
  }

  loading.value = true;

  try {
    await api.post("/auth/reset-password", {
      token: token.value,
      password: password.value,
    });

    success.value = "Your password has been updated successfully.";

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  } catch (err: any) {
    error.value =
      err?.response?.data?.message ||
      "Unable to reset password. Your token may have expired.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mx-auto w-full max-w-md ">

      <!-- Header -->
      <div class="mb-8">
        <div
          class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DCE4F0] bg-[#E5ECFF]"
        >
          <svg
            class="h-7 w-7 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <rect x="4" y="10" width="16" height="11" rx="2.5" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <path d="M12 14v3" stroke-linecap="round" />
          </svg>
        </div>

        <p
          class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"
        >
          ACCOUNT SECURITY
        </p>

        <h2 class="text-3xl font-bold tracking-tight text-[#17263E]">
          Create a new password
        </h2>

        <p class="mt-3 text-sm leading-6 text-[#71839B]">
          Choose a strong password to protect your ExpenseFlow account.
          Make sure it's something you haven't used before.
        </p>
      </div>

      <!-- Form -->
      <form class="grid gap-5" @submit.prevent="submit">

        <!-- Password -->
        <div>
          <label
            class="mb-2 block text-sm font-semibold text-[#263B55]"
          >
            New password
          </label>

          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full rounded-xl border border-[#DEE6F1] bg-[#F5F7FC] px-4 py-3.5 pr-16 text-sm text-[#17263E] outline-none transition placeholder:text-[#8798AF] focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              placeholder="Enter your new password"
              autocomplete="new-password"
              required
            />

            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary transition hover:text-primary-dark"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? "Hide" : "Show" }}
            </button>
          </div>
        </div>

        <!-- Password strength -->
        <div v-if="password">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-medium text-[#71839B]">
              Password strength
            </span>

            <span
              class="text-xs font-semibold"
              :class="strength >= 3 ? 'text-green-700' : 'text-[#71839B]'"
            >
              {{ strengthLabel }}
            </span>
          </div>

          <div class="grid grid-cols-4 gap-1.5">
            <div
              v-for="index in 4"
              :key="index"
              class="h-1.5 rounded-full transition-all duration-300"
              :class="
                strength >= index
                  ? strength <= 1
                    ? 'bg-red-400'
                    : strength <= 2
                      ? 'bg-amber-400'
                      : 'bg-green-600'
                  : 'bg-[#E9EEF5]'
              "
            />
          </div>
        </div>

        <!-- Requirements -->
        <div class="rounded-xl border border-[#DEE6F1] bg-[#F5F7FC] p-4">
          <p class="mb-3 text-xs font-semibold text-[#263B55]">
            Password requirements
          </p>

          <div class="grid gap-2.5">
            <div
              v-for="item in requirements"
              :key="item.label"
              class="flex items-center gap-2.5 text-xs"
              :class="item.valid ? 'text-green-700' : 'text-[#8798AF]'"
            >
              <span
                class="flex h-4 w-4 items-center justify-center rounded-full"
                :class="
                  item.valid
                    ? 'bg-green-100 text-green-700'
                    : 'bg-[#DEE6F1] text-[#8798AF]'
                "
              >
                <svg
                  v-if="item.valid"
                  class="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="m4 10 4 4 8-8" />
                </svg>
                <span v-else class="h-1 w-1 rounded-full bg-current" />
              </span>

              {{ item.label }}
            </div>
          </div>
        </div>

        <!-- Confirm password -->
        <div>
          <label
            class="mb-2 block text-sm font-semibold text-[#263B55]"
          >
            Confirm new password
          </label>

          <div class="relative">
            <input
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="w-full rounded-xl border bg-[#F5F7FC] px-4 py-3.5 pr-16 text-sm text-[#17263E] outline-none transition placeholder:text-[#8798AF] focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              :class="
                confirmPassword && !passwordsMatch
                  ? 'border-red-300'
                  : 'border-[#DEE6F1]'
              "
              placeholder="Re-enter your new password"
              autocomplete="new-password"
              required
            />

            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary transition hover:text-primary-dark"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              {{ showConfirmPassword ? "Hide" : "Show" }}
            </button>
          </div>

          <p
            v-if="confirmPassword && !passwordsMatch"
            class="mt-2 text-xs text-red-500"
          >
            Passwords do not match.
          </p>

          <p
            v-else-if="passwordsMatch"
            class="mt-2 text-xs font-medium text-green-700"
          >
            Passwords match.
          </p>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {{ error }}
        </div>

        <!-- Success -->
        <div
          v-if="success"
          class="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {{ success }} Redirecting to login...
        </div>

        <!-- Submit -->
        <button
          type="submit"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors duration-200 hover:bg-primary-dark hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="
            loading ||
            !token ||
            !passwordsMatch ||
            strength < 4 ||
            !!success
          "
        >
          <svg
            v-if="loading"
            class="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
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
              d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4z"
            />
          </svg>

          {{ loading ? "Updating password..." : "Reset password" }}

          <svg
            v-if="!loading"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>

      <!-- Footer -->
      <div class="mt-7 border-t border-[#E9EEF5] pt-5">
        <div class="flex items-center justify-center gap-2 text-xs text-[#8798AF]">
          <svg
            class="h-4 w-4 text-green-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Your password is securely encrypted.
        </div>
      </div>

    </div>
  </AuthLayout>
</template>

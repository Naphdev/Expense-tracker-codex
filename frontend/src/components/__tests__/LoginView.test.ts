import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { createPinia } from "pinia";
import { describe, expect, it } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import LoginView from "../../views/auth/LoginView.vue";
import { messages } from "../../i18n/messages";

describe("LoginView", () => {
  it("validates short passwords", async () => {
    const i18n = createI18n({ legacy: false, locale: "en", messages });
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { template: "x" } }, { path: "/login", component: LoginView }] });
    const wrapper = mount(LoginView, {
      global: { plugins: [i18n, createPinia(), router] },
    });
    await wrapper.find("input[type=email]").setValue("user@example.com");
    await wrapper.find("input[type=password]").setValue("short");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Use at least 8 characters");
  });
});

import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: () => import("@/views/auth/LoginView.vue"), meta: { public: true } },
    { path: "/register", component: () => import("@/views/auth/RegisterView.vue"), meta: { public: true } },
    { path: "/forgot", component: () => import("@/views/auth/ForgotView.vue"), meta: { public: true } },
    { path: "/reset", component: () => import("@/views/auth/ResetView.vue"), meta: { public: true } },
    {
      path: "/",
      component: () => import("@/components/AppShell.vue"),
      children: [
        { path: "", component: () => import("@/views/DashboardView.vue") },
        { path: "transactions", component: () => import("@/views/TransactionsView.vue") },
        { path: "transactions/import", component: () => import("@/views/ImportTransactionsView.vue") },
        { path: "transactions/:id", component: () => import("@/views/TransactionFormView.vue") },
        { path: "notifications", component: () => import("@/views/NotificationsView.vue") },
        { path: "analytics", component: () => import("@/views/AnalyticsView.vue") },
        { path: "profile", component: () => import("@/views/ProfileView.vue") },
        { path: "budgets", component: () => import("@/views/BudgetsView.vue") },
        { path: "goals", component: () => import("@/views/GoalsView.vue") },
        { path: "accounts", component: () => import("@/views/AccountsView.vue") },
        { path: "recurring", component: () => import("@/views/RecurringView.vue") },
        { path: "calendar", component: () => import("@/views/CalendarView.vue") },
        { path: "advisor", component: () => import("@/views/AdvisorView.vue") },
        { path: "reports", component: () => import("@/views/ReportsView.vue") },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) await auth.bootstrap();
  if (!to.meta.public && !auth.isAuthenticated) return { path: "/login" };
  if (to.meta.public && auth.isAuthenticated) return { path: "/" };
  return true;
});

export default router;

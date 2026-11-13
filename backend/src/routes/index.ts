import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import * as auth from "../controllers/authController.js";
import * as tx from "../controllers/transactionController.js";
import * as dash from "../controllers/dashboardController.js";
import * as resCtrl from "../controllers/resourceControllers.js";
import * as notification from "../controllers/notificationController.js";
import {
  aiAdviceSchema,
  accountSchema,
  budgetSchema,
  contributionSchema,
  goalSchema,
  idParams,
  rangeQuery,
  reportExportQuery,
  recurringSchema,
  syncSchema,
  transactionSchema,
  transactionImportBatchSchema,
} from "../validators/finance.js";
import { forgotSchema, loginSchema, registerSchema, resetSchema, updateProfileSchema } from "../validators/auth.js";

const asyncHandler =
  (fn: (req: never, res: never) => Promise<unknown>) =>
  (req: unknown, res: unknown, next: (err?: unknown) => void) =>
    Promise.resolve(fn(req as never, res as never)).catch(next);

export const router = Router();

router.post("/auth/register", validate(registerSchema), asyncHandler(auth.register));
router.post("/auth/login", validate(loginSchema), asyncHandler(auth.login));
router.post("/auth/forgot-password", validate(forgotSchema), asyncHandler(auth.forgot));
router.post("/auth/reset-password", validate(resetSchema), asyncHandler(auth.reset));
router.post("/auth/logout", requireAuth, verifyCsrf, asyncHandler(auth.logout));
router.get("/auth/me", requireAuth, asyncHandler(auth.me));
router.patch("/auth/me", requireAuth, verifyCsrf, validate(updateProfileSchema), asyncHandler(auth.updateMe));

router.use(requireAuth);
router.use(verifyCsrf);

router.get("/dashboard/summary", validate(rangeQuery), asyncHandler(dash.summary));
router.get("/dashboard/trends", validate(rangeQuery), asyncHandler(dash.trends));
router.get("/dashboard/categories", validate(rangeQuery), asyncHandler(dash.categories));
router.get("/calendar", asyncHandler(resCtrl.calendar));
router.get("/notifications", asyncHandler(notification.list));
router.post("/notifications/read-all", asyncHandler(notification.markAllRead));
router.patch("/notifications/:id/read", validate(idParams), asyncHandler(notification.markRead));

router.get("/transactions", asyncHandler(tx.list));
router.post("/transactions", validate(transactionSchema), asyncHandler(tx.create));
router.post("/transactions/import/preview", validate(transactionImportBatchSchema), asyncHandler(tx.importPreview));
router.post("/transactions/import", validate(transactionImportBatchSchema), asyncHandler(tx.importBatch));
router.post(
  "/transactions/bulk",
  asyncHandler(tx.createBulk)
);
router.get("/transactions/:id", validate(idParams), asyncHandler(tx.getOne));
router.put("/transactions/:id", validate(idParams), validate(transactionSchema), asyncHandler(tx.update));
router.delete("/transactions/:id", validate(idParams), asyncHandler(tx.remove));

router.get("/accounts", asyncHandler(resCtrl.listAccounts));
router.post("/accounts", validate(accountSchema), asyncHandler(resCtrl.createAccount));
router.put("/accounts/:id", validate(idParams), asyncHandler(resCtrl.updateAccount));
router.delete("/accounts/:id", validate(idParams), asyncHandler(resCtrl.deleteAccount));

router.get("/budgets", asyncHandler(resCtrl.listBudgets));
router.post("/budgets", validate(budgetSchema), asyncHandler(resCtrl.createBudget));
router.put("/budgets/:id", validate(idParams), asyncHandler(resCtrl.updateBudget));
router.delete("/budgets/:id", validate(idParams), asyncHandler(resCtrl.deleteBudget));

router.get("/saving-goals", asyncHandler(resCtrl.listGoals));
router.post("/saving-goals", validate(goalSchema), asyncHandler(resCtrl.createGoal));
router.put("/saving-goals/:id", validate(idParams), asyncHandler(resCtrl.updateGoal));
router.delete("/saving-goals/:id", validate(idParams), asyncHandler(resCtrl.deleteGoal));
router.post("/saving-goals/:id/contributions", validate(contributionSchema), asyncHandler(resCtrl.contributeGoal));

router.get("/recurring", asyncHandler(resCtrl.listRecurring));
router.post("/recurring", validate(recurringSchema), asyncHandler(resCtrl.createRecurringCtrl));
router.put("/recurring/:id", validate(idParams), asyncHandler(resCtrl.updateRecurringCtrl));
router.delete("/recurring/:id", validate(idParams), asyncHandler(resCtrl.deleteRecurring));

router.post("/ai/advice", validate(aiAdviceSchema), asyncHandler(resCtrl.aiAdvice));
router.get("/ai/conversations", asyncHandler(resCtrl.listConversations));
router.get("/ai/conversations/:id", validate(idParams), asyncHandler(resCtrl.getConversation));
router.delete("/ai/conversations/:id", validate(idParams), asyncHandler(resCtrl.deleteConversation));

router.get("/reports/export/pdf", validate(reportExportQuery), asyncHandler(resCtrl.exportPdf));
router.get("/reports/export/excel", validate(reportExportQuery), asyncHandler(resCtrl.exportExcel));
router.post("/sync", validate(syncSchema), asyncHandler(resCtrl.syncOffline));

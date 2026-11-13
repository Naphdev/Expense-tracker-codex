# Product glossary

This glossary covers transaction import and finance reminders in [ADR 0001](adr/0001-csv-import-and-finance-reminders.md), plus personal finance reports in [ADR 0002](adr/0002-personal-finance-reports.md). Terms describe the product domain, not final API names.

| Term | Meaning |
| --- | --- |
| Budget period | The month and year attached to a category budget. Spending is compared with the budget for the same category and period. |
| Budget usage | Completed expense amount for a budget category divided by that category's budget amount. The existing warning state begins at 80%. |
| Recurring schedule | A user's rule for repeating an income or expense, including amount, frequency, and next execution date. |
| Due occurrence | One scheduled date when a recurring schedule is due. The app currently posts a transaction for it automatically. |
| Generated transaction | The transaction created by processing a due occurrence. It is linked to its recurring schedule. |
| Imported historical transaction | A completed transaction created from a file and linked to an account, but excluded from changing that account's current balance. |
| Import batch | One attempt to read and import a user's supported file. It may contain valid, invalid, or duplicate-candidate rows. |
| Import row | One line from a file after parsing and column mapping. It may be previewed, rejected, or imported. |
| Duplicate candidate | An import row that may represent a transaction already stored in the user's account. The preview lets the user choose to skip or import each candidate. The current match uses date, type, amount, normalized title, and linked account. |
| Row validation issue | A problem such as an unreadable date, missing amount, or unsupported category that prevents one import row from becoming a transaction. |
| Account balance effect | The change to an account's current balance caused by a completed transaction. Imported historical transactions are excluded from changing today's balance. |
| Budget alert | A web inbox notification when a budget reaches 80% or 100% usage. |
| Recurring reminder | A web inbox notification sent one day before a recurring schedule is due. The schedule still creates its transaction automatically on the due date. |
| Finance reminder | A persistent, user-scoped web inbox notification with an unread count. Users mark individual or all notifications as read; opening the inbox does not change read state. |
| Report period | The inclusive dates selected for an exported financial overview. Presets use the user's timezone; a custom period includes both chosen dates. |
| Comparison period | The earlier date range shown alongside the selected period. It is the same length for in-progress and custom ranges; a completed previous month compares with the preceding calendar month. |
| Net cash flow | Completed income minus completed expenses in the selected period. Transfers and pending transactions do not contribute. |
| Net cash flow rate | Net cash flow divided by completed income, expressed as a percentage. It is zero when there is no income in the period. |
| Pending transaction export | Transactions awaiting completion, listed separately and excluded from completed cash-flow totals. |
| Transfer export | Completed transfers with source and destination accounts, listed separately and excluded from income and expense totals. |
| Budget comparison scope | Monthly budget usage compared against completed expenses across all accounts for the selected dates, even when an account filter is selected for transactions. |
| Goal snapshot | Current saved amount, target, and progress for each non-cancelled saving goal at the time a report is generated. It is not historical progress. |

# ADR 0002: Personal finance report exports

- **Status:** Accepted and implemented
- **Date:** 2026-11-12

## Goal

Let a user export a clear personal financial overview for a selected date range, then choose a compact PDF for sharing or a detailed report for review and analysis.

## Product decisions

- Offer a one-page PDF summary and a multi-page detailed PDF. The summary emphasizes income, expenses, net cash flow, comparison, recent trends, leading expense categories, budget usage, and up to three savings goals.
- In PDF, omit any section with no matching data and create transaction pages only for non-empty completed, pending, or transfer groups. Keep the page footer inside the page margins so it cannot create an extra page.
- Include an Excel workbook with `Overview`, `Trends`, `Categories`, `Budgets`, `Goals`, `Transactions`, `Pending`, and `Transfers` sheets. Keep pending activity and transfers in separate sheets so neither is mistaken for completed income or expenses.
- Keep all eight Excel sheets even when a section has no rows. Show a localized message that no data matched the selected dates and filters instead of leaving an empty sheet.
- Include completed transaction rows in full and make table-like sheets filterable, with frozen headers and numeric/date cell formats suitable for sorting and analysis.
- Enable comparison with the prior period by default. Display both exact date ranges before export. Compare equal-length periods for week-to-date, month-to-date, year-to-date, and custom ranges; compare a completed last-month range with the previous calendar month.
- Define net cash flow as completed income minus completed expenses. Define its rate as net cash flow divided by income; transfers and pending transactions are excluded.
- Calculate monthly budget usage across all of the user's accounts for the selected dates. If only part of a month is selected, count expenses inside those dates. Show this scope in the export UI and report notes.
- Include saving goals as a current snapshot at export time. The current model does not keep historical goal balances.
- Support account, transaction type, and category filters. Export queries and associated records remain scoped to the authenticated user.
- Localize report labels and content in Thai or English. Thai PDF generation uses an installed Thai font, with an environment override available for deployments.

## Domain and security invariants

- Only completed income and expense transactions contribute to cash-flow totals, category totals, and trends.
- Completed transfers, pending transactions, budget snapshots, and goal snapshots are separate report sections and never alter cash-flow totals.
- An account filter affects transactions and comparisons. Budget comparisons intentionally remain across all accounts and are labeled as such.
- The backend validates date ranges, filter values, and account ownership before generating a file.

## Implementation

- `GET /reports/export/pdf` accepts `pdfLayout=summary|detailed` and report filters.
- `GET /reports/export/excel` returns a formatted `.xlsx` workbook with separate detail sheets and numeric/date cell formats.
- The Reports page shows the selected and comparison dates, comparison toggle, filters, and PDF layout description before download.

## Current limitations

- Goal history cannot be reconstructed; goal amounts in reports reflect their current values at export time.
- Budget records are monthly. A partial-month report compares the monthly limit with expenses only inside the selected portion of that month.

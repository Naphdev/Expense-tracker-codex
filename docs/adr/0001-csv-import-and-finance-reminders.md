# ADR 0001: Transaction import and finance reminders

- **Status:** Accepted and implemented
- **Date:** 2026-11-12

## Goal

Help users move transaction history into the app and see budget or recurring-item reminders in a persistent web inbox.

## Product decisions

- Keep notifications in an in-app inbox with an unread count. Opening the inbox does not mark items read; users can mark one item or all items as read. Email and browser push are outside the current scope.
- Accept CSV, XLSX/XLSM workbooks, text-based PDF tables, and DOCX tables. Legacy XLS/DOC files and scanned PDFs are not supported in this version. The original file is parsed in the browser and is not uploaded; mapped rows are sent to the API preview endpoint for validation and duplicate checks, while only selected rows are persisted.
- Limit a file to 10 MB and 1,000 parsed rows. Send API work in batches of at most 100 rows.
- Let users choose a worksheet/table, whether the first row is a header, date format, transaction columns, and one account for the file. Infer type from a type column, debit/credit columns, or signed amount; if all values are positive, ask whether positive means income or expense.
- Preview likely duplicates and let the user skip or import each row. The current match key is date, type, amount, normalized title, and linked account. Recheck duplicates during commit to handle concurrent changes.
- Import valid rows and report invalid rows with row numbers and reasons. Users can correct the source file and retry.
- Imported transactions remain completed and count in reports and budgets. A persisted `affectsBalance: false` flag prevents them from changing an account's current balance, including on later edit or delete.
- Create budget notifications at 80% and 100% of a category budget, at most once per budget, threshold, and month. Check after transaction/budget changes and during recurring processing.
- Keep automatic posting for recurring schedules. Create a reminder for a due date within the next 24 hours; process recurring schedules at startup and hourly.

## Domain and security invariants

- Transactions, accounts, budgets, recurring schedules, and notifications are scoped to the authenticated user. Import account references are checked against the current user.
- Import uses the existing transaction validation and integer minor-unit money conversion. A file cannot supply its own `userId`.
- Notification occurrence keys are unique per user, preventing repeated reminders for the same threshold period or recurring due date.
- The backend rechecks duplicates on commit and uses the existing `clientRequestId` uniqueness rule for retry idempotency.

## Implementation

- `FinanceNotification` stores the event type, occurrence key, user, notification data, and `readAt` timestamp.
- The notification API lists up to 100 recent items and returns the total unread count; it supports marking one or all as read.
- The client parser uses ExcelJS for XLSX/XLSM, PDF.js text extraction for PDF, and DOCX XML table parsing. PDF column boundaries are inferred from text positions, so users should review the preview before import.
- Cap decompressed DOCX contents at 50 MB. Keep the larger PDF/Excel parser assets out of the install precache and cache up to five parser assets for 30 days after use.
- Import is available at `/transactions/import` and from the Activity page. Rows with a suspected match are opt-in until the user explicitly selects them.

## Current limitations

- No OCR, old binary `.xls` or `.doc`, or arbitrary unstructured document extraction.
- The duplicate rule can miss a real duplicate with different wording or flag two legitimate same-day transactions with identical details; users can make the final choice in preview.
- Recurring reminders are checked by the API process's hourly job, so timing can vary by up to about an hour and reminders are not produced while the backend is offline.

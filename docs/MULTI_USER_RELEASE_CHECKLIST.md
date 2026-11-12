# Multi-user release checklist

This checklist is for the current model where users sign up themselves and each account owns separate financial data. Email verification and a new password-reset flow are out of scope for the first release.

## Security and account isolation

- [ ] Rotate the MongoDB database-user password that was exposed in a local tool result. Update the backend secret store without pasting the URI into logs, tickets, or chat.
- [x] Do not log CSRF tokens. The login controller no longer writes them to the backend console.
- [x] Rate-limit public registration to 10 attempts per IP per 15 minutes.
- [ ] If the backend runs as multiple instances, use a shared rate-limit store or enforce signup limits at the gateway; the default Express store is per process.
- [ ] Verify ownership scoping for every new query and mutation. Derive the owner from the authenticated session; never trust a client-supplied `userId`.
- [x] Add cross-user API coverage for accounts, transactions, dashboard totals, calendar, budgets, goals, recurring transactions, and AI conversations.
- [ ] Run the API suite in an environment where `mongodb-memory-server` can start its `mongod` binary. The current Windows run stops at a MongoDB `fassert()` during test database startup.
- [ ] Decide how users request account/data deletion and how long deleted data is retained.

## Database network and availability

- [ ] Add the backend host's outbound egress IP to the Atlas project's IP access list. Do not use the frontend hosting IP or a developer's home IP for production.
- [ ] Prefer a static egress IP, VPC/VNet peering, or a private endpoint. Keep the allowlist limited to trusted addresses; do not use `0.0.0.0/0` for production.
- [ ] Confirm outbound TCP access to the Atlas database ports from the backend host.
- [x] Keep `/health` as a liveness check and use `/ready` to report whether Mongoose is connected.
- [ ] Alert on repeated database connection failures and rehearse recovery after Atlas/network interruptions.

## Backups and recovery

- [ ] Enable Atlas backups/snapshots for the production cluster, subject to the selected Atlas tier.
- [ ] Set a retention period, recovery-point objective, and recovery-time objective that match the service's needs.
- [ ] Test restoring a backup into a non-production cluster before onboarding users.
- [ ] Store database credentials and application secrets in the hosting provider's secret manager, not in source control or build output.

## Launch checks

- [ ] Configure `NODE_ENV=production`, `TRUST_PROXY=true` when behind a trusted reverse proxy, `FRONTEND_ORIGIN`, and the frontend API URL.
- [ ] Confirm auth cookies use HTTPS in production and CORS lists only the deployed frontend origins.
- [ ] Confirm the password-reset flow is supported by the production runbook. The current backend does not deliver reset email in production, so users may need support if they forget a password.
- [ ] Run backend and frontend builds and the backend API suite before release.


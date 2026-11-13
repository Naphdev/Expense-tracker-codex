# ADR 0003: Mobile PWA installation and offline access

- **Status:** Accepted; implementation complete, deployment and device verification pending
- **Date:** 2026-11-13

## Goal

Let the user and family install the personal finance app from a mobile browser onto the home screen on Android and iOS, then safely review the latest synchronized financial snapshot when offline.

This is a browser-installed PWA. App Store and Play Store publication are out of scope.

## Confirmed requirements

- Install from Chrome or another supported Android browser, and from Safari's Share menu on iOS.
- View previously synchronized financial data while offline.
- Require a separate offline passcode before showing locally stored financial data.
- Prefer a no-cost setup for personal and family use; do not require a paid custom domain.

## Existing system

- Vue 3 and Vite already use `vite-plugin-pwa`, a generated web app manifest, and a Workbox service worker.
- The service worker precaches static assets and uses `NetworkOnly` for `/api`.
- IndexedDB already stores some transactions and queued transaction changes. The app currently authenticates through a network request on startup, so reopening it offline does not yet reach those cached records.
- Production guidance currently separates the Vercel frontend from a backend host. The browser would therefore call an API on another site unless requests are proxied.

## Proposed decisions

### Install experience

- Keep the existing PWA plugin and make the manifest identity, start URL, scope, theme, and app name explicit and stable.
- Provide production PNG icons for 192x192 and 512x512, including a maskable Android icon, and a 180x180 Apple touch icon. Keep SVGs where useful for the browser UI.
- On Android, show an app-owned Install action only when the browser exposes a usable install prompt; call it after a direct user tap and record the installed state.
- On iOS, show concise Safari instructions: Share → Add to Home Screen. Do not imitate an install prompt that Safari does not expose to websites.
- Put the install entry in Profile/settings and explain that this adds the app to the home screen; it does not install from an app store.

### Offline data and privacy

- Define an `OfflineSnapshot` scoped to one account, containing dashboard totals, account balances, current budgets and saving goals, and the 50 most recent transactions. Show when the snapshot was last updated. Full transaction history and offline report exports are out of scope for the first release.
- Keep private API responses out of service worker/CDN caches. Store the offline snapshot in IndexedDB encrypted with a key protected by the user's offline passcode. Do not store the account password or server auth token for offline unlock.
- After an offline launch, show a locked offline screen. A successful local unlock permits read-only access to the last snapshot; it does not authenticate online API requests.
- Clear the snapshot and offline unlock material on explicit logout or account switch. Lock again when the installed app is relaunched and after a period in the background.
- Preserve the existing transaction queue. On reconnection, sync queued changes when the app becomes visible/online and show pending, syncing, and failed states. Do not claim that offline AI, exports, imports, or server-side recurring jobs work offline.
- Derive a 256-bit AES-GCM key from the offline passphrase with PBKDF2-HMAC-SHA256 and a per-device random salt. Keep the key only in memory. Require at least 10 passphrase characters; explain that local encryption cannot protect against malicious code running in the unlocked app origin.
- Lock the offline session after five minutes in the background. Never write new transaction caches or queued operations in plaintext; migrate any existing local queue into the encrypted vault before removing the legacy stores.

### No-cost deployment and authentication

- Keep a stable Vercel `*.vercel.app` frontend URL and the existing backend/database providers; no custom domain is required.
- Route browser requests to `/api/*` through a Vercel Node function using a server-only `API_ORIGIN` environment variable, with private no-store responses. Keep the browser-visible API URL same-origin (`/api`) so auth cookies are first-party in Safari.
- Render's free backend can sleep after 15 minutes idle and may take about a minute to wake; Render says free instances are for hobby/testing and not production. Proceed with this only if the family accepts occasional delays or downtime. If that is unacceptable while spending must stay at zero, revisit the hosting architecture before release.
- If continuing with MongoDB Atlas Free, managed backups are unavailable. Keep database backups as an explicit manual operational task.

## Domain model

| Concept | Meaning |
| --- | --- |
| Install availability | Whether the current browser has a direct install prompt, requires manual instructions, is already installed, or cannot offer installation. |
| Offline passcode | A device-local unlock credential for a user's encrypted offline snapshot; it is not the account password and cannot authorize server requests. |
| Offline snapshot | The latest successfully synchronized, user-scoped data stored on the device for read-only offline access. |
| Snapshot freshness | The timestamp shown to users so they can judge how old offline information is. |
| Pending operation | A transaction change saved locally and awaiting server synchronization. |
| Service worker update | A new app shell waiting to activate; activation must not discard a transaction form in progress. |

## Implementation plan

1. Fix same-origin API routing and document the Vercel `API_ORIGIN` setup; verify auth cookies on the production HTTPS preview, especially in Safari.
2. Finalize manifest, icons, install detection, Android install action, and iOS help sheet.
3. Design the encrypted snapshot and local unlock flow; migrate existing IndexedDB data safely and clear it on logout/account switch.
4. Add offline startup/lock/unlock, the snapshot freshness banner, read-only offline sections, and encrypted offline queue handling.
5. Make service worker updates user-initiated with a reload warning and confirm API responses remain uncached.
6. Verify on a real Android Chrome device and a real iPhone Safari device: install, relaunch, offline unlock, stale-data labeling, reconnect/sync, logout cleanup, and update handling.

## Consequences and limitations

- Android may offer an in-app browser prompt; iOS installation remains a manual user action in Safari.
- Offline records are only as current as the last successful snapshot. Some functions remain online-only.
- A passcode gate reduces casual access to local records, but does not protect a device that is already unlocked from malicious code running in the same app origin.
- The free backend may be slow on the first request after idle and is not an always-available production service.
- Vercel Functions limit request bodies to 4.5 MB. The proxy streams generated report responses; very large parsed import payloads may still need to be split.

## References

- [WebKit: Safari 26 web apps and Add to Home Screen](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [WebKit: third-party cookie blocking](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- [Chrome/Web.dev: installation prompts and iOS fallback](https://web.dev/learn/pwa/installation-prompt)
- [Vercel: external-origin rewrites](https://vercel.com/docs/routing/rewrites)
- [Vercel: external rewrite timeout](https://vercel.com/docs/limits#proxied-request-timeout)
- [Vercel: Hobby plan](https://vercel.com/docs/plans/hobby)
- [Render: free services and limitations](https://render.com/docs/free)
- [MongoDB Atlas: free cluster limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

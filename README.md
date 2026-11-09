# Class-management-App

## Classroom — attendance, fees & tutes

A mobile-first offline PWA for one tutor and their attendance team. The UI follows the supplied teal, navy and white references, with **Today**, **Scan**, **Students**, and **Reports** tabs. Desktop adds a sidebar, monthly calendar, and timetable overview. All starting records are fictional sample data.

## Run locally

Requires Node.js 22+.

```sh
npm ci
npm run build
npm run db:local
npm run preview
```

Open the URL printed by Wrangler (normally `http://localhost:8787`). The built preview includes the Worker API, local D1 database, PWA service worker, and locally simulated tutor identity. For client hot reload, run `npm run dev` alongside the built API preview; Vite proxies `/api` to port 8787. Service workers only register in production builds, not Vite development mode.

```sh
npm run build   # strict TypeScript checks, Vite client, Worker bundle
npm test        # timetable, QR, D1 sync API and permission tests
```

## Project structure

```text
src/
  main.tsx       Four tabs, registration, scanner, QR cards, schedules, reports
  styles.css     Responsive teal / navy design and mobile bottom navigation
  model.ts       Typed entities, recurrence, overlap and free-slot calculations
  seed.ts        Explicit fictional starter records
  store.ts       IndexedDB cache, persistent outbox, sync and conflict review
server/
  index.ts       Authenticated Worker API, permissions, validation and D1 sync
db/schema.ts    Drizzle schema for members, records, events and timetable lock
drizzle/        Generated schema-only SQL, snapshot and migration journal
public/
  sw.js          Offline application shell (never caches API/auth requests)
  manifest.webmanifest
  icon.svg
tests/           Domain rules and real local D1 integration checks
scripts/         Worker build
.openai/hosting.json  Sites identity and storage declaration
wrangler.jsonc   Local development configuration only
```

## Data model

| Entity | Stable key | Purpose |
| --- | --- | --- |
| Student | `S-<UUID fragment>` | Name, grade, class, roll, student/parent/WhatsApp contacts, address, optional resized photo |
| Class | UUID / stable class ID | Name, subject, room, monthly LKR fee, accent color |
| Schedule | UUID | Recurring weekly versions with effective date ranges, or a single extra date |
| Session override | `scheduleId@date` | Cancel or change one day's session without changing the series |
| Attendance | `studentId@sessionId` | One student's presence in one specific class session |
| Fee | `studentId@classId@YYYY-MM` | One full monthly fee, method, amount and recorded time |
| Tute | `classId@YYYY-MM` | Editable lesson title for the class/month |
| Tute issue | `studentId@tuteId` | Whether and when a particular student received the lesson |

`Session` is derived from a schedule and date: `scheduleId@YYYY-MM-DD`. Weekly time changes preserve this identity. Student IDs and QR payloads never change with the student's grade or class. Sample students use sequential IDs; new registrations use UUID fragments so offline devices do not assign the same ID.

QR payload: `{"app":"classroom","v":1,"id":"S-00001"}`. It carries no contact details. Real QR generation, camera scanning with `jsQR`, image upload decoding, PNG download and print are implemented. Camera use requires HTTPS or localhost and browser permission; manual search is always available.

## Separate actions

Scanning opens a student's check-in card; it never writes data. **Mark attendance**, **Record payment**, and **Issue tute** are independent operations and separate buttons. Monthly fees use a confirmation dialog. Already-recorded actions are disabled in the UI and deduplicated by stable keys on the server. This initial model handles one full payment per class/month; installments, refunds and fee adjustments are outside the initial scope.

## Offline and sync

The service worker caches the app shell and bundled client assets after the first successful online load. IndexedDB stores records and an outbox. Each change writes its local record and pending operation in the **same transaction**, before showing success. Reconnection, a one-minute foreground timer, and **Sync now** retry pending changes. Sync requires the app to be open; there is no claim of background synchronization while it is closed. Last successful sync and pending counts are visible.

The server validates each operation and records it in D1. Operation IDs prevent duplicate retries. Attendance, payments and tute issues also have semantic unique keys. Mutable records use optimistic revision checks; rejected changes stay in the local queue and are shown in the sync dialog. Review them and choose the server version to discard a rejected local operation, then reapply the intended change if needed. There is no silent overwrite. A database-wide timetable revision protects overlap validation against simultaneous schedule changes from different devices.

Reports deliberately include local pending records and label that fact. CSV exports escape spreadsheet formula prefixes. Cross-device visibility follows successful synchronization. Keep browser storage until all pending records have synced. Offline data is device-scoped and remains available on a trusted device after online sign-out; browser storage is not an encrypted shared-device vault.

## Timetables and history

The calendar supports recurring weekly classes and extra sessions. **This day only** writes an override. **From this day onward** closes earlier schedule versions and appends a new version, preserving past sessions. Both scopes support cancellation. Weekly conflicts are checked for the following 370 days, including known extras and day overrides; the free-time finder checks all active classes between 08:00 and 20:00 and offers 30-minute start increments. Edits display free slots when a conflict occurs. Schedule history records old/new times, date/scope, author and server time. Existing future day-only overrides remain authoritative after a weekly timetable change.

## Roles and hosting

Sites provides ChatGPT authentication and the private Site boundary. Keep this deployment private: do not publish the pupil directory publicly. **Production must set `INITIAL_ADMIN_EMAIL` to the tutor's authenticated email**, so the first arbitrary visitor cannot become admin. Do not set `LOCAL_DEMO` in production. The local-only Wrangler configuration enables a simulated tutor for development.

The tutor adds member email/role in **Workspace settings**, then separately grants that person access through the private Site sharing controls. Membership alone does not grant Site access. All API changes are authorized server-side:

| Role | Permissions |
| --- | --- |
| Tutor / admin | Students, schedules, tute titles, members, check-in, payments, issuance, reports |
| Attendance staff | Register students; add/edit classes, timetables and tute titles; record attendance, fees and tute issues; view reports |
| Read-only viewer | Read records, view and export reports; no mutations |

The admin role preview only reduces UI permissions; it cannot grant a staff/viewer account additional server permissions. Hosted requests require the Sites-authenticated email header and an existing membership. API responses are not cached. No external messages or payment processing are performed.

The deployment target is a Cloudflare Worker module (`dist/server/index.js`) with static client assets (`dist/client`), D1 binding `DB`, and the checked-in schema migration. `.openai/hosting.json` preserves this Site's identity. `wrangler.jsonc` is for local development; use Sites for hosted configuration and migration application.

## Initial-version boundaries

- Local production browser checks pass at mobile and desktop widths, including the four tabs, class/free-time dialogs, registration, profile, QR, and sync dialog. Two isolated Chromium sessions also verify changes propagate both ways.
- Offline use requires one successful load in a secure browser and adequate browser storage.
- The default seed is clearly labeled fictional data. Replace the sample dataset before entering live student records.
- The supplied grade groups, rooms and fee amounts are initial configuration in `src/seed.ts`; data import, account recovery, installments, SMS and WhatsApp messaging are future extensions.
- Photos are resized locally to 256px JPEGs and synchronized with the student record; there is no R2 upload dependency in this initial version.

A ZIP of the exact committed source is served at `/classroom-source.zip` behind the private Site access boundary. It excludes dependencies, Git metadata, local databases, credentials, and build output. Build from a committed checkout to keep this source download aligned with the release.

## Incremental sync

The client sends its last successfully merged `lastSeq` (zero for a first sync). The API returns current values only for keys changed after that event sequence, plus `lastSeq`, `full`, and event-backed deletion tombstones in `deleted`. Snapshot reads run in one D1 batch so records and cursor agree during concurrent writes. Existing event indexes are sufficient; no migration is required. Seed records are included in full snapshots even though they have no events.

The browser merges deltas and reapplies pending outbox operations in order. Cursor, cache, and outbox acknowledgements commit in one IndexedDB transaction. Empty, malformed, or count-mismatched caches and invalid/ahead cursors recover with a full snapshot. Discarding a conflict requests a full snapshot to restore the authoritative server value. No delete API is added: a future deletion must atomically append an event and remove the record. Direct database edits without events require a full refresh.

Optional two-browser integration check: install `playwright-core` separately, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs`, run the local production preview on port 8787, then run `node scripts/check-two-browsers.mjs`. It uses two isolated Chromium contexts, edits lesson titles through the UI in both directions, verifies a one-record delta and empty idle delta, and compares local caches. `CHROMIUM_PATH` can select an installed Chromium binary. Screenshots go to the ignored `work/` directory. This check uses only fictional local data.

## UI source layout

`src/main.tsx` only loads CSS and mounts `App`. `src/App.tsx` owns the existing state, action handlers and tab/dialog wiring. The four tab views, sync/activity/profile dialogs, QR card and scanner, schedule/calendar views, navigation and shared UI each live in `src/components/`. Shared download behavior lives in `src/utils.ts`; navigation labels and types live in `src/navigation.ts`. Component moves retain the original handlers, CSS classes, model/store exports and API behavior.

The formatting pass and individual extractions are separate commits. State and mutation/report handlers stay together in `App.tsx` to preserve their shared closures and ordering. No view was skipped. After the split, production JavaScript is 479.60 kB (155.79 kB gzip), versus 476.89 kB (152.25 kB gzip) before; CSS remains exactly 52.71 kB (11.60 kB gzip).

With the same optional Playwright setup as the sync check, `node scripts/check-ui.mjs` runs the mobile/desktop UI smoke checks against the local production preview. It checks page errors and horizontal overflow and saves screenshots under `work/`.

## Staff setup and session overview


Admin and attendance staff can add or edit a class from **Today → Manage classes → Add class / Edit class**, including classes without a timetable yet. Grade is 1–13, class name is required (up to 100 characters), and monthly fees are positive LKR values up to 1,000,000 with at most two decimal places. These checks run in the form, IndexedDB write path, and sync API. Old class records derive their grade from names such as “Grade 9”; saving the form persists an explicit grade. Existing student grade values are not bulk-updated when a class is edited, and previously recorded payments keep their amounts.

Staff may register new students but editing an existing student and managing workspace members remain admin-only. Staff can also edit day/weekly timetables, create extra sessions, cancel sessions, and edit monthly tute titles. Changes use the existing durable outbox, revision checks and schedule overlap protection. Registration retries are idempotent for the original authenticated author.

**Open class** opens a session overview with class details, date/time, fee, attendance list and present/not-marked/total counts. Counts are specific to that session, include current enrollees and students already marked before a class transfer, and include pending local changes. **Start scanning** explicitly switches to Scan with that session selected. Opening the overview does not record attendance, payment or tute issuance; cancelled sessions and read-only viewers cannot start scanning from it.

# Classroom — attendance, fees & tutes

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
migrations/
  0001_initial.sql  Schema for members, records, events and timetable lock
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
| Attendance staff | View directory/reports and record attendance, fees and tute issues |
| Read-only viewer | Read records, view and export reports; no mutations |

The admin role preview only reduces UI permissions; it cannot grant a staff/viewer account additional server permissions. Hosted requests require the Sites-authenticated email header and an existing membership. API responses are not cached. No external messages or payment processing are performed.

The deployment target is a Cloudflare Worker module (`dist/server/index.js`) with static client assets (`dist/client`), D1 binding `DB`, and the checked-in schema migration. `.openai/hosting.json` preserves this Site's identity. `wrangler.jsonc` is for local development; use Sites for hosted configuration and migration application.

## Initial-version boundaries

- No browser visual QA was available in the authoring environment; TypeScript, domain and local database/API checks are the validation baseline.
- Offline use requires one successful load in a secure browser and adequate browser storage.
- The default seed is clearly labeled fictional data. Replace the sample dataset before entering live student records.
- The supplied grade groups, rooms and fee amounts are initial configuration in `src/seed.ts`; broader class/fee setup, data import, account recovery, installments, SMS and WhatsApp messaging are future extensions.
- Photos are resized locally to 256px JPEGs and synchronized with the student record; there is no R2 upload dependency in this initial version.

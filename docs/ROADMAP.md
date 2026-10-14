# Eonward development roadmap

Last reviewed: 2026-10-14  
Status: **M0 + M1 + M2 in progress (implementation not device-verified)**  
Platform priority: Android first; iOS compatible; desktop is a later decision.

This file is the single source of truth for **planned vs completed** work. It is public: record implementation milestones here, not private product research.

## Tracking rules

- `[x]` = merged to `main` and checked at the appropriate level.
- `[ ]` = not completed. An unverified file or mocked screen is **not** a finished feature.
- Mark work as `BLOCKED` with a reason and a specific next action.
- At the end of each implementation session, update these checkboxes and the next-three-actions section **in the same commit**.
- Do not mark a milestone complete until its exit criteria have evidence (build, test, screenshots, or device verification).
- Scope changes go in [DECISIONS.md](DECISIONS.md).

## Overall progress

| Milestone | Scope | State | Exit gate |
| --- | --- | --- | --- |
| M0 — Foundation | Documentation, repository hygiene, Expo shell | In progress | Clean install, typecheck, successful device startup |
| M1 — Product UX | Information architecture, design tokens, prototypes | In progress | Approved screen map and verified interactions |
| M2 — Goals & horizons | Persistent data, hierarchy, seven horizons | In progress | End-to-end offline goal management |
| M3 — Planning views | Boards, calendar, time blocks, fast capture | Planned | Consistent updates across every view |
| M4 — Personal systems | Notes, repeating items, habits, templates, reviews | Planned | All workflows persist and survive restart |
| M5 — Mobile integration | Notifications, widgets, localization, backup | Planned | Real-device acceptance and restore test |
| M6 — Quality & release | Performance, accessibility, testing, release build | Planned | Release checklist signed off |

## M0 — Foundation

- [x] Initialize repository on `main`, without a root README.
- [x] Create the public-safe documentation in `docs/`.
- [x] Add Expo + React Native + strict TypeScript starter source.
- [x] Add a minimal visual token file and starting screen.
- [ ] Resolve dependencies, commit `package-lock.json` and verify a clean install.
- [ ] Run `npm run typecheck` and `npx expo install --check`.
- [x] Add dependency-free Node domain tests and a CI workflow (execution status pending).
- [ ] Launch the initial shell on an actual Android device or emulator.

**Exit gate:** a reproducible clean install, no type errors, no Expo dependency mismatches, and a usable shell on Android. Source files alone do **not** pass this gate.

## First implementation slice (source delivered, runtime verification pending)

- [x] Add an interactive seven-horizon screen and previous/next period controls to source.
- [x] Add create/edit/complete/reopen/delete dialogs and a next-step entry flow to source.
- [x] Add SQLite schema v1, goal queries and writes, and a database startup migration to source.
- [x] Add tests for ISO weeks, date navigation, validation and migration guards.
- [ ] Verify domain tests run successfully in CI.
- [ ] Confirm full TypeScript build and Expo package compatibility.
- [ ] Verify actual create/edit/persist/restart on Android.
- [ ] Verify modal transitions, child relations and keyboard on a phone.

This inventory records committed implementation, **not completion of the M1/M2 exit gates**.

## M1 — Product UX & design

- [ ] Inventory all major screens, actions, empty states, errors and navigation transitions.
- [ ] Define primary navigation for phone and adaptive layouts for tablet.
- [ ] Design Horizons for thumb operation; test tab switching and long lists.
- [ ] Define reusable typography, spacing, color, elevation, radius and motion tokens.
- [ ] Create accessible light/dark states, keyboard behavior and RTL examples.
- [ ] Validate interactive prototypes on at least one mid-range Android device.

**Exit gate:** real screen-flow specification, prototype/screenshots and clear acceptance rules. Do not clone proprietary visual assets.

## M2 — Data model, goals & horizons

- [ ] Introduce SQLite storage and versioned migrations.
- [ ] Define unique items, parent/child relationships, placements and ordering.
- [ ] Create, edit, complete, archive, delete and restore goals.
- [ ] Support Day, Week, Month, Quarter, Year, Decade and Life horizons.
- [ ] Implement zoom/navigation and moving items between horizons.
- [ ] Prevent hierarchy cycles and accidental duplicate records.
- [ ] Distinguish horizon placement, due date and scheduled time block.
- [ ] Test date boundaries, leap years, DST, changing time zones and week starts.
- [ ] Restore saved data after force-close and restart.

**Exit gate:** a real complete offline flow from creating a life goal to seeing and completing related daily steps, with repeatable automated tests.

## M3 — Boards, calendar & capture

- [ ] Build custom boards and lists referencing existing items (no cloned items).
- [ ] Implement drag/reorder with accessible non-drag alternatives.
- [ ] Build daily, weekly and monthly calendar views.
- [ ] Implement time blocks separate from deadlines.
- [ ] Add rescheduling, conflict display and fast item capture.
- [ ] Ensure editing from any view updates all others consistently.

**Exit gate:** cross-view operations retain ordering and data after restart, verified with device interactions and persistence tests.

## M4 — Notes, recurrence & reflection

- [ ] Add notes and formatting only after editor selection is proven on-device.
- [ ] Add recurrence rules, generated occurrences and exceptions.
- [ ] Implement habits and flexible progress measurement.
- [ ] Build reusable templates and guided multi-step plans.
- [ ] Add personal progress metrics and periodic reviews.
- [ ] Handle recurring-item edits, DST and skipped occurrences safely.

**Exit gate:** recurring and rich-content workflows work fully offline, including app restarts and history preservation.

## M5 — Mobile completeness

- [ ] Implement local reminders and Android permission flows.
- [ ] Implement homescreen widgets and quick-add entry points.
- [ ] Add Persian/English locale behavior and RTL UI.
- [ ] Add Jalali/Gregorian display modes without changing stored instants.
- [ ] Add export/import with schema version and a tested restore process.
- [ ] Audit privacy, permissions and accessibility across both themes.
- [ ] Check iOS compatibility when Apple tooling is available.

**Exit gate:** data recovery demonstrated on a clean install; notifications and widgets checked on real devices, not only in an emulator.

## M6 — Release quality

- [ ] Test navigation, focus, gestures, screen readers and reduced motion.
- [ ] Establish and measure launch, scroll and drag performance budgets.
- [ ] Profile long histories and thousands of saved items.
- [ ] Fix crashers, data-integrity bugs and high-severity usability issues.
- [ ] Produce a signed Android release build and preserve verification evidence.
- [ ] Record release notes and known limitations in `docs/`.

**Exit gate:** a reproducible build and completed acceptance checklist. Publishing to a store is a separate explicit decision.

## Deferred (not quietly added to the current scope)

- Authentication, accounts, cloud sync and realtime collaboration.
- Paid subscriptions, hosted backend, commercial releases.
- AI coaching or remote model integrations.
- Dedicated desktop UI; revisit after mobile quality is established.

## Next three actions

1. Verify domain-tests CI, resolve dependencies, create a genuine package-lock.json, and check the Expo SDK 57 matrix.
2. Run typecheck/Android startup, then test goal CRUD, next steps and restarts on a device.
3. Fix device findings; expand Horizons UX and implement fuller hierarchy/placement rules.

## Progress log

| Date | Change | Verification |
| --- | --- | --- |
| 2026-10-14 | Repository documents and minimal Expo source added. | Remote file inspection only; install/build/device testing pending. |
| 2026-10-14 | Seven-horizon UI, SQLite goal CRUD, child steps, migration source and Node unit tests added. | Static review and GitHub verification; npm install, CI results and physical-device verification pending. |

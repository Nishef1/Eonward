# Eonward development roadmap

Last reviewed: 2026-10-14  
Status: **M0 complete (emulator launch verified); M1 + M2 in progress (CRUD behavior not yet device-verified)**  
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
| M0 — Foundation | Documentation, repository hygiene, Expo shell | Complete — emulator screenshot + CI | Clean install, typecheck, successful device startup |
| M1 — Product UX | Information architecture, design tokens, prototypes | In progress | Approved screen map and verified interactions |
| M2 — Goals & horizons | Persistent data, hierarchy, seven horizons | In progress | End-to-end offline goal management |
| M3 — Planning views | Boards, calendar, time blocks, fast capture | In progress — Boards + Calendar/Time Block source | Consistent updates across every view |
| M4 — Personal systems | Notes, repeating items, habits, templates, reviews | Planned | All workflows persist and survive restart |
| M5 — Mobile integration | Notifications, widgets, localization, backup | Planned | Real-device acceptance and restore test |
| M6 — Quality & release | Performance, accessibility, testing, release build | Planned | Release checklist signed off |

## M0 — Foundation

- [x] Initialize repository on `main`, without a root README.
- [x] Create the public-safe documentation in `docs/`.
- [x] Add Expo + React Native + strict TypeScript starter source.
- [x] Add a minimal visual token file and starting screen.
- [x] Resolve dependencies and commit a real `package-lock.json` through a successful GitHub Actions npm installation.
- [x] Verify final `npm ci` reproducibility in CI (GitHub Actions passed).
- [x] Run `npm run typecheck` and `npx expo install --check` successfully in GitHub Actions.
- [x] Add dependency-free Node domain tests and a CI workflow; tests passed on GitHub Actions.
- [x] Launch the initial shell on Android emulator (screenshot supplied on 2026-10-14).

**Exit gate:** a reproducible clean install, no type errors, no Expo dependency mismatches, and a usable shell on Android. Source files alone do **not** pass this gate.

## First implementation slice (source delivered, runtime verification pending)

- [x] Add an interactive seven-horizon screen and previous/next period controls to source.
- [x] Add create/edit/complete/reopen/delete dialogs and a next-step entry flow to source.
- [x] Add SQLite schema v1, goal queries and writes, and a database startup migration to source.
- [x] Add tests for ISO weeks, date navigation, validation and migration guards.
- [x] Verify domain tests run successfully in CI.
- [x] Confirm TypeScript typecheck, Expo SDK alignment, and Android Metro export in CI (native APK build still pending).
- [ ] Verify actual create/edit/persist/restart on Android.
- [ ] Verify modal transitions, child relations and keyboard on a phone.

This inventory records committed implementation, **not completion of the M1/M2 exit gates**.

## Next implementation slice — Horizons 2.0

**Priority:** complete the relationship and scheduling foundations before introducing Boards or Calendar.

- [ ] Verify create/edit/complete/reopen/delete and persistence across emulator restarts.
- [x] Implement child-goal navigation with back-stack and editable nested goal details in source; Android interaction verification pending.
- [x] Implement parent selection/reparenting with recursive-cycle validation inside a SQLite exclusive transaction; device verification pending.
- [x] Implement period stepper, current-period jump and precise YYYY-MM-DD entry for daily goals; device verification pending.
- [x] Keep stable goal IDs across Focus/Perspective/parent context; multi-placement schema remains future work.
- [x] Implement seven-horizon Perspective overview with goal counts, previews, direct navigation and context-aware Add Goal (code committed; device review pending).
- [x] Add actionable empty-state guidance and align core action/touch-target dimensions in source.
- [ ] Validate Android status/system bars, keyboard, touch targets and modal behavior after new UI changes (not yet run on device).
- [x] Add pure unit tests for saved-period parsing, date input and parent-option descendant exclusion; integration/device tests still pending.
- [ ] Add SQLite integration tests for reparenting transactions and persistence.
- [ ] Run the entire workflow on the Android emulator and record findings.

**Exit gate:** create a Life goal, link smaller goals in multiple horizons, move and edit them without duplication, and reopen the app with the structure intact. No placeholder screen counts as complete.

## M1 — Product UX & design

- [ ] Inventory all major screens, actions, empty states, errors and navigation transitions.
- [ ] Define primary navigation for phone and adaptive layouts for tablet.
- [ ] Design Horizons for thumb operation; test tab switching and long lists.
- [ ] Define reusable typography, spacing, color, elevation, radius and motion tokens.
- [ ] Create accessible light/dark states, keyboard behavior and RTL examples.
- [ ] Validate interactive prototypes on at least one mid-range Android device.

**Exit gate:** real screen-flow specification, prototype/screenshots and clear acceptance rules. Do not clone proprietary visual assets.

## M2 — Data model, goals & horizons

- [x] Implement SQLite with transactional versioned migrations (v1 → v2); Android upgrade verification pending.
- [x] Stable IDs, parent relationships and persistent manual ordering implemented for the current single-placement model; multi-placement remains pending.
- [x] Create/edit/complete, reversible Archive/Restore, and safe subtree handling implemented in source; permanent deletion intentionally deferred.
- [ ] Support Day, Week, Month, Quarter, Year, Decade and Life horizons.
- [ ] Implement zoom/navigation and moving items between horizons.
- [ ] Prevent hierarchy cycles and accidental duplicate records.
- [x] Separate Horizon and scheduled time blocks in SQLite v4; explicit due dates remain unimplemented.
- [ ] Test date boundaries, leap years, DST, changing time zones and week starts.
- [ ] Restore saved data after force-close and restart.

**Exit gate:** a real complete offline flow from creating a life goal to seeing and completing related daily steps, with repeatable automated tests.

## M3 — Boards, calendar & capture

See [CAPABILITIES.md](CAPABILITIES.md) for the full implementation inventory, including features we have **not** built.

### Board vertical slice (schema v3)

- [x] Add additive v2 → v3 SQLite migration for boards and `board_goals` join table with foreign keys.
- [x] Create, rename, describe and delete a board without removing its goals.
- [x] Link/unlink existing active goals; a goal can be in multiple boards without being copied.
- [x] Create a new goal directly inside a board with an atomic goal + membership transaction.
- [x] View board progress and toggle completion of the underlying goal.
- [x] Open original goal details in Horizons and refresh board data on return.
- [x] Repair goal-editor initial scroll/autofocus and empty-parent-picker presentation.
- [x] Adapt three existing migration tests to v3; stay within the 20-test budget.
- [ ] Test upgrade of an existing v2 database, board membership, completion, archive filtering and navigation on Android.
- [ ] Decide whether boards need ordered sections, grouped lists or saved filters; in-context goal creation is implemented.



- [x] Build the first real Boards workflow: local boards with many-to-many references to existing goals. Device QA pending.
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

## Automated test policy

- Hard limit: **20 focused named automated tests total** across the repository (**12** currently).
- `scripts/check-test-budget.mjs` blocks CI for over-budget cases or duplicate names.
- Replace outdated tests and merge redundant coverage instead of accumulating regression cases.
- Avoid disposable snapshot tests, generated test batches, or tests without a meaningful failure mode.
- TypeScript, SDK alignment and bundling are build checks, not test cases.
- Manual emulator acceptance remains required and is not an automated test.

## Verification — Horizons 2.0 source

- [x] GitHub Actions domain tests passed on commit `34710e0`.
- [x] GitHub Actions locked `npm ci`, Expo package compatibility, TypeScript and Android Metro export passed on commit `34710e0`.
- [ ] Actual Android emulator UX regression of editor, hierarchy and keyboard remains outstanding.

## Self-review and revised implementation plan (2026-10-14)

**Critical findings:**
- The first Perspective implementation showed period groups, but did not reveal a goal's *actual* parent lineage. We built Goal Path rather than another page.
- Editing into another horizon could leave the user on an empty previous period. Focus now follows the saved destination.
- We moved faster on screens than on Android end-to-end QA. Passing TypeScript and Metro is not proof of keyboard, modal or SQLite persistence behavior.
- Goal ordering was not user-controlled and deletion was irreversible. Source now has Move Up/Down and Archive/Restore; device verification remains.
- A single `period_key` is not a due date or time block. No claim of full feature parity is justified.

**Priority order:** (1) Verify existing-data migration plus archive/order and earlier CRUD on Android; (2) fix concrete UX bugs; (3) strengthen time/placement semantics; (4) consider gestures; (5) new calendar/board surfaces. No new libraries or automatic tests unless they address a demonstrated risk.

## Goal Path slice — source complete, runtime pending

- [x] Resolve actual ancestors through a bounded recursive SQLite query; root-first.
- [x] Show parent context in Focus and Perspective, with tap-to-open ancestor chips.
- [x] Follow a moved goal to its saved target period while in Focus.
- [ ] Confirm deep navigation, reschedule, keyboard and restart behavior on Android.

## Self-review of Android action menus

React Native Android Alert supports at most three actions. The first proposed four-option organizer was unsuitable. Replaced it with a lightweight in-app action sheet before user delivery; it has Move Up/Down only when valid, Archive, and Cancel. No new package and no additional automated test. Review sheet position and dismissal on Android.

## Data safety & ordering slice — schema v2

- [x] Add transactional SQLite v1 → v2 migration: nullable `archived_at` and stable `sort_rank` (without resetting user data).
- [x] Implement Archive/Restore of an active goal subtree, preserving already archived descendants.
- [x] Add Archive view accessible alongside Focus/Perspective; remove destructive Delete action from goal details.
- [x] Add Move Up/Down actions that persist ordering, with an Android-safe custom action sheet and no new dependency.
- [x] Update existing migration checks to version 2; remain at **12/20** automated tests.
- [ ] Verify these workflows and migrations on Android with an actual v1 populated database (SQL sanity verification completed separately; emulator QA outstanding).
- [ ] Review performance/visual clarity with a large goal list, then assess whether drag-to-reorder is worth adding.

## Screenshot-based mobile UX cleanup — October 14

**Evidence received:** Android emulator screenshots show all three empty states and the Create Goal sheet; they do not establish that goal persistence, migration or archive/restore interactions succeed.

- [x] Move Create/Edit Goal's primary Save action outside the scrolling form into a persistent bottom safe-area footer; leave inputs scrollable.
- [x] Add safe-area-aware modal layouts for Editor, Details and Organize actions without adding dependencies.
- [x] Remove the repeated empty-state CTA that was partially hidden under the Focus bottom action bar; keep one consistent New goal action.
- [x] Hide the redundant bottom New goal bar in Perspective (each horizon already offers Add goal).
- [x] Keep Focus/Perspective as primary modes; demote Archive into a separately styled utility shortcut.
- [x] Condense Android manual QA to ten meaningful scenarios instead of continuing a sprawling repetitive checklist.
- [ ] **Verify these layout changes with fresh screenshots on the Android emulator**, both with and without the keyboard.
- [ ] Test real goal CRUD, archive/restore, ordering and data persistence; screenshots of an empty state do not prove these.

**Self-critique:** Our earlier modal design relied on a long scroll to reach Save, and even duplicated a first-goal call-to-action below a fixed footer. Both are avoidable design errors; fixing layout and action hierarchy is more valuable than another feature screen. The grey/blue floating Tools gear in the screenshot is not rendered anywhere by Eonward's source; investigate the emulator/development overlay separately if it interferes with testing.

## Current implementation checkpoint

The new Board route is a **functional source implementation** rather than a placeholder card. It uses one persistent goal entity and an indexed, unique membership table. CI validates the migration and build; screenshots and user interaction are required for UI sign-off.

The initial Create Goal form was appearing partially scrolled in a screenshot; initial autofocus has been removed, scroll position resets when opened, and empty parent-option lists no longer reveal a pointless selector.

## Calendar and focused time — schema v4

**Product principle:** a time block is a scheduled occurrence *of an existing goal*, not an additional goal entity. The same goal ID is displayed in Horizons, Boards and Calendar. This is local on-device navigation/data-sharing, not cloud/device sync.

- [x] Add additive SQLite v3 → v4 `time_blocks` migration with goal FK, UTC start/end instants, kind and optional intention. Existing goals/boards preserved by design.
- [x] Schedule, edit and unschedule multiple local-day time blocks against the same active goal; no new dependency.
- [x] Separate flexible Time Block from fixed-limit Timebox, with a written target for the latter; no active timer or alert yet.
- [x] Add day navigation, daily agenda and visually sized time blocks in a 24-hour calendar timeline, including overlapping lanes.
- [x] Link Calendar from Horizons and Boards; open original goals from scheduled blocks.
- [x] Display the next active time block in relevant Focus, Perspective and Board goal cards.
- [x] Add two meaningful domain tests (strict date/time and overlap lanes); update the existing migration checks. Total **14 of 20**.
- [ ] Test v3 → v4 migration on a populated Android emulator **without uninstalling**.
- [ ] Verify saving, changing and unscheduling across all three views plus force-close/restart.
- [ ] Test daylight-saving transitions on a device/time-zone change, including ambiguous fall-back times.
- [ ] Add explicit due date separately from scheduled time; handle overnight/multi-day blocks in a later slice.
- [ ] Add a real focus timer/stop reminder for Timebox when Android and background behavior are verified.

**Self-critique:** the previous roadmap delayed scheduling until Boards was fully polished, despite time blocking being an important part of the user's desired workflow. This slice makes shared scheduling functional before adding animations or secondary features. It is *not* a mature calendar: week/month grid, drag-to-resize, reminders, recurrence, due dates and external calendar integrations are still missing.

## Daily Timeline redesign — screenshot review

- [x] Move the scrollable 24-hour schedule above the fold; keep the week strip, day title and quick actions visible.
- [x] Live current-time marker, Jump to Now, day/week navigation and initial positioning near now/first event.
- [x] Draw actual start/end times and goal names in proportionally sized, color-coded blocks with side-by-side overlaps.
- [x] Add separate accessible List view for short blocks and quick creation by tapping an empty hour.
- [x] Keep the same goal IDs and SQLite v4; no new library; automated suite remains 14/20.
- [ ] Verify Android dark/light, small screen, keyboard, 15-minute blocks, 3+ overlaps, scheduling and persistence.
- [ ] Validate accessibility, date rollover, time zones and long-press navigation before gesture-heavy enhancements.

**Self-critique:** the original Calendar buried its essential 24-hour schedule after a large header and long agenda in one enormous scrolling page. It looked like an afterthought. The new hierarchy puts visual scheduling first; List is an intentional fallback for short items, not a second copy of goals. Premium means clear time geometry and reliable actions, not more decoration.

## Next three actions

1. Review light/dark Android screenshots with overlapping and 15-minute blocks, week strip and Now marker.
2. Test tap-to-schedule, edits, List fallback and existing Horizons/Boards links across app restart.
3. Fix device UX issues before adding countdown timers or drag/resizing gestures.

## Progress log

| Date | Change | Verification |
| --- | --- | --- |
| 2026-10-14 | Repository documents and minimal Expo source added. | Remote file inspection only; install/build/device testing pending. |
| 2026-10-14 | Seven-horizon UI, SQLite goal CRUD, child steps, migration source and Node unit tests added. | Domain tests, npm installation, typecheck and SDK alignment passed in GitHub Actions; device verification pending. |
| 2026-10-14 | Dependency conflict fixed by pinning React DOM 19.2.3 and Worklets 0.10.1; lockfile regenerated. | Expo alignment, typecheck and Android Metro export passed. |
| 2026-10-14 | Final lockfile-based CI run verified. | npm ci, Expo alignment, typecheck, Android Metro export and domain tests all passed; native APK/device testing remains. |
| 2026-10-14 | Initial Horizons shell shown running on Android emulator; Horizons 2.0 priorities set. | User-provided screenshot verifies emulator launch only; goal CRUD, hierarchy and persistence still require runtime testing. |
| 2026-10-14 | Horizons 2.0 initial implementation: nested navigation, reparenting validation, period editor and visual refinements. | CI checks passed on commit 34710e0; Android UI QA remains outstanding. |
| 2026-10-14 | Built Focus/Perspective mode with local seven-period overview and test-budget enforcement. | CI passed on `2c1f8e8`: 12/20 tests passed, zero failures; npm ci, Expo alignment, TypeScript and Android Metro export passed. Emulator UX pending. |
| 2026-10-14 | Added a goal ancestor trail, immediate-parent hints and destination-following edits; reviewed sequencing and gaps. | Code committed pending CI; Android UX pending; still 12 core tests. |
| 2026-10-14 | Added schema v2, archive/restore UI and stored ordering; updated existing migration tests. | GitHub Actions domain and app checks passed on `8b5e606`; Android migration/interaction QA pending; 12/20 tests. |
| 2026-10-14 | Refined Focus/Perspective/Archive hierarchy and modal safe-area/footer behavior based on four emulator screenshots. | Source changes, CI and fresh Android screenshots pending; 12/20 automated tests unchanged. |

| 2026-10-14 | Board workspace added: schema v3 with reusable goal references and atomic in-board goal creation; fixed goal editor initial scroll/parent selector. | Final code commit `f8c3fd1`: 12/20 domain tests, npm ci, Expo version checks, TypeScript and Android Metro all passed; Android board interaction and migration QA pending. |

| 2026-10-14 | Added connected Calendar/Time Block and Timebox slice, schema v4, day timeline, and navigation from existing goals. | Source implementation committed pending CI/device verification; 14/20 tests. |

| 2026-10-14 | Rebuilt Calendar as a visible premium day canvas with stable seven-day header, live Now, goal color, quick hour scheduling and separate List. | Source and CI pending, emulator visual and interaction QA required; 14/20 tests. |

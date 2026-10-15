# Eonward development roadmap

Last reviewed: 2026-10-15
Status: **M0 complete; M1–M6 partially implemented and verified at the levels below. Store release is not approved.**
Release targets: **Android and iOS**. Native Android can be built locally; native iOS acceptance needs Apple tooling. Desktop is deferred.

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
| M1 — Product UX | Information architecture, design tokens, prototypes | Studio direction implemented; Android renders sampled; user aesthetic acceptance open | Approved screen map and verified interactions |
| M2 — Goals & horizons | Persistent data, hierarchy, seven horizons | SQLite v7; real SQLite integration and sampled native flows pass | Complete device acceptance matrix |
| M3 — Planning views | Boards, calendar, time blocks, fast capture | Implemented; native keyboard, time editing and cross-view Focus sampled | Full cross-view and device matrix |
| M4 — Personal systems | Notes, repeating items, habits, templates, reviews | Plain notes, recurrence and weekly Review implemented; habits/templates deferred | Accepted offline workflow scope |
| M5 — Mobile integration | Notifications, widgets, localization, backup | Native picker/backup/reminders implemented; widgets/localization remain open | Physical-device and Apple acceptance |
| M6 — Quality & release | Performance, accessibility, testing, release build | Isolated Android release QA APK built; iOS JS export passes | Store signing, native iOS, physical-device and accessibility gates |

## Current verification — Studio and native planning (2026-10-15)

This section is the current acceptance summary. Earlier dated slices below preserve implementation history; their pending statements are not new evidence against later checked work.

- [x] Ground a coherent mobile direction before code changes; implement neutral surfaces, restrained layered depth, vector icons, consistent segmented controls and labeled navigation. Keep private references and synthetic screenshots outside Git.
- [x] Sample actual Android release renders for Plan, Horizons, goal details, Focus, Calendar, Boards and Review, including populated goals, parent context and a board. This is builder review, not independent or user aesthetic approval.
- [x] Sample Plan in automatic light/dark and at 130% system font scale; open all seven horizon options and navigate to Year without clipping those sampled states.
- [x] Reproduce quick capture hidden behind full Gboard, fix root and modal keyboard avoidance, and hide the dock while typing. With full Gboard visible, create two separate daily goals; goal editor Save remains above the IME and dirty-close shows the discard choice.
- [x] Add 15/25/50-minute quick Focus as an atomic reservation plus session; archive of the active goal/subtree closes its session with history. Extend the existing real SQLite test rather than exceed 20 cases.
- [x] Replace civil-date/time text entry with native pickers. On Android edit a Timebox end from 13:40 to 13:16; unsaved changes disable Start until Save, then the saved one-minute duration is used.
- [x] Fix the first notification prompt on Android: SDK 57 can return denied before the first system request. Verify the actual Allow prompt, the no-alert timer path, pause/end and recorded history.
- [x] Receive a real generic Focus-expiry notification after a one-minute session while the QA app is backgrounded. Exact-alarm access was explicitly allowed for this emulator sample and restored afterward. A denied exact-alarm path scheduled the SDK's inexact fallback; delivery timing in that path is not certified.
- [x] Restore a synthetic graph through the native file picker into the separate QA app: five goals, one board and eight total records, preserving canonical relations. Existing primary-app data remains untouched.
- [x] Build/install a standalone Android QA release with embedded Hermes and launch without Metro or network access. Check ZIP 16KB alignment and all 50 native ELF libraries' LOAD alignment for arm64-v8a/x86_64. The APK uses a debug certificate and a separate QA identifier; it is not store signed.
- [x] Pass TypeScript, SDK dependency alignment, 20/20 domain/real-SQLite cases and the current iOS Hermes export. CI also validates Android/iOS generated config; none of these is a native iOS runtime pass.
- [x] Add data-preserving startup Retry, malformed/oversized native-link guards, an unknown-route recovery page, reduced-motion support, initial app assets and isolated preview/production build profiles.
- [ ] Fault-inject and verify startup Retry on native builds; perform full Focus lifecycle/re-arm, permission denial, locked idle and OEM battery tests on physical devices.
- [ ] Verify TalkBack/VoiceOver, maximum text sizes, small-phone landscape/keyboard variants, reduced-motion behavior and native iOS render/interactions.
- [ ] Resolve remaining dependency advisories and store permission/privacy requirements. Current audit: 22 affected dependency entries from three root advisories; see ENGINEERING.md for reachability and mitigation boundaries.
- [ ] Configure store signing and public release metadata when the core app is ready. Publisher/contact details remain deferred at the user's request. No store upload or publication has occurred.

Next three actions: (1) user review of the Studio direction plus remaining native interaction/accessibility checks; (2) native iOS build and simulator/device acceptance with Apple tooling; (3) close physical-device, dependency, signing and store gates before declaring release readiness. Widgets, native localization/Jalali, share-to-capture, templates and calendar drag remain unimplemented roadmap work.

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
- [x] Support Day, Week, Month, Quarter, Year, Decade and Life horizons.
- [ ] Implement zoom/navigation and moving items between horizons.
- [x] Prevent hierarchy cycles and accidental duplicate records with transactional validation and SQLite coverage.
- [x] Separate Horizon, UTC scheduled time blocks and optional civil-date deadlines in SQLite v7.
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
- [x] Build daily, weekly and monthly calendar views, plus List.
- [x] Implement time blocks separate from deadlines.
- [x] Add editor rescheduling, conflict display and inline capture; drag remains deferred.
- [ ] Ensure editing from any view updates all others consistently.

**Exit gate:** cross-view operations retain ordering and data after restart, verified with device interactions and persistence tests.

## M4 — Notes, recurrence & reflection

- [ ] Add notes and formatting only after editor selection is proven on-device.
- [x] Add completion-triggered daily/weekly/monthly/yearly recurrence; advanced exception calendars remain deferred.
- [ ] Implement habits and flexible progress measurement.
- [ ] Build reusable templates and guided multi-step plans.
- [x] Add actual completion/Focus history and weekly Review with explicit earlier-period decisions.
- [ ] Handle recurring-item edits, DST and skipped occurrences safely.

**Exit gate:** recurring and rich-content workflows work fully offline, including app restarts and history preservation.

## M5 — Mobile completeness

- [x] Implement local reminders and user-initiated Android permission flows; physical-device delivery acceptance remains open.
- [ ] Implement homescreen widgets and quick-add entry points.
- [ ] Add Persian/English locale behavior and RTL UI.
- [ ] Add Jalali/Gregorian display modes without changing stored instants.
- [x] Add versioned JSON export/import and atomic merge; real SQLite and sampled native file restoration pass.
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

- Hard limit: **20 focused named automated tests total** across the repository (**20** currently).
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

## Persistent focus session and primary navigation — schema v5

**Why this slice:** Calendar, Horizons and Boards are now equally important destinations, but the existing interface required header-level navigation and Timeboxes did not execute. This slice makes daily focus usable, not merely scheduled.

- [x] Add one **persistent three-destination bottom dock** for Horizons, Calendar and Boards in the shared app layout.
- [x] Remove redundant header shortcuts and leave the bottom inset to the shared dock.
- [x] Add additive SQLite v4→v5 `focus_session` table; **do not reset existing goals/boards/blocks**.
- [x] Start a real focus countdown from a saved Timebox in Calendar List or its editor.
- [x] Persist timer deadlines, pause state and remaining time in SQLite; only one session can run at a time.
- [x] Keep a compact timer visible while switching pages, with expandable pause/resume/end controls.
- [x] Use absolute wall-clock deadlines so returning from background or reopening the app yields accurate remaining time.
- [x] Separate ending a focus session from marking its goal complete (no implicit goal changes).
- [x] Adapt existing database migration checks and add **two focused domain cases**, keeping **16/20** total.
- [ ] Verify v4→v5 upgrade, navigation, modal safe areas, pause/resume and process restart on Android emulator.
- [ ] Provide native notifications and optional foreground-service integration only after real device testing; there is no background alert or sound in this slice.
- [ ] Record completed focus-session history after checking what Insights should count as a meaningful session.

**Engineering self-critique:** This root-level dock corrects page isolation, but it is not yet a native tab navigator with per-tab state preservation. The timer is accurate across pauses/background because it stores its deadline, but the JavaScript rendering loop is not guaranteed to run while Android suspends the app. Do not claim notifications, a background service, or an enforced stopping alarm. Color, typography and touch targets still need screenshot-based QA; CI is not UI acceptance.

## Next three actions

1. Upgrade an existing populated v4 Android install to v5 without reinstalling; start a 15-minute Timebox from Calendar, switch to Horizons and Boards, and force-close/reopen.
2. Test pause/resume and automatic deadline expiry after backgrounding the app, modal safe areas and global bottom-dock navigation in both themes.
3. Resolve real interaction findings before adding session history, background notifications, Insights or drag-and-drop.

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

| 2026-10-14 | Introduced root-level mobile dock and local, deadline-based persistent Timebox focus sessions (SQLite v5). | Commit `0c66e33`: 16/20 domain tests, npm ci, Expo alignment, TypeScript and Android Metro passed; emulator focus lifecycle still unverified. |

## Focus reliability and Insights — SQLite v6 (2026-10-14)

- [x] Add an additive v5→v6 migration: persistent local focus-session history with immutable title snapshots.
- [x] Track active time across pause/resume without counting paused intervals or overrunning the Timebox limit.
- [x] Transactionally record `completed`, `stopped`, or `replaced` outcomes on finalization.
- [x] Snapshot the current session before deleting its Timebox and disallow editing an actively running Timebox.
- [x] Add Insights as a fourth global navigation destination with all-time totals, a seven-day focus chart and recent session history.
- [x] Keep automated test budget at **17/20**; old database migrations still covered.
- [ ] Verify upgrades from a populated SQLite v5 app (both running and paused session states) and Force Stop/relaunch on Android.
- [ ] Native reminder/expiry notification permission flows remain intentionally unimplemented pending real device verification.

**Metric definition:** Insights counts finalized sessions only. A session reaches `completed` when its actual countdown expires and is finalized; this does not mark the goal completed. Existing v5 sessions preserve prior active seconds through their saved remaining time; the original wall-clock start time across earlier pauses can only be estimated.

## Calendar correctness and weekly planning — 2026-10-14

- [x] Show blocks that **overlap** the selected local day instead of only those starting inside it; continuing overnight blocks now appear on both relevant days.
- [x] Clip overnight blocks to the current day's visible 00:00–24:00 timeline geometry; display the original time range and continuing marker in List.
- [x] Explicit "End on next day" choice in the editor; verify local date/time, DST spring gaps and duplicated fall-back clock times instead of silently coercing them.
- [x] Add a seven-day overview with time budgets, linked goal previews and overlap warnings; select a day to open its actual timeline.
- [x] Add **two** focused time-boundary tests, reaching **19/20** total. No new third-party dependency or schema change.
- [ ] Test the existing-data calendar screens on an Android device through midnight and DST changes in different configured time zones.
- [ ] Drag/resize gestures, month navigation, recurrence and local notifications still require separate implementation and verification.

## Monthly overview — source implemented (2026-10-14)

- [x] Access the calendar month grid from the visible date heading without adding a fifth root navigation destination or hiding the daily timeline.
- [x] Browse adjacent months with month-correct arrows and open any date straight into its day timeline.
- [x] Aggregate actual overlapping month-day windows, display per-day activity bars and summarize planned hours/active days.
- [x] Reuse the existing `time_blocks` data and v6 schema; no new package or additional automated test.
- [ ] Verify month/year boundaries, small-screen grids and navigation return states in Android emulator.

## Cross-screen capture: Calendar → Goals (2026-10-14)

- [x] Reuse the full existing Goal Editor directly from Calendar; a goal can be created without navigating away.
- [x] Empty Calendar quick-add opens goal creation instead of forcing a navigation to Horizons.
- [x] After saving the goal, offer a direct "Schedule time" action with its new stable goal ID preselected.
- [x] Refresh the same shared SQLite goal collection; no duplicated goal entities, package additions or new schema version.
- [ ] Confirm Android modal transition and small-screen keyboard behavior on-device.

## Day timeline time-scale controls (2026-10-14)

- [x] Add three accessible time-density levels (56 / 76 / 104 pixels per hour) to the daily canvas without extra dependencies.
- [x] Keep event placement, work-hour background, time rulers and Now line on the same adjustable scale.
- [x] Preserve the user's approximate viewport time when changing zoom instead of snapping back to the morning.
- [ ] Verify actual Android scroll position, 15-minute cards, touch-target overlap and accessibility at each zoom level.

## Calendar lifecycle hardening (2026-10-14)
- [x] Refresh the selected-day "Today" affordance across midnight and on return from background.
- [x] Refresh the live Now marker on Android foreground resume without trusting JS background ticks.
- [ ] Verify midnight rollover and foreground return with device-clock simulation on Android.

## Reliability review — October 14 follow-up

- [x] Load the full six/five-week month grid, including real scheduled blocks on grey days belonging to adjacent months.
- [x] Avoid overlapping touch targets for adjacent short Timeblocks at compact Timeline zoom by assigning lanes according to *rendered* height, not only chronological collisions.
- [x] Fix the 23:00 quick-add default: one full hour ending at 00:00 next day, not an arbitrary 59 minutes.
- [x] Consume Calendar goal deep-links so the same Goal can be opened for scheduling repeatedly.
- [x] Guard Calendar writes synchronously against duplicate tap-created blocks/goals.
- [x] Reject overlapping Focus mutations instead of quietly resolving a skipped Start/Pause/Finish operation as if it succeeded.
- [ ] Real-device Android validation is still required for gesture targets, saved SQLite lifecycle, permission prompts and modal transitions.
- [ ] Local background-expiry notifications remain unavailable until `expo-notifications` is integrated and Android permissions and exact delivery behavior are verified with a development build.

## Consistency audit, post-v6
- [x] Month grid loads neighboring-day schedules consistently with the visible calendar cells; monthly totals exclude those neighboring days.
- [x] Correct daily "goals done" semantics: each completed Goal is counted once regardless of the number of its scheduled blocks.
- [x] Guard against fast duplicate writes and falsely successful overlapping Focus actions.
- [x] 23:00 quick-create generates a genuine overnight 60-minute block.
- [x] Use visual collision lanes at dense zoom so adjacent 15-minute blocks do not obscure one another.
- [x] On 23/25-hour DST days, warn that the Timeline displays wall-clock geometry and link directly to List for unambiguous exact timestamps.
- [x] Extend two existing calendar/domain tests without exceeding the 20-test policy.
- [ ] Verify device focus/navigation/keyboard/notification behaviors: GitHub Actions cannot substitute for physical Android acceptance.

## Source audit and correction — 2026-10-15

- [x] Timebox editor does not silently start the *old* saved Timebox while unsaved edits are visible. Save before Start; disable editing the actively focusing Timebox with an explicit explanation.
- [x] Continue an overnight block with only the **visible local-day segment** in the Day Timeline. The preceding day's end is labeled 24:00, not 00:00 of the next day.
- [x] Add domain assertions for overnight segment labels without inflating the fixed 20-test suite.
- [x] Show a recoverable retry prompt if Focus persistence cannot be read rather than quietly hiding the timer.
- [x] Refresh Insights seven-day window after local midnight and after returning from the background.
- [ ] **Not done:** Android notification scheduling: Expo SDK 57 requires a locked `expo-notifications` install and platform permissions. Do not claim background expiry alerts from JavaScript countdowns.
- [ ] **Not done:** hands-on Android interaction/regression pass and notification/exact-alarm grant/deny scenarios. CI only proves test, type and bundle integrity.

## Native Focus expiry reminders — source implementation (SDK 57)

- [x] Lock the SDK-compatible `expo-notifications` dependency with npm in isolated CI rather than editing the lockfile by hand.
- [x] Configure an Android Focus channel and a user-controlled `SCHEDULE_EXACT_ALARM` manifest permission.
- [x] Request visible notification permission only when the user initiates Focus. A refusal **never** stops the timer.
- [x] Schedule one device-owned local reminder for a running session; deduplicate across reloads and force-close recovery.
- [x] Cancel stale reminders on Pause, Stop, Replace, deletion and expiry; reschedule after Resume using the persisted deadline.
- [x] Keep the lock-screen message generic so private goal titles are never displayed in reminder previews.
- [x] Surface notification/alarms configuration problems as explicit non-fatal warnings in the Focus UI.
- [ ] Android 13/14/15 physical-device acceptance: test notification denial, special alarm access denied/granted, notification delivery after app force-stop/idle, resume and replacement. **Exact delivery is not guaranteed solely by a successful JS bundle.**
- [ ] Play policy review for exact-alarm permission before store release. If approval is not appropriate, implement an inexact fallback and update the UX.


## Personal planning refinement — 2026-10-15

Target: implement the approved compact personal-planning direction and real offline workflows. This is not an M6/release completion claim.

- [x] Replace the oversized Horizons introduction with a compact Plan header, labeled Plan / Overview / Inbox views and inline capture.
- [x] Keep seven planning horizons; simplify empty overview rows and preserve canonical goal details and hierarchy.
- [x] Add local search across titles, notes and parent names; consume goal deep links so the same goal can be opened again.
- [x] Add non-destructive v6→v7 migration: Inbox state, optional deadline, recurrence metadata and actual completion/reopen history.
- [x] Keep startup migration on the already-open SQLite connection; the previous exclusive second connection reproduced a startup lock during the native upgrade.
- [x] Generate exactly one next recurring occurrence per completed source, including board memberships; retain original monthly/yearly day anchors.
- [x] Add weekly Review with recorded completion count, actual Focus history and explicit Keep / Move / Archive decisions for previous-period open goals.
- [x] Make Month an explicit Calendar view and offer scheduling for daily goals without a time reservation; reduce repeated calendar explanation/header chrome.
- [x] Fix the native month grid wrapping into six columns: render explicit seven-day rows, and use readable accent foregrounds for selected dates in Month/Week.
- [x] Add file export/share and file-picker restore, strict snapshot validation and all-or-nothing merge of missing IDs; no current local record is overwritten.
- [x] Fix foreground contrast on accent surfaces in light/dark; explicitly configure the Expo SystemUI plugin after native inspection exposed a forced-light resource default.
- [x] Keep the automated suite at 20 focused cases, replacing redundant migration mocks with a real SQLite planning/restore workflow.
- [x] Pass TypeScript and Expo dependency compatibility checks; build and install the Android debug APK with native backup modules.
- [x] On Android, verify schema v7 and run actual Expo SQLite recurrence + backup/restore (including duplicate restore and corrupt-reference rejection).
- [x] Sample Android inline capture, completion, Inbox, Overview and Review; open the native export share sheet and file-picker restore preview. Keep screenshots and probe results outside the public repository.
- [x] Verify native automatic dark theme after rebuilding with SystemUI. Finish file-picker restore through success: one deliberately missing QA goal restored; repeated import adds zero records and preserves six existing goals.
- [ ] Full IME/keyboard matrix remains open; emulator samples do not establish physical-device keyboard acceptance.
- [ ] Release-build startup profile, physical-device alerts/idle behavior, TalkBack, large text and native RTL/Jalali remain unverified.
- [ ] Widgets, incoming share capture, timeline drag/resize and external calendar sync remain separate platform work.

Next three actions after this slice: (1) physical Android lifecycle/notification and accessibility acceptance; (2) decide and implement localization/calendar preferences; (3) implement widget/share capture against the stable capture workflow.

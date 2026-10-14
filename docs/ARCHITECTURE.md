# Architecture (proposed, not yet fully implemented)

Status: **Goal schema v2 with an in-place v1 migration and Horizons UI committed; upgrade/UX not yet verified on Android.** Other entity boundaries remain a draft.

## Stack

- React Native with Expo SDK 57, Expo Router, TypeScript strict mode.
- Android as the first verification target; compatible iOS layout from the beginning.
- Expo SQLite for local persisted data; transactional v1 → v2 migration, goal CRUD, Archive/Restore and ordering implemented. Drizzle is not installed.
- Reanimated / Gesture Handler only when complex interaction work begins; basic interactions currently use Pressable.
- Kotlin/Swift extensions only for capabilities that cannot be implemented reliably through maintained Expo modules.
- No backend, user accounts, network dependency, or telemetry requirement in the initial application.

## Boundaries

```
app/                Expo Router entry points and navigation only
src/theme/          Design tokens
src/features/       Horizons view and goal sheets
src/domain/         Pure period keys, navigation and goal input validation
src/storage/        SQLite migration v1 and goal repository
src/platform/       Notifications, widgets, file sharing (when added)
docs/               Public-safe project documentation and progress tracker
```

Route files should be thin. UI components must not issue raw SQL. Domain functions should be testable without booting the app.

## Implemented data model (v2)

`goals` stores stable UUID, title, notes, horizon, period key, optional parent ID, completion flag and timestamps. Parent references use `ON DELETE SET NULL`; deleting a parent keeps descendants as independent goals.

Schema v2 adds `archived_at` (nullable timestamp) and `sort_rank` (integer) to existing goals with SQLite ALTER TABLE. The current design uses a single placement per goal. Multi-placement, time blocks, boards, recurring instances, archive and recovery are **not implemented yet**. Do not confuse this vertical slice with the final schema.

## Draft data concepts

| Entity | Purpose |
| --- | --- |
| Item | Stable ID, type, title, content metadata, status and timestamps |
| ItemRelation | Directed parent/child relationships; no cycles |
| HorizonPlacement | An item placed in a time horizon, period key and sort order |
| Board / BoardEntry | A customizable view and reference to existing items |
| TimeBlock | Specific planned start/end instants |
| RecurrenceRule | Local recurrence definition with zone and exceptions |
| OccurrenceState | Completion/skips for each recurrence occurrence |
| Note / Attachment | Rich content and local file metadata |
| ActivityEvent | Minimal audit history necessary for insights |
| Preferences | Theme, language, calendar presentation, start of week |

**Never equate horizon, deadline and time block.** An item planned for a month can have no exact deadline. One item may have multiple presentations without copied records.

## Time and calendar correctness

- Use unique IDs; persist UTC instants for timed events and an explicit IANA time zone where relevant.
- Store calendar dates separately when the concept is a floating all-day date.
- Treat week start and display calendar as configurable; Jalali is a presentation/calendar conversion, not a rewrite of stored timestamps.
- Explicitly test DST gaps/overlaps, leap days, week/year rollover and long-horizon calculations.
- A recurrence rule and an individual occurrence are separate records/concepts.

## Local-first integrity

- Transactions for multi-record changes and migrations.
- Foreign-key integrity; no orphaned relationships.
- Non-destructive upgrades; backup format has schema version.
- Conflict resolution is deferred because there is no sync layer.
- Avoid premature interfaces/classes without at least two concrete users.

## Dependency policy

Prefer platform/Expo primitives; introduce a third-party library only after checking maintenance, compatibility, license and the device-level behavior we need. Record substantive dependencies in [DECISIONS.md](DECISIONS.md).

## Validation plan

1. Test pure domain rules with deterministic date/time fixtures.
2. Test persistence across process restarts and upgrades.
3. Validate touch/drag interactions on midrange Android hardware.
4. Only then scale the feature to notes, boards, and calendar.

## Horizons 2.0 work-in-progress

- The editor can select a parent across horizons and can change the planning period without moving the item through another screen.
- The schema is v2: one stored horizon placement per goal with archive state and ordering. Multi-placement still is not implemented.
- Goal editing uses an exclusive transaction with recursive descendant inspection to reject cyclic parent changes.
- The available-parent filter is pure domain logic; it helps UX but database validation remains mandatory.
- Nested detail navigation is UI state (back stack); there are no duplicate records.

## Archive & sorting semantics

Archiving an active parent also archives its currently active descendants as one unit. Restoring that unit does not restore descendants archived earlier with different timestamps. A child cannot be restored while its parent remains archived. The archive list shows recoverable roots, keeping a single hierarchy rather than duplicate records. Manual Move Up/Down applies within the same period and completion group and persists ranks in an exclusive SQLite transaction. This is deliberately simpler than drag-and-drop.

## Boards / schema v3

- Additive migration to `boards` and `board_goals` tables; do not drop or reset goals.
- Board membership is a **many-to-many reference** with composite primary key `(board_id, goal_id)`. A goal may belong to several boards; each board may reference many goals.
- `ON DELETE CASCADE` on board deletion removes membership only; deleting a board never removes the goal itself.
- Archived goals are hidden in board views and excluded from active board counts, but their memberships remain until the underlying goal is permanently deleted.
- Board read models provide counts and completion from the same saved goals; no synchronized copies.
- Route `/boards` opens the workspace; opening a board item navigates to the canonical goal detail on the Horizons route.
- SQLite migration v3 preserves the existing v2 schema and is executed in the current exclusive transaction. Android upgrade verification remains mandatory.

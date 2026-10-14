# Architecture (proposed, not yet fully implemented)

Status: **Baseline decisions accepted; persistence schema is a draft.** Confirm entity boundaries during M2, after the first vertical slice.

## Stack

- React Native with Expo SDK 57, Expo Router, TypeScript strict mode.
- Android as the first verification target; compatible iOS layout from the beginning.
- SQLite for local persisted data, with migrations when storage work begins.
- Reanimated / Gesture Handler only when complex interaction work begins.
- Kotlin/Swift extensions only for capabilities that cannot be implemented reliably through maintained Expo modules.
- No backend, user accounts, network dependency, or telemetry requirement in the initial application.

## Boundaries

\`\`\`
app/                Expo Router entry points and navigation only
src/theme/          Design tokens
src/features/       Feature-specific UI and controllers (when added)
src/domain/         Pure domain rules: item hierarchy, scheduling, horizon logic
src/storage/        SQLite repositories and migrations (when added)
src/platform/       Notifications, widgets, file sharing (when added)
docs/               Public-safe project documentation and progress tracker
\`\`\`

Route files should be thin. UI components must not issue raw SQL. Domain functions should be testable without booting the app.

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

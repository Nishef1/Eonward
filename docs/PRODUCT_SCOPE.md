# Product scope

Eonward is an offline-first personal planning application for mobile. The intent is a coherent experience across short and long planning horizons, not a collection of unrelated feature demos.

## Core workflows

1. Capture an item with minimal taps.
2. Organize items by Day, Week, Month, Quarter, Year, Decade or Life.
3. Nest objectives while preserving unique identity and clear navigation.
4. View the same underlying item in horizon, board and calendar contexts.
5. Complete, reschedule, annotate, or revisit plans without losing history.
6. Review progress over time.
7. Export and restore personal data without depending on an account.

## Capability map

| Capability | Initial milestone | Notes |
| --- | --- | --- |
| Navigation, states and appearance | M1 | Phone-first, accessible light/dark |
| Goal hierarchy and horizons | M2 | Core value; seven canonical horizons |
| Boards and ordering | M3 | References, not duplicate item records |
| Calendar and time blocks | M3 | Do not confuse due dates with blocks |
| Notes, recurring goals and habits | M4 | Rich editor choice deferred |
| Templates, guided plans and insights | M4 | Personal and offline |
| Notifications, widgets and quick-add | M5 | Native integration where necessary |
| Backup/restore | M5 | Must precede release |
| Localization and Jalali presentation | M5 | Logical storage separate from display |
| Server, sync and team collaboration | Deferred | No placeholder login screens |

## Non-functional requirements

- Offline by default; no account required to use core features.
- Data remains intact across restarts, migrations and ordinary device lifecycle events.
- Predictable navigation and no unresponsive gesture-only critical actions.
- Clear permission requests, minimum possible privileges.
- Reusable design components with text scaling and contrast checks.
- Avoid silent duplicates, orphaned hierarchy nodes and ambiguous time semantics.

## Out of scope for the bootstrap

No cloud architecture, backend services, auth, AI integrations, billing, team permissions, or production launch configuration. Do not add them speculatively.

## Completion standard

A capability is complete only when: functional UI, persistence, error/empty states, accessibility pathway, automated checks for its core logic and device verification all exist.

# Capability inventory

Last reviewed: 2026-10-15. This document records implementation and its evidence, not release readiness.

| Area | Current implementation | Verification boundary / remaining work |
| --- | --- | --- |
| Seven horizons and hierarchy | Day through Life, editable parent path, period navigation, archive/restore | Native populated hierarchy and large-text acceptance still needed |
| Plan and overview | Compact labeled navigation, seven compact overview rows, readable completed goals | Android render sampled; physical-device accessibility remains open |
| Fast capture | Inline title-only capture in selected period or Inbox; synchronous duplicate-write guard | Keyboard and rapid-input device checks recorded in ROADMAP |
| Inbox | Explicit unscheduled state; no invented planning date | Board and detail views identify Inbox; schedule by editing its planning details |
| Search | Local cross-horizon title, note and parent-name search; Persian yeh/kaf normalization | Active goals only; no attachment/full-text indexing |
| Deadlines | Optional civil date independent of planning horizon and time blocks | No deadline notification or automatic rescheduling |
| Recurring steps | Daily, weekly, monthly, yearly; next occurrence after completion; stable month/year anchor | Repeats the step and board memberships, not children, deadlines or calendar reservations; no background generation |
| Boards | Multi-membership references; create/edit/link/unlink and shared completion | Custom sections, board ordering and drag still deferred |
| Calendar | Day/week/month/list, explicit view selector, untimed daily goals, overlapping and overnight blocks | Editor remains the accessible move/resize path; drag and external calendar sync are not implemented |
| Focus | Persistent session, pause/resume, global mini-bar, actual elapsed history, local expiry alert | Exact delivery, denied permissions, idle and OEM power restrictions require physical-device acceptance |
| Weekly review | Recorded completed-step count, focus rhythm, previous-period Keep / Move / Archive | No synthetic historical counts; pre-v7 completions are not backfilled; no automatic rollover |
| Backup and restore | Versioned JSON export to native share sheet, native file picker, atomic merge of missing IDs | Existing records keep local values; running timers are excluded; encrypted backups and older future formats need a separate contract |
| Appearance | Existing light/dark identity, semantic foreground on accent, system theme integration | Native large text, TalkBack and reduced-motion regression still open |
| Localization / Jalali | Not implemented | Current UI remains English; do not claim native RTL or Persian-calendar acceptance |
| Widgets / share-to-capture | Not implemented | Requires separately implemented platform integration and lifecycle testing |
| Accounts / sync / teams / billing | Deferred by product scope | No placeholder login, backend or monetization added |

Automated coverage remains within the 20-case policy. Real SQLite coverage now exercises completion history, recurrence idempotency, parent integrity, archive recovery and backup round trips, with a Node-only UUID boundary adapter. Native evidence and unresolved acceptance items are tracked in ROADMAP.md.

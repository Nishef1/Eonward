# Capability inventory

Last reviewed: 2026-10-15. This document records implementation and its evidence, not release readiness.

| Area | Current implementation | Verification boundary / remaining work |
| --- | --- | --- |
| Seven horizons and hierarchy | Day through Life, editable parent path, period navigation, archive/restore | Native populated hierarchy and large-text acceptance still needed |
| Smaller steps | Parent context, undated child capture, title/notes first, collapsible planning, return to original detail after save/cancel | Shared editor has a stable frame and bounded note field; full keyboard/platform matrix remains open |
| Plan and horizons | Studio surfaces and depth, compact horizon picker, seven-scale rail, labeled segmented views and vector dock | Populated Android renders and 130% Plan/horizon picker sampled; user aesthetic acceptance and physical-device accessibility remain open |
| Fast capture | Inline title-only capture, draft continuity into Details, matching-draft clear after save; synchronous duplicate-write guard | Keyboard and rapid-input device checks recorded in ROADMAP |
| Inbox / replanning | Explicit unscheduled state; organizer shortcuts for Today, Tomorrow, This week and Inbox with destination navigation | Atomic planning-only update preserves deadline, reservations and recurrence anchor; repeating goals expose daily shortcuts only |
| Search | Local cross-horizon title, note and parent-name search; Persian yeh/kaf normalization | Active goals only; no attachment/full-text indexing |
| Deadlines | Optional civil date independent of planning horizon and time blocks | No deadline notification or automatic rescheduling |
| Recurring steps | Daily, weekly, monthly, yearly; next occurrence after completion; stable month/year anchor | Repeats the step and board memberships, not children, deadlines or calendar reservations; no background generation |
| Boards | Multi-membership references; create/edit/link/unlink and shared completion | Custom sections, board ordering and drag still deferred |
| Calendar / Living Timeline | Day/week/month/list, native date jump, visual overlap and overnight blocks, explicit protected/flexible reservations, measured Focus progress per saved Timebox | Day timeline is a visual wall clock, not proof that planned work happened; new UI requires Android/iOS interaction QA; DST day recovery is deliberately unavailable |
| Ripple Preview / Recovery | Local deterministic reflow after a breathing buffer or 15/30-minute extension, protected/flexible policy, before/after preview, atomic guarded apply and reversible last replan | Only today's opted-in blocks, no auto-move across midnight; no AI, no background changes; actual device/accessibility review open |
| Goal Impact Lens / Time Architecture | Schema-v8 stable goal/block attribution for new Focus history; current-parent path and weekly goal budgets show planned vs measured minutes, including descendant rollups | Old records have no goal attribution, no fabricated backfill; parent rollups follow today's hierarchy; planned overlapping blocks may count separately |
| Focus | 15/25/50-minute detail start and direct 25-minute organizer shortcut, atomic reservation/session, pause/resume, mini-bar, actual history and local expiry alert | One-minute background alert sampled on emulator with exact access; denied-exact fallback timing, locked idle and OEM restrictions remain open |
| Weekly review | Recorded completed-step count, focus rhythm, previous-period Keep / Move / Archive | No synthetic historical counts; pre-v7 completions are not backfilled; no automatic rollover |
| Backup and restore | Version-2 JSON export with flexible flags, attribution and time budgets; strict version-1 import compatibility; native picker and atomic merge | Existing records preserve local values; active timer and one-step undo checkpoint are intentionally excluded; native v1→v2 restore acceptance open |
| Appearance and entry | Neutral light/graphite dark, restrained depth, consistent vectors, native date/time pickers, keyboard avoidance, dirty goal/time draft protection | Full Gboard quick capture/goal editor and 130% Plan sampled; full form, TalkBack/VoiceOver and reduced-motion matrix still open |
| Build and recovery | Android/iOS profiles, isolated standalone QA, startup Retry and safe native-link recovery | Android QA APK is debug-certificate signed; no native iOS build, store signing or publication approval |
| Localization / Jalali | Not implemented | Current UI remains English; do not claim native RTL or Persian-calendar acceptance |
| Widgets / share-to-capture | Not implemented | Requires separately implemented platform integration and lifecycle testing |
| Accounts / sync / teams / billing | Deferred by product scope | No placeholder login, backend or monetization added |

Automated coverage remains within the 20-case policy. Real SQLite coverage now exercises recovery apply/undo, completion history, recurrence idempotency, weekly budget persistence, v1/v2 backups, parent integrity, archive recovery and backup round trips, with a Node-only UUID boundary adapter. Native evidence and unresolved acceptance items are tracked in ROADMAP.md.

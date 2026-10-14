# Capability inventory

Public, implementation-level capability status. This is a neutral tracking document, not a product launch page or a competitor cloning specification.

Legend:
- **Implemented in source**: committed functionality; device acceptance still outstanding.
- **Partial**: usable foundation without full workflows.
- **Planned**: not built. No mock screen may be marked complete.

| Area | Status | Limitations / next work |
| --- | --- | --- |
| Seven planning horizons | Implemented in source | Period navigation, hierarchy and persistence need end-to-end Android QA |
| Focus / Perspective overview | Implemented in source | Multi-placement and advanced views not available |
| Nested goals / parent relationships | Implemented in source | Deep hierarchy and rescheduling require device QA |
| Goal editing, completion and notes | Partial | Plain-text notes, no rich editor or attachments |
| Archive / Restore | Implemented in source | Validate upgrades and child restoration on real device |
| Manual goal order | Partial | Up/down only; no drag, sorting filters or custom board order |
| **Boards (local, multi-membership)** | **Implemented in source (M3 first slice)** | Create/edit/delete board; create a new goal inside a board atomically; link/unlink existing goals; completion and open original goal; device QA pending |
| Tags and saved filters | Planned | Requires clear search/filter UX and schema design |
| Calendar | Partial | Daily timeline and agenda of real scheduled goal blocks, editing/day navigation; week/month grid, drag, reminders, timezone transitions and release QA pending |
| Time blocking and Timeboxing | Partial | Multiple goal-linked local-day blocks, 24h times, fixed-limit mode and optional outcome; no focus timer, reminders, cross-midnight blocks or DST fall-back disambiguation yet |
| Recurrence and habits | Planned | Needs rule/occurrence model and DST correctness |
| Templates | Planned | Requires versioned reusable blueprint/clone behavior |
| Guided step sequences | Planned | Needs progress/step state and explicit data model |
| Rich text, links and attachments | Planned | Editor UX, local file storage and backup implications |
| Local search | Planned | Should search across goals, notes and boards |
| Insights / periodic review | Planned | Depends on reliable activity history |
| Offline backups / restore | Planned | Blocking release gate; preserve original relationships |
| Native reminders and widgets | Planned | Verify permissions, power management and refresh behavior |
| Localization / RTL / alternate calendar | Planned | Display must not corrupt stored dates |
| Accounts, realtime sync, collaboration | Deferred | No server until local mobile experience is stable |

**Next vertical slice:** verify v4 scheduling on Android, add due dates and a robust Timebox focus/stop workflow; then consider week view, drag-to-reschedule and tags/search.

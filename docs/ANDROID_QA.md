# Android acceptance walk-through

Status: **NOT YET VERIFIED** for the latest Horizons 2.0 changes. These are manual verification steps for the running emulator or physical phone.

## Core goal flow

- [ ] Create a Life goal.
- [ ] Open its details, add a Year next step, open that step, then add a Month next step.
- [ ] Use Android Back to return to each parent in sequence; the close action exits the detail sheet.
- [ ] Edit the Month step's title, notes, parent and horizon; verify the target period.
- [ ] Reopen the parent details and confirm the child list accurately reflects parent changes.
- [ ] Reassign a child to another parent. Try to choose its own descendant; the picker should exclude it.
- [ ] Complete and reopen a child independently, without toggling the parent.
- [ ] Delete a parent with children; children must remain saved and independent.

## Planning date checks

- [ ] Create a Day goal with exact date 2026-10-14; find it on that day.
- [ ] Reject an impossible date such as 2025-02-29.
- [ ] Use previous/next on Week at the 2020/2021 year boundary.
- [ ] Edit a goal from a past period without silently moving it to today.
- [ ] Move a saved item from Week to Quarter and verify it appears in the intended period.
- [ ] Force-close and relaunch; confirm all edits and parent links remain intact.

## Visual/system checks

- [ ] Screenshot top system/status bar and bottom navigation area (Android API 35).
- [ ] Confirm the editor's Save control remains reachable with the keyboard open.
- [ ] Check empty state with zero goals and a populated list with 20+ goals.
- [ ] Test dark theme, large font size, screen reader focus and touch target sizes.
- [ ] Verify dialogs do not appear underneath status/navigation bars.

## Evidence

Record screenshots, reproduction steps and platform version before checking a box. Do not commit private goal content to this public repository.

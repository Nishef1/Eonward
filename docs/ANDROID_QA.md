# Android acceptance walk-through

Status: **NOT YET VERIFIED** for the latest Horizons 2.0 changes. These are manual verification steps for the running emulator or physical phone.

## Perspective overview (new; unverified)

- [ ] Switch Focus → Perspective → Focus without navigation or data errors.
- [ ] Verify all seven periods show correct counts and relevant goal previews.
- [ ] Add a goal from a Perspective card; confirm the new goal has that horizon.
- [ ] Open a preview goal and return to its details; tap a horizon card to focus.
- [ ] Move a goal between horizons; ensure it appears once in the correct period.
- [ ] Check empty-state and 20+ goal list behavior, dark mode, large text and touch sizes.

## Goal Path and moved-item visibility (new; device QA pending)

- [ ] Create a Life → Year → Month → Day chain and open the Day goal from Focus.
- [ ] Verify each ancestor chip opens the original goal, root first; no phantom links.
- [ ] Confirm Focus/Perspective card subtitles show the immediate parent.
- [ ] Move an existing goal to another period and confirm Focus follows its saved destination.
- [ ] Rapidly open siblings and confirm detail content and ancestor chips match the selected ID.
- [ ] Restart the app and verify links, completion and saved period have persisted.

## Core goal flow

- [ ] Create a Life goal.
- [ ] Open its details, add a Year next step, open that step, then add a Month next step.
- [ ] Use Android Back to return to each parent in sequence; the close action exits the detail sheet.
- [ ] Edit the Month step's title, notes, parent and horizon; verify the target period.
- [ ] Reopen the parent details and confirm the child list accurately reflects parent changes.
- [ ] Reassign a child to another parent. Try to choose its own descendant; the picker should exclude it.
- [ ] Complete and reopen a child independently, without toggling the parent.
- [ ] Archive a parent with children; all active descendants disappear from Focus. Restoring the parent restores only the descendants archived with it.

## Archive, migration and manual ordering — v2

- [ ] With an existing populated v1 database, update to v2 without losing IDs, titles, links or completed flags.
- [ ] Move a goal up/down using its ⋯ menu and force-close/relaunch: the order stays the same.
- [ ] A completed goal cannot be reordered across the incomplete section; controls should not offer ineffective moves.
- [ ] Archive a goal via Details or ⋯, confirm it disappears from Focus/Perspective and appears in Archive.
- [ ] Restore an archived goal and its newly archived descendants with the original IDs and links.
- [ ] Archive one child separately, then archive and restore its parent: the separately archived child must remain archived.
- [ ] Confirm archived goals cannot be selected as new parents and restored records remain editable.
- [ ] Use archive with many goals and verify smooth scrolling and no overlapping action controls.

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

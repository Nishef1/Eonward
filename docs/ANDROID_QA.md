# Android acceptance: concise critical path

**Status: not yet confirmed after UI refinements.** Initial emulator screenshots (2026-10-14) prove Focus, Perspective, Archive and an empty Create Goal form render. They do not prove saved data or keyboard behavior.

These twelve **manual checks** are acceptance evidence, not additional automated tests. Do not create a new regression test for each checkbox. Record a screenshot or an exact reproduction only when a check fails.

- [ ] **Calendar/timebox cross-screen and visual canvas:** On a populated v4 database, schedule from Horizons/Boards and use the week strip. With three overlapping entries and one 15-minute timebox, verify exact start/end positions, readable List fallback, current-time marker and Jump to Now; tap an empty 14:00 hour for a prefilled block. Edit, remove and reopen after force-close in light/dark mode. Check long-press to open the original goal.
 Upgrade a populated v3 install to v4 without reset; schedule a goal from Horizons and Boards, switch Time Block/Timebox, verify day timeline/agenda and next-time labels, edit/reschedule/unschedule it, complete the goal in either view and reopen after force-close. Check overlapping blocks and clock inputs, including a DST transition.
- [ ] **Boards end-to-end:** On a populated v2 install create/edit/delete a board, create a goal directly within a board, add another existing goal to two boards, toggle completion, open the original detail, remove a membership without removing the goal, archive the goal and verify active board counts; restart the app and confirm everything persists.
- [ ] **Keyboard and safe area:** Create Goal with keyboard visible, scroll through its fields and tap fixed Save; verify system navigation never covers it. Open/close Details and Organize sheets.
- [ ] **Single first action:** Focus empty screen exposes New goal without duplicate clipped CTAs; Perspective shows per-horizon Add without a sticky bottom footer.
- [ ] **End-to-end goal:** Create, edit, complete and reopen a goal; close and relaunch Eonward; the item, its notes, and status persist.
- [ ] **Seven horizons:** Switch Focus/Perspective, add from a Horizon card, change its period, find exactly one saved item at the intended destination.
- [ ] **Hierarchy:** Create Life → Year → Month → Day, navigate Goal Path, reparent safely, and reject cycles.
- [ ] **Archive lifecycle:** Archive a parent and active children; separately archive a child before the parent and ensure that child stays archived after the parent is restored.
- [ ] **Ordering:** Use Move Up/Down in Organize, verify no invalid moves between completed/open groups, and verify order after restart.
- [ ] **Existing data migration:** Upgrade a populated v1 install to v2 without uninstalling or resetting the emulator; preserve goal IDs, notes and relationships.
- [ ] **Screen variants:** Review light/dark theme, large text, small screen and top/bottom system bars, including the three modal sheets.
- [ ] **Practical scale:** Create ~20 goals and navigate, edit, archive and restore without rendering or interaction failures.

Do not put personal goal content or private screenshots into the public repository. Use synthetic names for evidence.

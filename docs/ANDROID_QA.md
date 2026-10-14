# Android acceptance: concise critical path

**Status: not yet confirmed after UI refinements.** Initial emulator screenshots (2026-10-14) prove Focus, Perspective, Archive and an empty Create Goal form render. They do not prove saved data or keyboard behavior.

These twelve **manual checks** are acceptance evidence, not additional automated tests. Do not create a new regression test for each checkbox. Record a screenshot or an exact reproduction only when a check fails.

- [ ] **Focus history and Insights (v6):** Upgrade populated v5 without uninstalling, including an already paused timer. Stop early, replace another timer, let a third expire and finalize, then delete an active Timebox. Ensure each finalized entry appears exactly once in Insights, elapsed time excludes pauses, active Timebox edits are rejected and results persist after force-close.
- [ ] **Persistent Focus Timer and app dock (v5):** Upgrade a populated v4 app to v5 without uninstalling. Start a 15-minute Timebox from Calendar List and its Edit sheet; use Horizons/Calendar/Boards bottom navigation while the mini-timer stays visible. Pause for two minutes, resume, background/foreground the app, and force-close/reopen; confirm remaining time is correct. On expiry, verify Time's up UI, finish the session, and confirm goals remain unmodified. Verify small-screen keyboard and both themes.
- [ ] **Calendar goal capture:** From an empty database use Calendar + to create a Day goal, then choose Schedule time. Confirm exactly one goal in Horizons and the corresponding calendar Timebox. Repeat from the Goal+ action with populated goals; test modal transitions and keyboard.
- [ ] **Monthly calendar:** Tap the date heading to open Month, page across December/January, verify day bars and monthly totals, then tap a day. Test 35- and 42-cell months on a small screen in dark and light mode.
- [ ] **Midnight / resume:** Keep Calendar open across midnight, then background and reopen; confirm Today dots, Now marker and correct timeline controls without a forced restart.
- [ ] **Timeline zoom:** Zoom in/out through all three levels while scrolled to the afternoon. Ensure labels, colored blocks, Now marker, empty-hour tap targets and content position stay aligned on Android.
- [ ] **Overnight and weekly calendar:** Create a block 23:30→00:30 with Next day enabled; confirm it renders in both days and weekly overview, with correct half-hour height and a continued label. Confirm invalid same-day ordering and spring/fall DST inputs are rejected. Verify overlap warning and weekly-to-daily navigation after restarting.
- [ ] **Calendar/timebox cross-screen and visual canvas:** Upgrade a populated v3 install to v4 without reset; schedule from Horizons/Boards and use the week strip. With three overlapping entries and one 15-minute timebox, verify exact start/end positions, readable List fallback, current-time marker and Jump to Now; tap an empty 14:00 hour for a prefilled block. Edit, remove and reopen after force-close in light/dark mode. Check long-press to open the original goal.
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

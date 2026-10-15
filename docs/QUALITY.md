# Acceptance and quality checklist

This document describes whole-gate validation. Sampled current evidence is in ROADMAP.md and ANDROID_QA.md; a partial emulator pass does not check off a whole release gate. Both Android and iOS are release targets.

## Adaptive planning and guided onramp

- [ ] Current Goal/Board/Calendar detail links resolve one canonical goal without duplicates.
- [ ] Guided Plans create an atomic root with undated, editable steps; an interrupted write leaves no partial plan.
- [ ] Replan never moves fixed/past/active-Focus blocks, changes are previewed, and Undo rejects stale checkpoints.
- [ ] Daily schedule visualizations distinguish summed reservations and actual occupied time when blocks overlap.
- [ ] Device timezone and locale changes preserve stored UTC instants and civil planning keys.
- [ ] Board filters and weekly budget actions behave reliably with empty and populated data.

## Domain and persistence

- [ ] No cycles, duplicate IDs or orphan child references.
- [ ] Accurate Day/Week/Month/Quarter/Year/Decade/Life boundaries.
- [ ] Correct leap-year, week-start, time-zone and DST handling.
- [ ] Save/edit/delete operations remain atomic.
- [ ] Data survives force stop, device reboot and app updates.
- [ ] Backup restores all implemented snapshot fields and relationships. Attachments/preferences are not currently implemented backup fields.

## UX and accessibility

- [ ] Primary flows work on a midrange Android phone.
- [ ] Screen reader labels and logical focus order verified.
- [ ] Controls usable with larger text sizes.
- [ ] All drag features have an accessible alternate action.
- [ ] Light/dark contrast and reduced-motion behavior verified.
- [ ] RTL and LTR layouts checked without changing time semantics.

## Mobile platform integration

- [ ] Notifications work under denied permission and battery restrictions.
- [ ] Widgets refresh correctly across restarts and time-zone changes.
- [ ] Android back handling and keyboard resizing tested.
- [ ] iOS regression pass once Apple tooling is available.

## Release gate

- [ ] Locked clean install and compatibility check.
- [ ] Static typecheck, automated domain tests and launch smoke test.
- [ ] No secrets or private user data in repository.
- [ ] Signed build and documented versioning.
- [ ] Known limitations explicitly recorded.

# Acceptance and quality checklist

This document describes expected validation. It does not claim these tests already pass.

## Domain and persistence

- [ ] No cycles, duplicate IDs or orphan child references.
- [ ] Accurate Day/Week/Month/Quarter/Year/Decade/Life boundaries.
- [ ] Correct leap-year, week-start, time-zone and DST handling.
- [ ] Save/edit/delete operations remain atomic.
- [ ] Data survives force stop, device reboot and app updates.
- [ ] Backup restores notes, attachments, schedule and preferences.

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

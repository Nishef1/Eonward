# Decision log

Record significant decisions and reversals here. A future change should cite its reason and implications.

| Date | Decision | Reason | Status |
| --- | --- | --- | --- |
| 2026-10-14 | Android-first, iOS-compatible architecture | Deliver and verify the mobile experience before desktop | Accepted |
| 2026-10-14 | React Native + Expo SDK 57 + strict TypeScript | Shared mobile stack and well-supported tooling | Accepted, verify on device |
| 2026-10-14 | Local-first; no signup or cloud backend initially | Single-user offline core is the current priority | Accepted |
| 2026-10-14 | Independent UI and domain rules | Avoid carrying over weaknesses or licensing obligations from other products | Accepted |
| 2026-10-14 | Include only minimum starter dependencies | Lower upgrade cost and avoid speculative package adoption | Accepted |
| 2026-10-14 | Public-safe docs under `docs/`; no root README | Keep repository home intentionally minimal | Accepted |
| 2026-10-14 | SQLite with migrations when persistence begins | Durable local storage and controlled schema changes | Planned implementation |
| 2026-10-14 | Dedicated desktop build | Reassess after reliable Android/iOS product | Deferred |

| 2026-10-14 | Direct Expo SQLite v1 rather than introducing an ORM on day one | Small initial CRUD surface; migration and parameterized queries are straightforward | Implemented in source; unverified on device |
| 2026-10-14 | First slice: one horizon placement per goal, optional parent link | Deliver end-to-end behavior before multi-placement and advanced relationships | Temporary, revisit in M2 |

| 2026-10-14 | Pin React DOM 19.2.3 and Worklets 0.10.1 | npm ci exposed mismatched transitively selected peers; pin to Expo SDK 57 verified versions | Accepted, locked |

| 2026-10-14 | Editable parent relationship with guarded SQLite transaction | Prevent self-reference and descendant-parent loops while moving goals | Implemented, runtime verification pending |
| 2026-10-14 | Simple period picker before heavyweight calendar dependency | Small code footprint for seven horizons, day-specific exact date input | Implemented, further UX validation pending |
| 2026-10-14 | Keep Android controls at least 48dp and simplify first-run Horizons | Improve legibility, safe-area clarity and discoverability | Implemented in source, pending device review |

| 2026-10-14 | Build multi-horizon overview using existing SQLite and React Native | No extra dependency or duplicated goal data | Committed, Android QA pending |
| 2026-10-14 | Hard cap of 20 unique core automated tests | Prevent redundant and stale AI-generated regression suites | CI gate added |

## Open decisions

- Calendar rendering package vs dedicated implementation: verify on device.
- Rich-text editor selection: test RTL, selection, keyboard, large documents.
- Widget package vs Kotlin/Swift integration: verify power management and refresh reliability.
- Export format, encryption choice and attachment packaging.
- Precise package identifier and app-store naming before external release.

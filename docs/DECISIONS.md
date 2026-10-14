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

| 2026-10-14 | Goal Path displays saved parent relationships and moved goals open at destination | Avoid disconnect between daily actions and long-term goals and misleading empty lists | Implemented in source; Android QA pending |
| 2026-10-14 | Prioritize reversible delete and basic ordering before drag animations | Correctness and data safety before visual complexity | Planned |

| 2026-10-14 | SQLite v2 additive migration with archived timestamp and sort rank | Keep v1 goals intact and support safe, offline lifecycle/order | Implemented in source; Android migration QA pending |
| 2026-10-14 | Archive active subtrees and restore only the same archive group | Preserve hierarchical context without resurrecting previously archived items | Implemented in source, SQL sanity checked |
| 2026-10-14 | Reorder with Move Up/Down before drag gestures | Accessible, deterministic and no new dependency | Implemented in source, Android UX QA pending |

| 2026-10-14 | Use a sticky Save footer and safe-area-aware modals | Existing form action clipped against Android system navigation area | Implemented in source, emulator verification pending |
| 2026-10-14 | Reduce empty-state and multi-horizon duplicate CTAs | Improve action clarity and preserve vertical screen space | Implemented in source |
| 2026-10-14 | Separate Archive from primary Focus/Perspective modes | Archive is a utility destination, not a planning mode | Implemented in source; user experience review pending |

| 2026-10-14 | Build a real Boards workspace before calendar/time blocking | First major missing personal workflow; many-to-many referencing existing goals without duplication | Committed to source; Android QA outstanding |
| 2026-10-14 | Additive SQLite schema v3 | Board deletion should never destroy underlying goal records or require new backend services | Committed; upgrade verification pending |
| 2026-10-14 | Remove automatic goal-title keyboard focus | Form appeared partially scrolled in emulator screenshot; preserve top-of-form context first | Committed; screenshot recheck pending |

| 2026-10-14 | Separate scheduled time blocks from Horizon placement in SQLite v4 | A life/year goal can reserve hours today without moving or duplicating its goal | Implemented in source, Android QA pending |
| 2026-10-14 | Support flexible blocks and fixed-limit timeboxes with a shared goal ID | Distinct user workflows; calendar scheduling must work across Horizons and Boards | Implemented in source, not an enforced timer |
| 2026-10-14 | Store scheduled instants in UTC; render local time and reject spring-forward gaps | Avoid ambiguous naive stored clock text and preserve events across device timezone changes | Initial support; fall-back disambiguation future work |
| 2026-10-14 | Allow overlapping planned blocks with split lanes, no heavyweight calendar library | Keep visual behavior correct for simple conflicts without overengineering | Initial timeline implemented |

## Open decisions

- Calendar rendering package vs dedicated implementation: verify on device.
- Rich-text editor selection: test RTL, selection, keyboard, large documents.
- Widget package vs Kotlin/Swift integration: verify power management and refresh reliability.
- Export format, encryption choice and attachment packaging.
- Precise package identifier and app-store naming before external release.

# Design system direction

Status: **Early foundation**. Visual tokens in source are provisional, not a finalized design specification.

## Principles

- Quiet, focused, premium rather than ornamental.
- Present the current action clearly; long-term context is one gesture away.
- One primary action per screen and consistent navigation gestures.
- Mobile-native layouts, not a shrunken desktop board.
- Accessible alternatives for drag-and-drop and long press.
- Avoid copying proprietary artwork, icons, text, or exact visual compositions.

## Foundation tokens (provisional)

| Token | Light | Dark |
| --- | --- | --- |
| Surface | `#F7F6F2` | `#151A19` |
| Elevated | `#FFFFFF` | `#222A28` |
| Primary text | `#202927` | `#F0F3F0` |
| Secondary text | `#66736E` | `#A8B7AF` |
| Accent | `#587A6D` | `#92B2A3` |
| Divider | `#E6EAE4` | `#36413B` |

Tokens must be reviewed with contrast tests before being used as semantic states.

## Layout and typography

- Use an 8-point spacing rhythm, allowing 4-point increments when warranted.
- Respect device safe areas, dynamic font scaling and keyboard insets.
- Minimum touch targets: approximately 48 dp on Android, 44 pt on iOS.
- Use platform text rendering initially; decide custom font only after licensing and RTL testing.
- Support both LTR and RTL without reversing the direction of time or altering data meaning.

## Motion

- Feedback should be immediate and consistent.
- Motion should explain state change (reordering, expansion, view transition), never distract.
- Prefer subtle 150–250 ms transitions for ordinary controls; tune by device.
- Honor reduced-motion accessibility settings.
- Keep scrolling and dragging responsive during large lists.

## Screen-state inventory

Each feature design must specify: loading/initializing, empty, ready, editing, success feedback, error, offline behavior (where relevant), destructive confirmation and large text.

## M1 deliverables

- Navigation map and screen hierarchy.
- Light/dark examples for Horizons, item details, board and calendar.
- Component catalog: cards, typography, input, dialogs, filters, banners.
- Gesture matrix with accessible fallbacks and Android back behavior.
- Real-device screenshots and an interaction review checklist.

## Android UI review — 2026-10-14

- Reduced the vertical distance between brand and headline to restore visual rhythm on short screens.
- Removed redundant top-right date chip, avoiding collision with developer/emulator overlays and keeping the status area calm.
- Primary horizon chips and period navigation controls use at least 48dp hit areas.
- Progress track hides when a horizon has no goals, to avoid showing a misleading empty progress bar.
- A single visible New goal action is retained in Focus; the duplicate first-use button was removed after the screenshot exposed clipping.
- Goal editing has a structured hierarchy: title, horizon, period, parent, notes and primary save action.
- Child goals are navigable instead of only being completion toggles; completion has its own touch target.
- These changes are source-level work until re-captured and checked on the Android emulator.

## Perspective overview — code pass 2026-10-14

- Focus and Perspective are mutually exclusive views inside Horizons.
- Perspective stacks seven period cards with counts, two recent goal previews, and direct Add/Focus actions.
- Uses existing goal identities and local database; no proprietary UI assets or new libraries.
- Requires emulator review for scaling, contrast, keyboard and touch feedback.

## Archive and ordering UI — v2

The Focus goal card has an Android-safe organization action sheet (Move Up, Move Down, Archive, Cancel) rather than permanent buttons crowding a narrow screen. Goal Details uses Archive instead of destructive Delete. Archive now has a distinct utility shortcut next to the two primary Focus/Perspective modes, with contextual Restore actions. Android emulator QA still required before calling spacing, labels and modal behavior polished.

## Screenshot review — safe areas and action hierarchy

- The existing empty-state CTA fell behind the fixed bottom bar on a Pixel-like emulator. Keep only the persistent New goal button in Focus, with brief instructional copy in the empty state.
- Move Create/Edit Goal's Save control out of the scrolling form and into a bottom SafeAreaView footer. The form remains scrollable above the action when the keyboard appears.
- React Native modals require separate system-bar attention; use translucency flags and modal-local SafeAreaProvider/SafeAreaView. Do not claim keyboard success until checked on a device.
- Perspective has per-horizon Add goal actions; a global sticky New goal bar there is redundant and costs vertical screen space.
- Archive is secondary to Focus/Perspective; style its shortcut accordingly rather than treating three destinations as equal primary navigation.
- No UI dependency added. Screenshots of empty states cannot verify persistence, submit actions or migration.

## Boards workspace (source pass)

- Dedicated Board route linked from Horizons header; this is a substantive second workspace, not another Horizons tab.
- Board cards show goal counts and progress; board details preserve source-goal identity.
- Board creation, edit and selection use the same surface/typography/radius tokens; no new UI component package.
- Device review must verify short-screen keyboard safe area, modal dismissal, long board names and linked-goal navigation.

## Timebox and Daily Timeline — 2026-10-14

- Calendar has a readable day-switcher, compact plan summary and explicit Plan time primary action.
- Each block is positioned by local start/end hour and uses its actual duration for height; simultaneous blocks share space.
- Fixed-limit Timebox uses a restrained warm accent distinct from flexible Time Block, with optional goal outcome visible in larger blocks.
- Agenda provides a compact alternative to the vertically long 24h timeline and deep-links into original goals.
- Saved future schedule hints appear on Horizons/Boards cards without introducing extra goal copies.
- Device QA needed for small widths, overlapping blocks, keyboard, long titles, daylight-saving days and focus-return freshness.

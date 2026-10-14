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
| Surface | \`#F7F6F2\` | \`#151A19\` |
| Elevated | \`#FFFFFF\` | \`#222A28\` |
| Primary text | \`#202927\` | \`#F0F3F0\` |
| Secondary text | \`#66736E\` | \`#A8B7AF\` |
| Accent | \`#587A6D\` | \`#92B2A3\` |
| Divider | \`#E6EAE4\` | \`#36413B\` |

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

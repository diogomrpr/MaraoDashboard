# Development workflow

# UI/UX requirements — Home Assistant Dashboard

## Information hierarchy

- Show critical home status before secondary information.
- Prioritize security, alarms, climate, lighting and unavailable devices.
- Group controls by user task or room.
- Avoid duplicating the same entity in multiple sections.
- Keep frequently used actions visible without excessive scrolling.
- Hide diagnostic and administrative information from the main dashboard.

## Interaction

- Common actions should require no more than one or two interactions.
- Every interaction must provide immediate visual feedback.
- Clearly distinguish active, inactive, loading, disabled and unavailable states.
- Destructive actions must require confirmation.
- Do not use hover-only interactions because the dashboard is touch-first.
- Controls must have comfortable touch areas and sufficient spacing.

## Tests

- During normal implementation, run only the smallest focused check that covers the changed code or card.
- Do not run the full test suite after each change. Run it only when the user asks, during final stabilization, or immediately before publishing.
- Before any push, tag, GitHub release, or HACS release, run `npm run verify:publish`. Do not publish unless it passes.
- Treat `npm run test:ha:e2e` as a release check against the configured disposable local Home Assistant instance. Never point it at a live Home Assistant instance.
- GitHub Tests, hassfest, and HACS validation must also pass for the published commit.

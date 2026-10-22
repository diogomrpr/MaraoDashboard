# Design

## Decisions
Remove the fill node, its CSS variable and progress writes from MaraoSlideToOpen. Keep the contrasting theme track and 54px circular thumb, reduce label weight to the theme's secondary text weight and fade the label with progress. Preserve the 48px minimum and current horizontal wrapped-label layout.

Enable hit testing across the thumb, with the icon transparent to pointer targeting. Use the rendered thumb's complete bounding rectangle for pointer/touch start validation, replacing the fixed left-strip test. This follows larger track heights and layout changes while maintaining the full touch area. Keep event ownership on the track, defer capture until horizontal intent, and preserve travel/completion/cancellation and service guards.

## Compatibility and verification
All existing access descriptors, labels, options and target entities retain their meaning. No persisted writes or version migration. The specific risk is unintentionally allowing a risky action from the track or breaking cancellation after widening the handle target. Existing focused pointer/touch tests and native-opener routing assertions cover edge starts, track rejection, vertical intent, partial/outside/cancelled gestures, disabled targets, haptics and single dispatch with safe fake services. Install compatible frontend assets on disposable 192.168.0.28 once after the final edit. Physical-phone inspection remains with the user; no broad integration campaign is requested.

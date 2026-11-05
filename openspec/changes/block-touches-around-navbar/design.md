# Design

Render a non-focusable, aria-hidden fixed transparent element below the navbar
in stacking order. Its height shares the existing 60px navbar height and
host-aware bottom gap, and spans the viewport width without changing page flow.
Enable pointer hit testing and disable native touch gestures on that element.
Hide it in bounded previews; existing empty/hidden host rules remove it together
with navigation. Popups retain their higher stacking order.

Treat a barrier tap as outside the overflow controls so it closes an open menu.
Existing page clearance still makes the final card reachable above navigation.

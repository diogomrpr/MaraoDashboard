---
title: Floor Plan
layout: page
parent: Cards
---

# Floor Plan

Add **Floor Plan** through Home Assistant’s **Edit dashboard → Add card** and upload a PNG/JPEG room image. Use
**Add light** beside the preview, then tap the image. Choose the light, name and
icon in the settings modal and select **Create**. Tap an existing light square to
open its settings, or drag it to move it. **Update** accepts settings; **Cancel**
keeps the previous settings. The **Lights** selector reaches overlapping squares.
These editing gestures never switch a light.

For a strip, select its light, choose **Draw strip**, tap successive points along
its path and choose **Finish**. **Undo point** removes the latest tracing point;
**Cancel trace** restores the prior path. Drag a point to move it; tap a point to
show **Remove point** beside the preview. A completed path needs two distinct
points. Set thickness from 1 to 32 pixels in the light's settings modal. Removing
the path retains its light button. Visual editing has no coordinate fields;
precise light and strip-point coordinates remain available in the native YAML editor.

Buttons toggle their bound lights and show authoritative on/off state. Strips
follow reported brightness and supported color, with a theme fallback. Missing,
unknown, unavailable and disconnected targets are neutral and disabled. The
**Lights** action opens the same ordered controls in a sheet when markers are
close together. The image and strip paths do not dispatch actions.

Use a full-width native section for an ordinary card. For **Full page**, choose
a native Panel view containing the floor-plan card. The complete image stays in
proportion above the navbar. Home Assistant owns the view layout; keep other
visible cards on another view.
Images with different proportions from the screen leave unused space.

Image uploads are stored in Home Assistant immediately. **Update/Create** changes
the local draft; the dashboard changes only after **Save**. Cancelling or discarding
restores the prior arrangement/reference. Replacing an image retains coordinates
and bindings for adjustment. Copying/deleting cards never deletes HA image files.
Exports contain references, not image bytes; moving to another HA instance also
requires the referenced images. HA's normal image-serving access rules apply.

The native card uses `type: custom:marao-floorplan-card` and
`template: md_floor_plan_card` with `variables.image_id`, an
optional boolean `full_page` and an ordered `lights` list. Each light has a unique
local `id`, `entity_id` in the light domain, percentage `x`/`y`, optional `name` and
`icon`, and optional `strip: {width, points: [{x,y}, ...]}`. Unknown fields and
explicit empty light lists are preserved. No source-format migration is needed;
older packages need the matching pre-feature source when rolling back.

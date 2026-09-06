# Test gallery coverage

The disposable card-test dashboard is the visual contract for Marao. It keeps
one safe fake entity for every project-owned card and exercises the meaningful
behavior variants below.

| Card or component | Behaviors covered |
| --- | --- |
| Header, title, weather, glance, base | Primary, secondary, multi-entity, loading/unknown presentation |
| Light | State colors, brightness slider, tap control, no-slider presentation |
| Cover and access | Position slider, open/closed state, lock popup, slide-to-open, direct open-only action |
| Climate | Heat, cool, heat/cool, auto, dry, fan-only, off; single-mode tap; multi-mode popup; setpoint stepper; current temperature |
| Fan | Percentage slider and plain toggle behavior |
| Camera | Live feed and Frigate/test events popup |
| Media / Apple TV | Player summary, two-column app shortcuts, icon-only remote controls, haptics |
| Sensor and battery | Measurement, unit, battery thresholds, unknown/unavailable states |
| Switch and graph | Toggle, graph line/fill, related toggle, native history |
| Timeline | State transition history and empty/loading/error states |
| Scene and number | Scene actions and shared numeric up/down control |
| Wallbox current | Large current value, up/down control, three shortcuts, no-shortcut variant |
| Vacuum | Docked, cleaning, paused, returning, and error states |
| Dishwasher | Progress, remaining time, program, salt, rinse-aid, and operation states |
| Washing machine | Running and idle states |
| Navigation, room, and popup cards | Page navigation, room controls, centered popovers, internal scrolling, close/focus behavior |
| Energy period cards | Month/day value cards, graph popovers, previous-period navigation |

The fixture is intentionally safe: every action targets a template, input,
or fake entity in the disposable Home Assistant instance. The gallery navbar
links the generated Security, Energy, Wallbox, Rooms, and Media pages, while
the card-test view contains direct shortcuts to the pages that do not fit in
the five-entry mobile navbar.

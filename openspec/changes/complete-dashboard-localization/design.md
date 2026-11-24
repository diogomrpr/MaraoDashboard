# Localization review

The audit started at Marao Dashboard v0.37.4, commit `2ad4fcf2`. It compared the English and Portuguese runtime keys and placeholders, checked the 39 catalog card definitions and their editor metadata, and traced rendered text through the shared and specialized card owners.

| Surface | Review |
| --- | --- |
| Base, Title, Header, Glance, Switch, Light, Fan, Cover, Number, Room, Navigation, Battery and Sensor | Shared action, state, reading, accessible label and formatting paths |
| Access, Access Close, Access Hold, Access Slide, Security and Alarm Controls | Shared gesture text, action labels, guard feedback and entity state |
| Climate, Dishwasher, Washing Machine, Vacuum and Wallbox Current | Measurements, mode and control labels, appliance state and feedback |
| Media, Media App, Plex, Scene and Scene Collection | Playback actions, media errors and read-only provider titles |
| Camera, Camera Events, Weather, People and Floor Plan | Conditions, event filters, timestamps, availability and accessibility |
| Graph, Toggle Graph, Timeline, Energy, Entity Group, Navbar and Schedules | History, totals, date and number display, summary labels and schedule weekdays |

Use the existing runtime and feature dictionaries and the shared locale resolver. Preserve Home Assistant's explicit numeric formatting preferences and region tags. Catalog names and editor options are translated at their existing presentation boundary. Generator defaults follow its existing language input. Stored user labels and provider-supplied display text remain editable in their original form. The package has no saved-format change or migration.

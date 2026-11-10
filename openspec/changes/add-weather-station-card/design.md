# Design

`MaraoCards.js` maps only the configured sensor IDs to live Home Assistant states and passes the optional `show_wind_angle` setting to the shared weather renderer. `MaraoWeather.js` renders the station variant and derives the rain scene from the precipitation reading. The direction reading always drives the compass rotation; only the textual compass point and degrees depend on `show_wind_angle`.

The new setting defaults to visible to preserve the station design already reviewed. The native card catalog exposes the boolean toggle, and the station entity map remains optional. Unknown and unavailable rain readings retain the neutral scene.

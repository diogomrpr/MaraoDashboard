---
title: Native dashboard editing
layout: page
parent: Usage
nav_order: 4
---

# Standalone native authoring retired

Marao now supports one authoring workflow: its visual/JSON builder and generator.
Use [the dashboard builder](index.md) to edit and generate Marao dashboards.

The Community starter, Marao entries in Home Assistant's card picker, standalone
configuration forms, `custom:marao-native-*` wrappers and the `native/card` and
`native/starter` WebSocket commands have been removed. Existing standalone
dashboards remain saved and independently owned, but removed card types no
longer render. There is no automatic conversion or compatibility renderer.

Setup, generation and history restoration continue to protect independent
dashboard registrations and stored configuration. Historical storage-backed
generator conversion and recovery remain supported. Home Assistant's camera
player and cards embedded through Marao's builder remain available.

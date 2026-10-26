---
title: Installation
layout: page
nav_order: 1
---

# Installation

**v0.22.0 is a breaking change:** Marao now installs as a HACS **Dashboard**,
without a Marao Python integration. Existing users must follow the
[manual migration guide](native-migration.md), keeping the same repository and
dashboard address. Do not update the old Integration entry in place.

For a new installation on stable Home Assistant **2026.10.0 or newer**:

1. [Download through HACS](downloads.md) using category **Dashboard**.
2. Register the module resource once and refresh Home Assistant.
3. [Create a native dashboard and configure Marao](configuration.md).

The Visual/JSON builder saves the complete source in native HA dashboard storage.
Native configuration APIs make it readable to authenticated users, including when
the dashboard/editor is hidden or restricted. Keep credentials out of dashboard
source and retain a private backup before importing or replacing configuration.

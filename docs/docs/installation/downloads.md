---
title: Download with HACS
layout: page
parent: Installation
nav_order: 1.2
---

# Download with HACS

Marao Dashboard is a custom HACS **Integration** repository. HACS installs the
integration under `custom_components/marao_dashboard`. When its config entry is
loaded, Home Assistant serves Marao's dashboard runtime, editor, and
camera-events card directly from `/marao_dashboard_static` through its frontend
and static APIs.

## Before you start

- Install and configure [HACS](https://www.hacs.xyz/docs/use/).
- Create a Home Assistant backup.
- Make sure you can restart Home Assistant and edit `configuration.yaml` if a
  manual recovery is needed.

## Add the custom repository

1. Open HACS.
2. Select the three-dot menu, then **Custom repositories**.
3. Enter `https://github.com/diogomrpr/MaraoDashboard`.
4. Select **Integration** as the category and add the repository.
5. Search for **Marao Dashboard**, open it, and select **Download**.
6. Restart Home Assistant after the download finishes.

HACS installs the integration here:

```text
custom_components/
└── marao_dashboard/
```

After the integration is added, Marao copies its generated-dashboard YAML and
theme assets into these locations:

```text
www/community/MaraoDashboard/
└── dashboard/
    └── MaraoDashboard/
        ├── views/
        └── main.yaml

themes/
└── MaraoDashboard/
    └── marao-dashboard.yaml
```

Unrelated HACS card bundles remain under their own directories and are not
modified by Marao.

Do not add a Marao JavaScript resource manually. The integration registers its
own modules with Home Assistant when it loads.

Continue with the [configuration guide]({{ '/docs/installation/configuration.html' | relative_url }}).

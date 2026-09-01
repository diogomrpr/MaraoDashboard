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
- Install the [seven dashboard dependencies]({{ '/docs/installation/dependencies.html' | relative_url }}).
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

After the integration is added, Marao copies only its generated-dashboard YAML
template library and theme YAML into these locations:

```text
www/community/MaraoDashboard/
└── dashboard/
    └── MaraoDashboard/
        ├── templates/
        ├── views/
        └── main.yaml

themes/
└── MaraoDashboard/
    └── marao-dashboard.yaml
```

Third-party card bundles do not belong in this directory. Their HACS downloads
remain under their own `www/community/<repository>` directories.

Do not add a Marao JavaScript resource manually. The integration registers its
own modules with Home Assistant when it loads.

Continue with the [configuration guide]({{ '/docs/installation/configuration.html' | relative_url }}).

---
title: Develop Marao
description: Work on the native frontend, documentation and safe examples.
---

Marao is a frontend-only Home Assistant dashboard package. Its runtime uses vanilla JavaScript custom elements and Shadow DOM. Home Assistant owns native dashboard storage and editing; Marao owns its cards, configuration forms, shared controls, popups, navigation and appearance.

Start with the repository's [AGENTS.md](https://github.com/diogomrpr/MaraoDashboard/blob/main/AGENTS.md) and [OpenSpec index](https://github.com/diogomrpr/MaraoDashboard/blob/main/openspec/README.md). They define current scope, compatibility and verification requirements. Historical specifications and test reports are records, not evidence that a new change passes.

- [Architecture](./architecture/) connects source, native configuration and the installed graph.
- [Local development](./local-development/) covers setup and the disposable instance.
- [Contributing](./contributing/) follows a change from acceptance cases to handoff.
- [Testing](./testing/) selects proportionate verification.
- [Documentation and examples](./documentation/) keeps this site aligned with the product.
- [Packaging](./packaging/) covers the release graph and publication boundaries.

Use the existing shared implementation rather than fixing a reusable control in one card. Keep public configuration, editor fields, validation, runtime, translations and examples aligned.

---
title: Architecture
description: Understand the native card, dashboard and package boundaries.
---

Home Assistant loads a stable frontend entry. That entry reads the installed release manifest and loads a content-identified graph of Marao modules and assets. Cards receive normal configuration and HA state; shared composition builds their owned controls and automatic details.

## Source ownership

| Location | Responsibility |
| --- | --- |
| `custom_components/marao_dashboard/frontend/` | Editable runtime and generated frontend bundles |
| `frontend_src/` | Native card editors, shared composition/validation, conversion and build scripts |
| `dist/` | Complete flat generated HACS download |
| `tests/` | Automated checks |
| `ha-test/` | Disposable preparation and safe fixtures |
| `docs/src/` and `docs/examples/` | Site content, components and fictional examples |
| `openspec/` | Capability contracts, context and planned changes |

The retained Python integration/generator tree supports legacy compatibility and rollback reference. It is not installed by the Dashboard package. Test devices, preview fixtures and documentation dependencies stay outside the shipped graph.

## Native configuration

The card catalog supplies supported families and fields. Native configuration uses public `custom:marao-*` types. Shared validation and composition preserve stable source keys and supported compatibility aliases. The visual editor emits a complete configuration while patching only changed fields, preserving unknown options, explicit emptiness and native layout/visibility.

Home Assistant owns views, card positions, sizes, visibility and Save/Cancel. Optional root `marao` settings enable the shared navbar and scoped shell. Automatic details belong to a live card occurrence; `popup_view` links to an HA-owned Sections view.

Old strategies stay read-only until explicit conversion. Complete source and recovery provenance are retained, then ordinary native configuration becomes authoritative. It is never regenerated over later native edits.

## State and actions

Frequent `hass` updates change affected presentation without replacing focused inputs or active gesture targets. Device state remains authoritative. Shared dispatch checks availability, capabilities and connection state, acknowledges interaction and reports failures. Each element owns cleanup for listeners, timers, requests and subscriptions.

The public playground uses these same cards with a fictional HA boundary. Its isolated services, metadata and assets do not become dependencies of the installed product.

External agents can use [installed-version metadata and a local read-only planner](../agent-editing/) to prepare coherent edits through ha-mcp. Authoring assets are discovered from the release manifest and remain outside normal dashboard startup.

## Embedded popup ownership

`MaraoPopupContent.js` validates additive `popup_content` version 1: `mode` is `custom` or `automatic`, `layout` is a native Sections object with explicit `sections`, and optional `template` records origin only. Unknown fields are preserved. Optional `presentation` carries sheet icon/height settings. Native descriptors, composition and ordinary conversion retain this configuration; absence takes the released path. Invalid or newer data fails visibly without falling back to a legacy action.

`popup-content.js` clones built-in seeds and supported existing sources. `popup-content-editor.js` owns only local template/child drafts and emits the complete parent configuration through native `config-changed`. It never saves a dashboard or creates a source view. Nested HA picker/editor events are isolated; asynchronous results and acceptance are checked against the parent draft. Visual editing uses registered HA elements, with YAML fallback.

Custom mode uses an occurrence-specific sheet route and a read-only in-memory Sections facade in `MaraoPopupView.js`. Its synthetic view is never persisted or navigated to. Embedded collection actions resolve their containing occurrence/section; legacy managed reconciliation excludes active embedded owners. Automatic mode retains the custom snapshot and resumes the existing source chain. Existing saved views, transactions and immutable historical inputs remain unchanged.

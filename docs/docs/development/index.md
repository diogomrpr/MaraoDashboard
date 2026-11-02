# Marao development

Marao is a frontend-only HACS Dashboard package. Home Assistant owns ordinary dashboard storage and editing; Marao supplies native card editors, browser-native custom elements, shared controls, navigation, popups and theme assets. The retained Python tree supports historical conversion/rollback checks, not the current installed product.

Start with the [repository contract](../../../AGENTS.md), [OpenSpec index](../../../openspec/README.md) and affected capability. Small documented-behavior repairs use a short inspect/implement/verify path. New behavior, public contracts and substantial cross-layer work use an applicable OpenSpec change.

## Current source flow

1. Home Assistant loads the stable `MaraoFrontend.js` entry and installed manifest.
2. The content-identified graph registers Marao runtime cards and native configuration forms.
3. Public native card configuration is validated and composed through shared frontend models. Cards render authoritative HA state and dispatch services through shared controls.
4. Home Assistant saves cards, views, sizing and visibility. Optional root `marao` settings attach shared navigation and scoped dashboard appearance.
5. Old source strategies remain read-only until explicit staged conversion. Recovery retains exact input and provenance; ordinary native edits are never regenerated over.

| Location | Responsibility |
| --- | --- |
| `custom_components/marao_dashboard/frontend/` | Editable runtime and generated frontend bundles |
| `frontend_src/` | Native editor, composition, conversion and build source |
| `dist/` | Complete generated flat HACS frontend graph |
| `tests/` | Scoped unit, preservation and optional browser checks |
| `ha-test/` | Disposable preparation and safe fixtures; never shipped |
| `docs/src/`, `docs/examples/` | Published Starlight guides and fictional live examples |
| `docs/docs/development/` | Canonical repository guidance linked by rules and skills |
| `openspec/` | Baseline contracts, context and change plans |

Edit generated editor behavior in `frontend_src`, then use `npm run build:editor`; do not patch output bundles by hand. `npm run build:hacs` builds the complete flat frontend graph. Third-party Lovelace cards are not runtime dependencies. Site tooling and demonstration fixtures stay outside the shipped graph.

## Focused references

- [Native frontend boundaries](native-frontend.md)
- [Local development and installation](local-development.md)
- [Scoped verification](focused-testing.md)
- [Dashboard quality contract](dashboard-quality.md)
- [Adding or changing a card](template.md)
- [Source compatibility](source-migrations.md)
- [Safe gallery](test-gallery.md)
- [Theme](theme.md) and [brand assets](brand-assets.md)

Follow the root contract's minimal verification and installation policy. Preserve unrelated dirty work, inspect shared consumers, and compare each requested behavior with the implementation and evidence before completion.
